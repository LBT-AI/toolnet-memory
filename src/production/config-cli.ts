import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CONFIG_DIR = path.join(os.homedir(), '.config', 'toolnet-memory');
const ENV_FILE = path.join(CONFIG_DIR, '.env');
const SECRET_PATTERN = /(SECRET|TOKEN|PASSWORD|ACCESS_KEY|API_KEY|PRIVATE_KEY)/i;

function ensureConfig(): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  if (!fs.existsSync(ENV_FILE)) {
    fs.writeFileSync(ENV_FILE, '', { encoding: 'utf8', mode: 0o600 });
  }
  fs.chmodSync(CONFIG_DIR, 0o700);
  fs.chmodSync(ENV_FILE, 0o600);
}

function parseLines(): string[] {
  ensureConfig();
  return fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/);
}

function parseValues(): Map<string, string> {
  const values = new Map<string, string>();
  for (const raw of parseLines()) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index < 1) continue;
    values.set(line.slice(0, index).trim(), line.slice(index + 1).trim());
  }
  return values;
}

function validKey(key: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(key);
}

function masked(key: string, value: string): string {
  if (!SECRET_PATTERN.test(key)) return value;
  if (!value) return '';
  if (value.length <= 8) return '********';
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function writeLines(lines: string[]): void {
  ensureConfig();
  fs.writeFileSync(ENV_FILE, `${lines.join('\n').replace(/\n+$/, '')}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });
  fs.chmodSync(ENV_FILE, 0o600);
}

function setValue(key: string, value: string): void {
  if (!validKey(key)) throw new Error(`Invalid config key: ${key}`);
  const lines = parseLines();
  let replaced = false;
  const updated = lines.map((line) => {
    if (line.trim().startsWith(`${key}=`)) {
      replaced = true;
      return `${key}=${value}`;
    }
    return line;
  });
  if (!replaced) {
    if (updated.length && updated.at(-1) !== '') updated.push('');
    updated.push(`${key}=${value}`);
  }
  writeLines(updated);
}

function unsetValue(key: string): boolean {
  if (!validKey(key)) throw new Error(`Invalid config key: ${key}`);
  const lines = parseLines();
  const updated = lines.filter((line) => !line.trim().startsWith(`${key}=`));
  if (updated.length === lines.length) return false;
  writeLines(updated);
  return true;
}

function showSummary(): void {
  const values = parseValues();
  const storage = values.get('MEMORY_STORAGE_PROVIDER') || 'not configured';

  console.log('');
  console.log('◇ ToolNet Memory Config');
  console.log('');
  console.log(`Storage    ${storage}`);
  console.log(`File       ${ENV_FILE}`);
  console.log('Secrets    hidden');
  console.log('');
}

function validate(): boolean {
  const values = parseValues();
  const errors: string[] = [];
  if (!values.get('MEMORY_STORAGE_PROVIDER')) errors.push('Storage provider is missing');

  if (errors.length) {
    console.log('Config needs attention:');
    for (const error of errors) console.log(`  ✗ ${error}`);
    return false;
  }
  console.log('✓ Config structure looks valid');
  return true;
}

function launchSetup(): void {
  console.log('ToolNet Memory configuration');
  console.log('');
  console.log('Memory runtime is local and does not require an LLM or embedding provider.');
  console.log('Configure storage and runtime options through environment variables');
  console.log('or use `toolnet-memory config set KEY VALUE`.');
  console.log('');
  console.log(`Config file: ${ENV_FILE}`);
}

function usage(): void {
  console.log(`ToolNet Memory Config

Commands:
  toolnet-memory config                 Show configuration guidance
  toolnet-memory config show            Friendly summary
  toolnet-memory config file            Print config path
  toolnet-memory config list            List active keys (secrets masked)
  toolnet-memory config get KEY          Read one value (masked if secret)
  toolnet-memory config get KEY --reveal Read one value including secret
  toolnet-memory config set KEY VALUE    Set one value
  toolnet-memory config unset KEY        Remove one value
  toolnet-memory config validate         Validate required fields
  toolnet-memory config open             Open config in editor

Targeted setup:
  toolnet-memory setup --section storage
  toolnet-memory setup --section integrations
  toolnet-memory setup --section health`);
}

function main(): void {
  const [command, ...args] = process.argv.slice(2);

  if (!command || command === 'configure') {
    launchSetup();
    return;
  }

  if (command === 'show') {
    showSummary();
    return;
  }

  if (command === 'path' || command === 'file') {
    ensureConfig();
    console.log(ENV_FILE);
    return;
  }

  if (command === 'list') {
    const values = parseValues();
    for (const [key, value] of values) console.log(`${key}=${masked(key, value)}`);
    return;
  }

  if (command === 'get') {
    const key = args[0];
    if (!key) throw new Error('Usage: toolnet-memory config get KEY');
    const values = parseValues();
    if (!values.has(key)) throw new Error(`Config key not found: ${key}`);
    const value = values.get(key) ?? '';
    console.log(args.includes('--reveal') ? value : masked(key, value));
    return;
  }

  if (command === 'set') {
    const key = args[0];
    const value = args[1];
    if (!key || value === undefined) throw new Error('Usage: toolnet-memory config set KEY VALUE');
    setValue(key, value);
    console.log(`✓ ${key} updated`);
    return;
  }

  if (command === 'unset') {
    const key = args[0];
    if (!key) throw new Error('Usage: toolnet-memory config unset KEY');
    console.log(unsetValue(key) ? `✓ ${key} removed` : `· ${key} was not set`);
    return;
  }

  if (command === 'validate') {
    if (!validate()) process.exitCode = 1;
    return;
  }

  if (command === 'open') {
    ensureConfig();
    if (!process.stdin.isTTY) {
      console.log(ENV_FILE);
      return;
    }
    const editor = process.env.VISUAL || process.env.EDITOR || 'vi';
    const result = spawnSync(editor, [ENV_FILE], { stdio: 'inherit', shell: true });
    process.exitCode = result.status ?? 0;
    return;
  }

  usage();
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
