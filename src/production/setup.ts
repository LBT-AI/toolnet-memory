import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import { installAutoIntegrations } from './auto-integrate.js';

const CONFIG_DIR = path.join(os.homedir(), '.config', 'toolnet-memory');
const ENV_FILE = path.join(CONFIG_DIR, '.env');

type StorageProviderName = 'r2' | 's3' | 'local' | 'huggingface';

function parseEnv(text: string): Map<string, string> {
  const values = new Map<string, string>();

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    const i = line.indexOf('=');
    if (i === -1) continue;

    values.set(line.slice(0, i).trim(), line.slice(i + 1).trim());
  }

  return values;
}

function providerFrom(values: Map<string, string>): StorageProviderName {
  const explicit = values.get('MEMORY_STORAGE_PROVIDER')?.trim();

  if (
    explicit === 'r2' ||
    explicit === 's3' ||
    explicit === 'local' ||
    explicit === 'huggingface'
  ) {
    return explicit;
  }

  if (values.get('R2_ACCOUNT_ID') && values.get('R2_BUCKET')) return 'r2';
  if (values.get('S3_BUCKET')) return 's3';
  if (values.get('HF_NAMESPACE') && values.get('HF_BUCKET')) return 'huggingface';

  return 'r2';
}

function requiredFor(provider: StorageProviderName): string[] {
  if (provider === 'r2') {
    return ['R2_ACCOUNT_ID', 'R2_BUCKET', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'];
  }

  if (provider === 's3') {
    return ['S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'];
  }

  if (provider === 'huggingface') {
    return ['HF_NAMESPACE', 'HF_BUCKET', 'HF_S3_ACCESS_KEY_ID', 'HF_S3_SECRET_ACCESS_KEY'];
  }

  return [];
}

function providerLabel(provider: StorageProviderName): string {
  if (provider === 'r2') return 'Cloudflare R2';
  if (provider === 's3') return 'S3-compatible storage';
  if (provider === 'huggingface') return 'Hugging Face S3 (legacy)';
  return 'Local storage';
}

function saveEnv(values: Map<string, string>) {
  fs.mkdirSync(CONFIG_DIR, {
    recursive: true,
    mode: 0o700,
  });

  const provider = providerFrom(values);

  const content = `# ==========================================================
# TOOLNET MEMORY
# ==========================================================

MEMORY_STORAGE_PROVIDER=${provider}

# Cloudflare R2
R2_ACCOUNT_ID=${values.get('R2_ACCOUNT_ID') ?? ''}
R2_BUCKET=${values.get('R2_BUCKET') ?? 'toolnet-memory'}
R2_ACCESS_KEY_ID=${values.get('R2_ACCESS_KEY_ID') ?? ''}
R2_SECRET_ACCESS_KEY=${values.get('R2_SECRET_ACCESS_KEY') ?? ''}

# Generic S3 / S3-compatible storage
# Leave S3_ENDPOINT empty for AWS S3.
S3_ENDPOINT=${values.get('S3_ENDPOINT') ?? ''}
S3_REGION=${values.get('S3_REGION') ?? 'us-east-1'}
S3_BUCKET=${values.get('S3_BUCKET') ?? 'toolnet-memory'}
S3_ACCESS_KEY_ID=${values.get('S3_ACCESS_KEY_ID') ?? ''}
S3_SECRET_ACCESS_KEY=${values.get('S3_SECRET_ACCESS_KEY') ?? ''}
S3_FORCE_PATH_STYLE=${values.get('S3_FORCE_PATH_STYLE') ?? 'false'}

# Hugging Face S3 (legacy compatibility)
HF_NAMESPACE=${values.get('HF_NAMESPACE') ?? ''}
HF_BUCKET=${values.get('HF_BUCKET') ?? 'toolnet-memory'}
HF_S3_ACCESS_KEY_ID=${values.get('HF_S3_ACCESS_KEY_ID') ?? ''}
HF_S3_SECRET_ACCESS_KEY=${values.get('HF_S3_SECRET_ACCESS_KEY') ?? ''}

# Embedding
HF_TOKEN=${values.get('HF_TOKEN') ?? ''}
HF_EMBEDDING_MODEL=${values.get('HF_EMBEDDING_MODEL') ?? 'sentence-transformers/all-MiniLM-L6-v2'}

# Local cache
MEMORY_LOCAL_STORAGE_PATH=${values.get('MEMORY_LOCAL_STORAGE_PATH') ?? ''}
MEMORY_LOCAL_CACHE_MB=${values.get('MEMORY_LOCAL_CACHE_MB') ?? '200'}

# Automation
MEMORY_AUTO_CAPTURE=${values.get('MEMORY_AUTO_CAPTURE') ?? 'true'}
MEMORY_AUTO_RETRIEVE=${values.get('MEMORY_AUTO_RETRIEVE') ?? 'true'}
MEMORY_AUTO_SUMMARIZE=${values.get('MEMORY_AUTO_SUMMARIZE') ?? 'true'}
MEMORY_AUTO_SYNC=${values.get('MEMORY_AUTO_SYNC') ?? 'true'}

# Retrieval
MEMORY_MAX_CANDIDATES=${values.get('MEMORY_MAX_CANDIDATES') ?? '50'}
MEMORY_RERANK_TOP=${values.get('MEMORY_RERANK_TOP') ?? '10'}
MEMORY_FINAL_CONTEXT=${values.get('MEMORY_FINAL_CONTEXT') ?? '5'}
MEMORY_TOKEN_BUDGET=${values.get('MEMORY_TOKEN_BUDGET') ?? '2000'}

# Automatic Session Memory
TOOLNET_SESSION_LEARNING=${values.get('TOOLNET_SESSION_LEARNING') ?? '1'}
TOOLNET_WORK_CONTINUITY=${values.get('TOOLNET_WORK_CONTINUITY') ?? '1'}
TOOLNET_SEMANTIC_CONTINUITY=${values.get('TOOLNET_SEMANTIC_CONTINUITY') ?? '1'}
TOOLNET_SMART_HANDOFF=${values.get('TOOLNET_SMART_HANDOFF') ?? '1'}
`;

  fs.writeFileSync(ENV_FILE, content, {
    encoding: 'utf8',
    mode: 0o600,
  });

  fs.chmodSync(CONFIG_DIR, 0o700);
  fs.chmodSync(ENV_FILE, 0o600);
}

function yes(answer: string, defaultYes = true) {
  const value = answer.trim().toLowerCase();

  if (!value) return defaultYes;
  return value === 'y' || value === 'yes';
}

async function hiddenQuestion(label: string): Promise<string> {
  if (!input.isTTY) return '';

  output.write(label);

  return new Promise((resolve) => {
    let value = '';

    const finish = () => {
      input.off('data', onData);
      input.setRawMode?.(false);
      input.pause();
      output.write('\n');
      resolve(value);
    };

    const onData = (chunk: Buffer) => {
      for (const ch of chunk.toString('utf8')) {
        if (ch === '\r' || ch === '\n') {
          finish();
          return;
        }

        if (ch === '\u0003') {
          input.setRawMode?.(false);
          output.write('\n');
          process.exit(130);
        }

        if (ch === '\u007f') {
          value = value.slice(0, -1);
          continue;
        }

        value += ch;
      }
    };

    input.resume();
    input.setRawMode?.(true);
    input.on('data', onData);
  });
}

function enableAutomaticAgentMemory() {
  try {
    const results = installAutoIntegrations();
    const installed = results.filter((item) => item.installed);

    if (installed.length > 0) {
      console.log('');
      console.log('Automatic AI memory:');

      for (const item of installed) {
        const name =
          item.agent === 'agy'
            ? 'Agy / Antigravity'
            : item.agent === 'opencode'
              ? 'OpenCode'
              : 'Codex';

        console.log(`  ✓ ${name}`);
      }
    }
  } catch {
    // Agent integration is optional.
  }
}

function setIfEntered(values: Map<string, string>, key: string, value: string, fallback?: string) {
  if (value.trim()) {
    values.set(key, value.trim());
  } else if (!values.get(key) && fallback !== undefined) {
    values.set(key, fallback);
  }
}

async function chooseProvider(
  rl: readline.Interface,
  current: StorageProviderName
): Promise<StorageProviderName> {
  console.log('Storage provider:');
  console.log('  1. Cloudflare R2 (recommended)');
  console.log('  2. S3 / S3-compatible');
  console.log('  3. Local');
  console.log('  4. Hugging Face S3 (legacy)');
  console.log('');

  const defaultChoice =
    current === 's3' ? '2' : current === 'local' ? '3' : current === 'huggingface' ? '4' : '1';

  const answer = await rl.question(`Choose [${defaultChoice}]: `);

  const choice = answer.trim() || defaultChoice;

  if (choice === '2') return 's3';
  if (choice === '3') return 'local';
  if (choice === '4') return 'huggingface';
  return 'r2';
}

async function main() {
  const exists = fs.existsSync(ENV_FILE);

  const values = exists ? parseEnv(fs.readFileSync(ENV_FILE, 'utf8')) : new Map<string, string>();

  let provider = providerFrom(values);
  let required = requiredFor(provider);
  let configured = required.every((key) => Boolean(values.get(key)?.trim()));

  console.log('');
  console.log('TOOLNET MEMORY SETUP');
  console.log('====================');
  console.log('');
  console.log(`Config: ${ENV_FILE}`);
  console.log('');

  if (!input.isTTY || !output.isTTY) {
    if (!exists) {
      values.set('MEMORY_STORAGE_PROVIDER', provider);
      saveEnv(values);
    }

    if (configured) {
      console.log(`✓ ${providerLabel(provider)} already configured`);
    } else {
      console.log('Configuration pending.');
      console.log('Run:');
      console.log('  toolnet-memory setup');
    }

    enableAutomaticAgentMemory();
    return;
  }

  const rl = readline.createInterface({ input, output });

  if (configured) {
    console.log(`✓ ${providerLabel(provider)} already configured`);
    console.log('');

    const keep = await rl.question('Use existing storage configuration? (Y/n) [Y]: ');

    if (yes(keep)) {
      rl.close();
      console.log('');
      console.log(`✓ Existing ${providerLabel(provider)} configuration kept`);
      console.log('');
      enableAutomaticAgentMemory();
      console.log('Next:');
      console.log('  toolnet-memory doctor');
      return;
    }

    console.log('');
  }

  provider = await chooseProvider(rl, provider);
  values.set('MEMORY_STORAGE_PROVIDER', provider);
  console.log('');

  let secretKeyName = '';
  let secretLabel = '';

  if (provider === 'r2') {
    const accountId = await rl.question(
      values.get('R2_ACCOUNT_ID')
        ? `Cloudflare Account ID [${values.get('R2_ACCOUNT_ID')}]: `
        : 'Cloudflare Account ID: '
    );
    const bucket = await rl.question(
      `R2 Bucket [${values.get('R2_BUCKET') || 'toolnet-memory'}]: `
    );
    const access = await rl.question(
      values.get('R2_ACCESS_KEY_ID') ? 'R2 Access Key ID [configured]: ' : 'R2 Access Key ID: '
    );

    setIfEntered(values, 'R2_ACCOUNT_ID', accountId);
    setIfEntered(values, 'R2_BUCKET', bucket, 'toolnet-memory');
    setIfEntered(values, 'R2_ACCESS_KEY_ID', access);

    secretKeyName = 'R2_SECRET_ACCESS_KEY';
    secretLabel = values.get(secretKeyName)
      ? 'R2 Secret Access Key [configured]: '
      : 'R2 Secret Access Key: ';
  } else if (provider === 's3') {
    const endpoint = await rl.question(
      values.get('S3_ENDPOINT')
        ? `S3 Endpoint [${values.get('S3_ENDPOINT')}]: `
        : 'S3 Endpoint [blank = AWS S3]: '
    );
    const region = await rl.question(`S3 Region [${values.get('S3_REGION') || 'us-east-1'}]: `);
    const bucket = await rl.question(
      `S3 Bucket [${values.get('S3_BUCKET') || 'toolnet-memory'}]: `
    );
    const access = await rl.question(
      values.get('S3_ACCESS_KEY_ID') ? 'S3 Access Key ID [configured]: ' : 'S3 Access Key ID: '
    );
    const pathStyle = await rl.question(
      `Force path-style? (y/N) [${values.get('S3_FORCE_PATH_STYLE') === 'true' ? 'Y' : 'N'}]: `
    );

    if (endpoint.trim()) values.set('S3_ENDPOINT', endpoint.trim());
    setIfEntered(values, 'S3_REGION', region, 'us-east-1');
    setIfEntered(values, 'S3_BUCKET', bucket, 'toolnet-memory');
    setIfEntered(values, 'S3_ACCESS_KEY_ID', access);

    if (pathStyle.trim()) {
      values.set('S3_FORCE_PATH_STYLE', yes(pathStyle, false) ? 'true' : 'false');
    } else if (!values.get('S3_FORCE_PATH_STYLE')) {
      values.set('S3_FORCE_PATH_STYLE', 'false');
    }

    secretKeyName = 'S3_SECRET_ACCESS_KEY';
    secretLabel = values.get(secretKeyName)
      ? 'S3 Secret Access Key [configured]: '
      : 'S3 Secret Access Key: ';
  } else if (provider === 'huggingface') {
    const namespace = await rl.question(
      values.get('HF_NAMESPACE')
        ? `Hugging Face namespace [${values.get('HF_NAMESPACE')}]: `
        : 'Hugging Face namespace: '
    );
    const bucket = await rl.question(`Bucket [${values.get('HF_BUCKET') || 'toolnet-memory'}]: `);
    const access = await rl.question(
      values.get('HF_S3_ACCESS_KEY_ID') ? 'S3 Access Key ID [configured]: ' : 'S3 Access Key ID: '
    );

    setIfEntered(values, 'HF_NAMESPACE', namespace);
    setIfEntered(values, 'HF_BUCKET', bucket, 'toolnet-memory');
    setIfEntered(values, 'HF_S3_ACCESS_KEY_ID', access);

    secretKeyName = 'HF_S3_SECRET_ACCESS_KEY';
    secretLabel = values.get(secretKeyName)
      ? 'S3 Secret Access Key [configured]: '
      : 'S3 Secret Access Key: ';
  }

  rl.close();

  if (secretKeyName) {
    const secret = await hiddenQuestion(secretLabel);
    if (secret.trim()) values.set(secretKeyName, secret.trim());
  }

  saveEnv(values);

  required = requiredFor(provider);
  const missing = required.filter((key) => !values.get(key)?.trim());

  console.log('');
  console.log('✓ Configuration saved');
  console.log(`  ${ENV_FILE}`);
  console.log('');

  if (missing.length) {
    console.log('Missing configuration:');
    for (const key of missing) {
      console.log(`  - ${key}`);
    }
    console.log('');
    console.log('Run setup again:');
    console.log('  toolnet-memory setup');
    return;
  }

  console.log(`✓ ${providerLabel(provider)} configuration complete`);
  console.log('');
  enableAutomaticAgentMemory();

  console.log('Next:');
  console.log('  toolnet-memory doctor');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
