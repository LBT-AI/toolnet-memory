import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';

type SetupSection = 'all' | 'storage' | 'integrations' | 'health';
type StorageProvider = 'local' | 'r2' | 's3' | 'huggingface';

interface SetupOptions {
  section: SetupSection;
  provider?: StorageProvider;
  localRoot?: string;
  nonInteractive: boolean;
}

const CONFIG_DIR = path.join(os.homedir(), '.config', 'toolnet-memory');
const ENV_FILE = path.join(CONFIG_DIR, '.env');
const STORAGE_PROVIDERS = new Set<StorageProvider>(['local', 'r2', 's3', 'huggingface']);

function ensureConfig(): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  if (!fs.existsSync(ENV_FILE)) fs.writeFileSync(ENV_FILE, '', { encoding: 'utf8', mode: 0o600 });
  fs.chmodSync(CONFIG_DIR, 0o700);
  fs.chmodSync(ENV_FILE, 0o600);
}

function readConfig(): Map<string, string> {
  ensureConfig();
  const values = new Map<string, string>();
  for (const raw of fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/u)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index > 0) values.set(line.slice(0, index).trim(), line.slice(index + 1).trim());
  }
  return values;
}

function writeConfigValue(key: string, value: string): void {
  ensureConfig();
  const lines = fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/u);
  let replaced = false;
  const next = lines.map((line) => {
    if (!line.trim().startsWith(`${key}=`)) return line;
    replaced = true;
    return `${key}=${value}`;
  });
  if (!replaced) {
    if (next.length > 0 && next.at(-1) !== '') next.push('');
    next.push(`${key}=${value}`);
  }
  fs.writeFileSync(ENV_FILE, `${next.join('\n').replace(/\n+$/u, '')}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });
  fs.chmodSync(ENV_FILE, 0o600);
}

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  return value && !value.startsWith('--') ? value : undefined;
}

function setupSection(): SetupSection {
  const value = argument('--section') ?? 'all';
  if (value === 'all' || value === 'storage' || value === 'integrations' || value === 'health') {
    return value;
  }
  throw new Error(`SETUP_SECTION_INVALID value=${value}`);
}

function providerArgument(): StorageProvider | undefined {
  const value = argument('--provider');
  if (!value) return undefined;
  if (STORAGE_PROVIDERS.has(value as StorageProvider)) return value as StorageProvider;
  throw new Error(`SETUP_STORAGE_PROVIDER_INVALID value=${value}`);
}

function options(): SetupOptions {
  const provider = providerArgument();
  const localRoot = argument('--local-root');
  return {
    section: setupSection(),
    ...(provider ? { provider } : {}),
    ...(localRoot ? { localRoot } : {}),
    nonInteractive: process.argv.includes('--non-interactive') || !process.stdin.isTTY,
  };
}

function packageRoot(): string | undefined {
  const here = path.dirname(fileURLToPath(import.meta.url));
  for (const candidate of [process.cwd(), path.resolve(here, '..'), path.resolve(here, '../..')]) {
    const packageFile = path.join(candidate, 'package.json');
    if (!fs.existsSync(packageFile)) continue;
    try {
      const parsed = JSON.parse(fs.readFileSync(packageFile, 'utf8')) as { name?: string };
      if (parsed.name === 'toolnet-memory') return candidate;
    } catch {
      // Continue searching other candidate roots.
    }
  }
  return undefined;
}

function runToolNet(command: string, args: string[] = []): number {
  if (process.env.TOOLNET_STANDALONE === '1') {
    const result = spawnSync(process.execPath, [command, ...args], {
      stdio: 'inherit',
      env: process.env,
    });
    return result.status ?? 1;
  }
  const root = packageRoot();
  if (!root) throw new Error('SETUP_PACKAGE_ROOT_NOT_FOUND');
  const cli = path.join(root, 'bin', 'toolnet-memory');
  if (!fs.existsSync(cli)) throw new Error('SETUP_CLI_NOT_FOUND');
  const result = spawnSync(cli, [command, ...args], { stdio: 'inherit', env: process.env });
  return result.status ?? 1;
}

async function chooseProvider(setup: SetupOptions): Promise<StorageProvider> {
  if (setup.provider) return setup.provider;
  const existing = readConfig().get('MEMORY_STORAGE_PROVIDER');
  if (existing && STORAGE_PROVIDERS.has(existing as StorageProvider))
    return existing as StorageProvider;
  if (setup.nonInteractive) return 'local';

  const input = createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log('\nStorage provider\n  1. local\n  2. r2\n  3. s3\n  4. huggingface\n');
    const answer = (await input.question('Choose [1]: ')).trim().toLowerCase();
    if (!answer || answer === '1' || answer === 'local') return 'local';
    if (answer === '2' || answer === 'r2') return 'r2';
    if (answer === '3' || answer === 's3') return 's3';
    if (answer === '4' || answer === 'huggingface') return 'huggingface';
    throw new Error(`SETUP_STORAGE_PROVIDER_INVALID value=${answer}`);
  } finally {
    input.close();
  }
}

async function storageSetup(setup: SetupOptions): Promise<void> {
  const provider = await chooseProvider(setup);
  writeConfigValue('MEMORY_STORAGE_PROVIDER', provider);
  if (provider === 'local' && setup.localRoot)
    writeConfigValue('MEMORY_LOCAL_ROOT', setup.localRoot);
  console.log(`\n✓ Storage: ${provider}`);
  if (provider === 'local') {
    console.log('  Local-first storage requires no cloud credentials.');
  } else {
    console.log('  Provider selected. Add credentials with `toolnet-memory config set KEY VALUE`.');
  }
}

function integrationsSetup(): void {
  console.log('\n◇ Detecting coding-agent integrations...');
  const status = runToolNet('integrate:auto');
  if (status !== 0) throw new Error(`SETUP_INTEGRATIONS_FAILED status=${status}`);
}

function healthSetup(): void {
  console.log('\n◇ Running health check...');
  const status = runToolNet('doctor');
  if (status !== 0) throw new Error(`SETUP_HEALTH_FAILED status=${status}`);
}

function usage(): void {
  console.log(`ToolNet Memory Setup
Usage:
  toolnet-memory setup
  toolnet-memory setup --section storage
  toolnet-memory setup --section integrations
  toolnet-memory setup --section health
Storage:
  --provider local|r2|s3|huggingface
  --local-root PATH
Automation:
  --non-interactive

ToolNet Memory does not require an LLM or embedding provider.`);
}

async function main(): Promise<void> {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    usage();
    return;
  }
  const setup = options();
  console.log('\n◇ ToolNet Memory Setup\n  Local-first runtime · no LLM required');
  if (setup.section === 'storage' || setup.section === 'all') await storageSetup(setup);
  if (setup.section === 'integrations' || setup.section === 'all') integrationsSetup();
  if (setup.section === 'health' || setup.section === 'all') healthSetup();
  console.log(`\n✓ Setup complete\n  Config: ${ENV_FILE}\n`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
