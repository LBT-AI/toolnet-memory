import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';

import { createAiProvider } from '../ai/factory.js';
import type { AiProviderConfig, AiProviderId } from '../ai/types.js';
import { installAutoIntegrations } from './auto-integrate.js';

const CONFIG_DIR = path.join(os.homedir(), '.config', 'toolnet-memory');
const ENV_FILE = path.join(CONFIG_DIR, '.env');

type Values = Map<string, string>;
type StorageProvider = 'r2' | 's3' | 'huggingface' | 'local';
type Section = 'model' | 'embedding' | 'storage' | 'integrations' | 'health';

type LlmDefinition = {
  id: AiProviderId;
  label: string;
  baseUrl?: string;
  model?: string;
  apiKeyRequired: boolean;
  baseUrlRequired?: boolean;
  accountIdRequired?: boolean;
  envKeys?: string[];
};

type EmbeddingDefinition = {
  id: AiProviderId | 'local';
  label: string;
  baseUrl?: string;
  model?: string;
  apiKeyRequired: boolean;
  baseUrlRequired?: boolean;
  accountIdRequired?: boolean;
};

const LLM_PROVIDERS: readonly LlmDefinition[] = [
  {
    id: 'nvidia',
    label: 'NVIDIA NIM',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    model: 'nvidia/nemotron-3-nano-30b-a3b',
    apiKeyRequired: true,
    envKeys: ['NVIDIA_API_KEY', 'NVIDIA_NIM_API_KEY'],
  },
  {
    id: 'openai-compatible',
    label: 'OpenAI-compatible',
    apiKeyRequired: true,
    baseUrlRequired: true,
    envKeys: ['OPENAI_API_KEY'],
  },
  {
    id: 'alibaba',
    label: 'Alibaba / DashScope',
    baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    apiKeyRequired: true,
    envKeys: ['DASHSCOPE_API_KEY', 'ALIBABA_API_KEY'],
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKeyRequired: true,
    envKeys: ['OPENROUTER_API_KEY'],
  },
  {
    id: 'groq',
    label: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKeyRequired: true,
    envKeys: ['GROQ_API_KEY'],
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-chat',
    apiKeyRequired: true,
    envKeys: ['DEEPSEEK_API_KEY'],
  },
  {
    id: 'gemini',
    label: 'Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKeyRequired: true,
    envKeys: ['GEMINI_API_KEY', 'GOOGLE_API_KEY'],
  },
  {
    id: 'huggingface',
    label: 'Hugging Face',
    baseUrl: 'https://router.huggingface.co/v1',
    apiKeyRequired: true,
    envKeys: ['HF_TOKEN'],
  },
  {
    id: 'ollama',
    label: 'Ollama / Local',
    baseUrl: 'http://127.0.0.1:11434/v1',
    apiKeyRequired: false,
  },
  {
    id: 'custom',
    label: 'Custom endpoint',
    apiKeyRequired: false,
    baseUrlRequired: true,
  },
  {
    id: 'cloudflare',
    label: 'Cloudflare Workers AI',
    model: '@cf/meta/llama-3.1-8b-instruct',
    apiKeyRequired: true,
    accountIdRequired: true,
    envKeys: ['CLOUDFLARE_API_TOKEN'],
  },
] as const;

const EMBEDDING_PROVIDERS: readonly EmbeddingDefinition[] = [
  {
    id: 'local',
    label: 'Local / Hash  (recommended)',
    apiKeyRequired: false,
  },
  {
    id: 'huggingface',
    label: 'Hugging Face',
    model: 'sentence-transformers/all-MiniLM-L6-v2',
    apiKeyRequired: true,
  },
  {
    id: 'openai-compatible',
    label: 'OpenAI-compatible',
    apiKeyRequired: true,
    baseUrlRequired: true,
  },
  {
    id: 'alibaba',
    label: 'Alibaba / DashScope',
    baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    model: 'text-embedding-v4',
    apiKeyRequired: true,
  },
  {
    id: 'nvidia',
    label: 'NVIDIA NIM',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    apiKeyRequired: true,
  },
  {
    id: 'ollama',
    label: 'Ollama / Local',
    baseUrl: 'http://127.0.0.1:11434/v1',
    apiKeyRequired: false,
  },
  {
    id: 'gemini',
    label: 'Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-embedding-001',
    apiKeyRequired: true,
  },
  {
    id: 'cloudflare',
    label: 'Cloudflare Workers AI',
    model: '@cf/baai/bge-base-en-v1.5',
    apiKeyRequired: true,
    accountIdRequired: true,
  },
  {
    id: 'custom',
    label: 'Custom OpenAI-compatible',
    apiKeyRequired: false,
    baseUrlRequired: true,
  },
] as const;

const DEFAULTS: Readonly<Record<string, string>> = {
  MEMORY_AUTO_CAPTURE: 'true',
  MEMORY_AUTO_RETRIEVE: 'true',
  MEMORY_AUTO_SUMMARIZE: 'true',
  MEMORY_AUTO_SYNC: 'true',
  MEMORY_MAX_CANDIDATES: '50',
  MEMORY_RERANK_TOP: '10',
  MEMORY_FINAL_CONTEXT: '5',
  MEMORY_TOKEN_BUDGET: '2000',
  TOOLNET_SESSION_LEARNING: '1',
  TOOLNET_WORK_CONTINUITY: '1',
  TOOLNET_SEMANTIC_CONTINUITY: '1',
  TOOLNET_SMART_HANDOFF: '1',
  TOOLNET_LLM_FALLBACK_COOLDOWN_MS: '60000',
  TOOLNET_LLM_MAX_RETRIES: '1',
};

const MANAGED_KEYS = new Set([
  'MEMORY_STORAGE_PROVIDER',
  'R2_ACCOUNT_ID',
  'R2_BUCKET',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'S3_ENDPOINT',
  'S3_REGION',
  'S3_BUCKET',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
  'S3_FORCE_PATH_STYLE',
  'HF_NAMESPACE',
  'HF_BUCKET',
  'HF_S3_ACCESS_KEY_ID',
  'HF_S3_SECRET_ACCESS_KEY',
  'HF_URL',
  'HF_TOKEN',
  'HF_EMBEDDING_MODEL',
  'TOOLNET_LLM_PROVIDER',
  'TOOLNET_LLM_API_KEY',
  'TOOLNET_LLM_BASE_URL',
  'TOOLNET_LLM_MODEL',
  'TOOLNET_LLM_ACCOUNT_ID',
  'TOOLNET_EMBEDDING_PROVIDER',
  'TOOLNET_EMBEDDING_API_KEY',
  'TOOLNET_EMBEDDING_BASE_URL',
  'TOOLNET_EMBEDDING_MODEL',
  'TOOLNET_EMBEDDING_ACCOUNT_ID',
  'TOOLNET_LLM_FALLBACK_1_PROVIDER',
  'TOOLNET_LLM_FALLBACK_1_API_KEY',
  'TOOLNET_LLM_FALLBACK_1_BASE_URL',
  'TOOLNET_LLM_FALLBACK_1_MODEL',
  'TOOLNET_LLM_FALLBACK_1_ACCOUNT_ID',
  'TOOLNET_LLM_FALLBACK_2_PROVIDER',
  'TOOLNET_LLM_FALLBACK_2_API_KEY',
  'TOOLNET_LLM_FALLBACK_2_BASE_URL',
  'TOOLNET_LLM_FALLBACK_2_MODEL',
  'TOOLNET_LLM_FALLBACK_2_ACCOUNT_ID',
  'TOOLNET_LLM_FALLBACK_COOLDOWN_MS',
  'TOOLNET_LLM_MAX_RETRIES',
  'MEMORY_LOCAL_STORAGE_PATH',
  'MEMORY_LOCAL_CACHE_MB',
  ...Object.keys(DEFAULTS),
]);

function normalizeEndpoint(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

function parseEnv(text: string): Values {
  const values = new Map<string, string>();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index < 1) continue;
    values.set(line.slice(0, index).trim(), line.slice(index + 1).trim());
  }
  return values;
}

function currentStorage(values: Values): StorageProvider {
  const provider = values.get('MEMORY_STORAGE_PROVIDER');
  if (provider === 'r2' || provider === 's3' || provider === 'huggingface' || provider === 'local') {
    return provider;
  }
  if (values.get('HF_BUCKET') && values.get('HF_S3_ACCESS_KEY_ID')) return 'huggingface';
  if (values.get('R2_ACCOUNT_ID')) return 'r2';
  if (values.get('S3_BUCKET')) return 's3';
  return 'local';
}

function llmDefinition(id: string | undefined): LlmDefinition | undefined {
  return LLM_PROVIDERS.find((item) => item.id === id);
}

function embeddingDefinition(id: string | undefined): EmbeddingDefinition | undefined {
  return EMBEDDING_PROVIDERS.find((item) => item.id === id);
}

function labelLlm(id: string | undefined): string {
  return llmDefinition(id)?.label ?? id ?? 'not configured';
}

function labelEmbedding(id: string | undefined): string {
  return embeddingDefinition(id)?.label.replace('  (recommended)', '') ?? id ?? 'not configured';
}

function labelStorage(provider: StorageProvider): string {
  if (provider === 'r2') return 'Cloudflare R2';
  if (provider === 's3') return 'S3 / S3-compatible';
  if (provider === 'huggingface') return 'Hugging Face S3';
  return 'Local';
}

function applyDefaults(values: Values): void {
  for (const [key, value] of Object.entries(DEFAULTS)) {
    if (!values.has(key)) values.set(key, value);
  }
  if (!values.has('MEMORY_STORAGE_PROVIDER')) values.set('MEMORY_STORAGE_PROVIDER', currentStorage(values));
  if (!values.has('MEMORY_LOCAL_CACHE_MB')) values.set('MEMORY_LOCAL_CACHE_MB', '200');
}

function detectedKey(definition: LlmDefinition, values: Values): string | undefined {
  const existing = values.get('TOOLNET_LLM_API_KEY')?.trim();
  if (existing && values.get('TOOLNET_LLM_PROVIDER') === definition.id) return existing;
  for (const key of definition.envKeys ?? []) {
    const value = process.env[key]?.trim() || values.get(key)?.trim();
    if (value) return value;
  }
  return undefined;
}

function migrateLegacy(values: Values): void {
  if (!values.get('TOOLNET_LLM_PROVIDER')) {
    const candidates: Array<[AiProviderId, string[]]> = [
      ['nvidia', ['NVIDIA_API_KEY', 'NVIDIA_NIM_API_KEY']],
      ['groq', ['GROQ_API_KEY']],
      ['openrouter', ['OPENROUTER_API_KEY']],
      ['deepseek', ['DEEPSEEK_API_KEY']],
      ['alibaba', ['DASHSCOPE_API_KEY', 'ALIBABA_API_KEY']],
      ['gemini', ['GEMINI_API_KEY', 'GOOGLE_API_KEY']],
      ['huggingface', ['HF_TOKEN']],
      ['openai-compatible', ['OPENAI_API_KEY']],
    ];
    for (const [provider, keys] of candidates) {
      const key = keys.map((name) => values.get(name) || process.env[name]).find(Boolean);
      if (!key) continue;
      const definition = llmDefinition(provider);
      values.set('TOOLNET_LLM_PROVIDER', provider);
      values.set('TOOLNET_LLM_API_KEY', key);
      if (definition?.baseUrl) values.set('TOOLNET_LLM_BASE_URL', definition.baseUrl);
      if (definition?.model) values.set('TOOLNET_LLM_MODEL', definition.model);
      break;
    }
  }
  if (!values.get('TOOLNET_EMBEDDING_PROVIDER') && values.get('HF_TOKEN')) {
    values.set('TOOLNET_EMBEDDING_PROVIDER', 'huggingface');
    values.set('TOOLNET_EMBEDDING_API_KEY', values.get('HF_TOKEN') ?? '');
    values.set(
      'TOOLNET_EMBEDDING_MODEL',
      values.get('HF_EMBEDDING_MODEL') || 'sentence-transformers/all-MiniLM-L6-v2'
    );
  }
}

function pushValue(lines: string[], key: string, values: Values, fallback?: string): void {
  const value = values.get(key)?.trim() || fallback;
  if (value !== undefined && value !== '') lines.push(`${key}=${value}`);
}

function renderEnv(values: Values): string {
  const storage = currentStorage(values);
  const lines: string[] = [
    '# ToolNet Memory',
    '# Managed by `toolnet-memory setup` / `toolnet-memory config`.',
    '# Secrets are stored here with mode 600. Do not commit this file.',
    '',
    '# Storage',
    `MEMORY_STORAGE_PROVIDER=${storage}`,
  ];

  if (storage === 'r2') {
    pushValue(lines, 'R2_ACCOUNT_ID', values);
    pushValue(lines, 'R2_BUCKET', values, 'toolnet-memory');
    pushValue(lines, 'R2_ACCESS_KEY_ID', values);
    pushValue(lines, 'R2_SECRET_ACCESS_KEY', values);
  } else if (storage === 's3') {
    pushValue(lines, 'S3_ENDPOINT', values);
    pushValue(lines, 'S3_REGION', values, 'us-east-1');
    pushValue(lines, 'S3_BUCKET', values, 'toolnet-memory');
    pushValue(lines, 'S3_ACCESS_KEY_ID', values);
    pushValue(lines, 'S3_SECRET_ACCESS_KEY', values);
    pushValue(lines, 'S3_FORCE_PATH_STYLE', values, 'false');
  } else if (storage === 'huggingface') {
    pushValue(lines, 'HF_NAMESPACE', values);
    pushValue(lines, 'HF_BUCKET', values, 'toolnet-memory');
    pushValue(lines, 'HF_S3_ACCESS_KEY_ID', values);
    pushValue(lines, 'HF_S3_SECRET_ACCESS_KEY', values);
    pushValue(lines, 'HF_URL', values);
  } else {
    pushValue(lines, 'MEMORY_LOCAL_STORAGE_PATH', values);
    pushValue(lines, 'MEMORY_LOCAL_CACHE_MB', values, '200');
  }

  lines.push('', '# AI');
  pushValue(lines, 'TOOLNET_LLM_PROVIDER', values);
  pushValue(lines, 'TOOLNET_LLM_API_KEY', values);
  pushValue(lines, 'TOOLNET_LLM_BASE_URL', values);
  pushValue(lines, 'TOOLNET_LLM_MODEL', values);
  pushValue(lines, 'TOOLNET_LLM_ACCOUNT_ID', values);

  lines.push('', '# Embedding');
  pushValue(lines, 'TOOLNET_EMBEDDING_PROVIDER', values, 'local');
  pushValue(lines, 'TOOLNET_EMBEDDING_API_KEY', values);
  pushValue(lines, 'TOOLNET_EMBEDDING_BASE_URL', values);
  pushValue(lines, 'TOOLNET_EMBEDDING_MODEL', values);
  pushValue(lines, 'TOOLNET_EMBEDDING_ACCOUNT_ID', values);

  for (const slot of [1, 2] as const) {
    const prefix = `TOOLNET_LLM_FALLBACK_${slot}`;
    if (!values.get(`${prefix}_PROVIDER`)) continue;
    lines.push('', `# LLM fallback ${slot}`);
    for (const suffix of ['PROVIDER', 'API_KEY', 'BASE_URL', 'MODEL', 'ACCOUNT_ID']) {
      pushValue(lines, `${prefix}_${suffix}`, values);
    }
  }

  lines.push('', '# Runtime');
  for (const key of Object.keys(DEFAULTS)) pushValue(lines, key, values, DEFAULTS[key]);

  const unknown = [...values.entries()].filter(([key]) => !MANAGED_KEYS.has(key));
  if (unknown.length) {
    lines.push('', '# Preserved custom settings');
    for (const [key, value] of unknown) lines.push(`${key}=${value}`);
  }

  return `${lines.join('\n')}\n`;
}

function save(values: Values): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  const tmp = `${ENV_FILE}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, renderEnv(values), { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(tmp, ENV_FILE);
  fs.chmodSync(CONFIG_DIR, 0o700);
  fs.chmodSync(ENV_FILE, 0o600);
}

function setIfEntered(values: Values, key: string, entered: string, fallback?: string): void {
  const value = entered.trim();
  if (value) values.set(key, value);
  else if (!values.get(key) && fallback !== undefined) values.set(key, fallback);
}

async function secretQuestion(rl: readline.Interface, label: string): Promise<string> {
  if (!input.isTTY) return '';
  rl.pause();
  output.write(label);
  return new Promise((resolve) => {
    let value = '';
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      input.off('data', onData);
      input.setRawMode?.(false);
      input.pause();
      output.write('\n');
      rl.resume();
      resolve(value);
    };
    const onData = (chunk: Buffer) => {
      for (const ch of chunk.toString('utf8')) {
        if (ch === '\r' || ch === '\n') return finish();
        if (ch === '\u0003') {
          input.setRawMode?.(false);
          output.write('\n');
          process.exit(130);
        }
        if (ch === '\u007f') value = value.slice(0, -1);
        else value += ch;
      }
    };
    input.resume();
    input.setRawMode?.(true);
    input.on('data', onData);
  });
}

function header(subtitle = 'Guided Setup'): void {
  console.log('');
  console.log('◇ ToolNet Memory');
  console.log(`  ${subtitle}`);
  console.log('');
}

function status(values: Values): void {
  const llmProvider = values.get('TOOLNET_LLM_PROVIDER');
  const embeddingProvider = values.get('TOOLNET_EMBEDDING_PROVIDER') || 'local';
  console.log('Current');
  console.log('────────────────────────────────────────');
  console.log(`Storage    ${labelStorage(currentStorage(values))}`);
  console.log(
    `LLM        ${llmProvider ? `${labelLlm(llmProvider)} / ${values.get('TOOLNET_LLM_MODEL') || 'model missing'}` : 'not configured'}`
  );
  console.log(
    `Embedding  ${labelEmbedding(embeddingProvider)}${embeddingProvider === 'local' ? '' : ` / ${values.get('TOOLNET_EMBEDDING_MODEL') || 'model missing'}`}`
  );
  console.log('');
}

function clearLlm(values: Values): void {
  for (const key of [
    'TOOLNET_LLM_API_KEY',
    'TOOLNET_LLM_BASE_URL',
    'TOOLNET_LLM_MODEL',
    'TOOLNET_LLM_ACCOUNT_ID',
  ]) {
    values.delete(key);
  }
}

function clearEmbedding(values: Values): void {
  for (const key of [
    'TOOLNET_EMBEDDING_API_KEY',
    'TOOLNET_EMBEDDING_BASE_URL',
    'TOOLNET_EMBEDDING_MODEL',
    'TOOLNET_EMBEDDING_ACCOUNT_ID',
  ]) {
    values.delete(key);
  }
}

async function choose<T extends { label: string }>(
  rl: readline.Interface,
  title: string,
  items: readonly T[],
  current?: number
): Promise<T | undefined> {
  console.log(title);
  console.log('────────────────────────────────────────');
  items.forEach((item, index) => {
    const marker = current === index ? '  ✓ current' : '';
    console.log(`  ${index + 1}. ${item.label}${marker}`);
  });
  console.log('  0. Back');
  console.log('');
  while (true) {
    const answer = (await rl.question('Choose: ')).trim();
    if (answer === '0') return undefined;
    const index = Number(answer) - 1;
    if (Number.isInteger(index) && index >= 0 && index < items.length) return items[index];
    console.log('Invalid selection.');
  }
}

async function testLlm(values: Values, quiet = false): Promise<boolean> {
  const id = values.get('TOOLNET_LLM_PROVIDER') as AiProviderId | undefined;
  const model = values.get('TOOLNET_LLM_MODEL')?.trim();
  if (!id || !model) return false;
  const config: AiProviderConfig = {
    id,
    apiKey: values.get('TOOLNET_LLM_API_KEY')?.trim() || undefined,
    baseUrl: values.get('TOOLNET_LLM_BASE_URL')?.trim() || undefined,
    model,
    accountId: values.get('TOOLNET_LLM_ACCOUNT_ID')?.trim() || undefined,
  };
  if (!quiet) console.log(`Testing ${labelLlm(id)} / ${model}...`);
  try {
    const result = await createAiProvider(config).healthCheck();
    if (!quiet) {
      if (result.ok) console.log(`✓ Model ready${result.latencyMs ? ` — ${result.latencyMs}ms` : ''}`);
      else console.log(`✗ ${result.message}`);
      console.log('');
    }
    return result.ok;
  } catch (error) {
    if (!quiet) {
      console.log(`✗ ${error instanceof Error ? error.message : String(error)}`);
      console.log('');
    }
    return false;
  }
}

async function modelWizard(rl: readline.Interface, values: Values): Promise<boolean> {
  const original = new Map(values);
  while (true) {
    const current = LLM_PROVIDERS.findIndex((item) => item.id === values.get('TOOLNET_LLM_PROVIDER'));
    console.log('');
    const definition = await choose(rl, 'Model provider', LLM_PROVIDERS, current >= 0 ? current : undefined);
    if (!definition) return false;

    if (values.get('TOOLNET_LLM_PROVIDER') !== definition.id) clearLlm(values);
    values.set('TOOLNET_LLM_PROVIDER', definition.id);

    console.log('');
    console.log(definition.label);
    console.log('────────────────────────────────────────');

    if (definition.accountIdRequired) {
      const currentAccount = values.get('TOOLNET_LLM_ACCOUNT_ID');
      const account = await rl.question(currentAccount ? `Account ID [${currentAccount}]: ` : 'Account ID: ');
      setIfEntered(values, 'TOOLNET_LLM_ACCOUNT_ID', account);
    } else {
      values.delete('TOOLNET_LLM_ACCOUNT_ID');
    }

    if (definition.apiKeyRequired || definition.id === 'custom') {
      const candidate = detectedKey(definition, values);
      const prompt = candidate
        ? 'API key [configured/detected, Enter = keep]: '
        : definition.apiKeyRequired
          ? 'API key: '
          : 'API key [optional]: ';
      const entered = await secretQuestion(rl, prompt);
      if (entered.trim()) values.set('TOOLNET_LLM_API_KEY', entered.trim());
      else if (candidate) values.set('TOOLNET_LLM_API_KEY', candidate);
    } else {
      values.delete('TOOLNET_LLM_API_KEY');
    }

    if (definition.id === 'cloudflare') {
      values.delete('TOOLNET_LLM_BASE_URL');
    } else {
      const existing = values.get('TOOLNET_LLM_BASE_URL');
      const fallback = existing || definition.baseUrl || '';
      const entered = await rl.question(fallback ? `Base URL [${fallback}]: ` : 'Base URL: ');
      const resolved = entered.trim() || fallback;
      if (resolved) values.set('TOOLNET_LLM_BASE_URL', normalizeEndpoint(resolved));
      else values.delete('TOOLNET_LLM_BASE_URL');
    }

    const existingModel = values.get('TOOLNET_LLM_MODEL');
    const suggested = existingModel || definition.model || '';
    const model = await rl.question(suggested ? `Model [${suggested}]: ` : 'Model: ');
    const resolvedModel = model.trim() || suggested;
    if (resolvedModel) values.set('TOOLNET_LLM_MODEL', resolvedModel);

    if (!values.get('TOOLNET_LLM_MODEL')) {
      console.log('Model is required.');
      continue;
    }
    if (definition.apiKeyRequired && !values.get('TOOLNET_LLM_API_KEY')) {
      console.log('API key is required.');
      continue;
    }
    if (definition.baseUrlRequired && !values.get('TOOLNET_LLM_BASE_URL')) {
      console.log('Base URL is required.');
      continue;
    }

    console.log('');
    const ok = await testLlm(values);
    if (ok) {
      save(values);
      console.log('✓ Model saved');
      return true;
    }

    console.log('  1. Retry this model');
    console.log('  2. Choose another provider');
    console.log('  3. Save anyway (advanced)');
    console.log('  0. Cancel');
    const action = (await rl.question('Choose [1]: ')).trim() || '1';
    if (action === '3') {
      save(values);
      console.log('⚠ Saved without a successful model check.');
      return true;
    }
    if (action === '2') continue;
    if (action === '0') {
      values.clear();
      for (const [key, value] of original) values.set(key, value);
      return false;
    }
  }
}

async function testEmbedding(values: Values): Promise<boolean> {
  const provider = values.get('TOOLNET_EMBEDDING_PROVIDER') || 'local';
  if (provider === 'local') {
    console.log('✓ Local embedding ready');
    return true;
  }
  const apiKey = values.get('TOOLNET_EMBEDDING_API_KEY')?.trim();
  const model = values.get('TOOLNET_EMBEDDING_MODEL')?.trim();
  let baseUrl = values.get('TOOLNET_EMBEDDING_BASE_URL')?.trim();
  if (!model) {
    console.log('✗ Embedding model is missing');
    return false;
  }
  try {
    if (provider === 'huggingface') {
      if (!apiKey) throw new Error('API key is missing');
      const response = await fetch(
        `https://router.huggingface.co/hf-inference/models/${model}/pipeline/feature-extraction`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputs: ['toolnet memory test'] }),
        }
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    } else if (provider === 'gemini') {
      if (!apiKey) throw new Error('API key is missing');
      baseUrl = baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
      const normalizedModel = model.replace(/^models\//, '');
      const response = await fetch(
        `${baseUrl}/models/${encodeURIComponent(normalizedModel)}:embedContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            model: `models/${normalizedModel}`,
            content: { parts: [{ text: 'toolnet memory test' }] },
          }),
        }
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    } else {
      if (!baseUrl) throw new Error('Base URL is missing');
      const response = await fetch(`${normalizeEndpoint(baseUrl)}/embeddings`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({ model, input: ['toolnet memory test'] }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    console.log('✓ Embedding ready');
    return true;
  } catch (error) {
    console.log(`✗ ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

async function embeddingWizard(rl: readline.Interface, values: Values): Promise<boolean> {
  const original = new Map(values);
  while (true) {
    const current = EMBEDDING_PROVIDERS.findIndex(
      (item) => item.id === (values.get('TOOLNET_EMBEDDING_PROVIDER') || 'local')
    );
    console.log('');
    const definition = await choose(rl, 'Embedding', EMBEDDING_PROVIDERS, current >= 0 ? current : 0);
    if (!definition) return false;

    if (values.get('TOOLNET_EMBEDDING_PROVIDER') !== definition.id) clearEmbedding(values);
    values.set('TOOLNET_EMBEDDING_PROVIDER', definition.id);

    if (definition.id === 'local') {
      clearEmbedding(values);
      save(values);
      console.log('');
      console.log('✓ Local / Hash selected — no API key required');
      return true;
    }

    console.log('');
    console.log(definition.label);
    console.log('────────────────────────────────────────');

    if (definition.accountIdRequired) {
      const existing = values.get('TOOLNET_EMBEDDING_ACCOUNT_ID');
      const account = await rl.question(existing ? `Account ID [${existing}]: ` : 'Account ID: ');
      setIfEntered(values, 'TOOLNET_EMBEDDING_ACCOUNT_ID', account);
    } else {
      values.delete('TOOLNET_EMBEDDING_ACCOUNT_ID');
    }

    const existingKey = values.get('TOOLNET_EMBEDDING_API_KEY');
    if (definition.apiKeyRequired || definition.id === 'custom') {
      const key = await secretQuestion(
        rl,
        existingKey
          ? 'API key [configured, Enter = keep]: '
          : definition.apiKeyRequired
            ? 'API key: '
            : 'API key [optional]: '
      );
      if (key.trim()) values.set('TOOLNET_EMBEDDING_API_KEY', key.trim());
    } else {
      values.delete('TOOLNET_EMBEDDING_API_KEY');
    }

    if (definition.id === 'cloudflare') {
      const account = values.get('TOOLNET_EMBEDDING_ACCOUNT_ID');
      if (account) values.set('TOOLNET_EMBEDDING_BASE_URL', `https://api.cloudflare.com/client/v4/accounts/${account}/ai/v1`);
    } else {
      const existing = values.get('TOOLNET_EMBEDDING_BASE_URL');
      const fallback = existing || definition.baseUrl || '';
      const entered = await rl.question(fallback ? `Base URL [${fallback}]: ` : 'Base URL: ');
      const resolved = entered.trim() || fallback;
      if (resolved) values.set('TOOLNET_EMBEDDING_BASE_URL', normalizeEndpoint(resolved));
    }

    const currentModel = values.get('TOOLNET_EMBEDDING_MODEL');
    const suggested = currentModel || definition.model || '';
    const model = await rl.question(suggested ? `Model [${suggested}]: ` : 'Model: ');
    const resolvedModel = model.trim() || suggested;
    if (resolvedModel) values.set('TOOLNET_EMBEDDING_MODEL', resolvedModel);

    console.log('');
    const ok = await testEmbedding(values);
    if (ok) {
      save(values);
      console.log('✓ Embedding saved');
      return true;
    }

    console.log('');
    console.log('  1. Retry');
    console.log('  2. Choose another provider');
    console.log('  3. Save anyway (advanced)');
    console.log('  0. Cancel');
    const action = (await rl.question('Choose [1]: ')).trim() || '1';
    if (action === '3') {
      save(values);
      return true;
    }
    if (action === '2') continue;
    if (action === '0') {
      values.clear();
      for (const [key, value] of original) values.set(key, value);
      return false;
    }
  }
}

async function testS3(options: {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
}): Promise<boolean> {
  const client = new S3Client({
    region: options.region,
    endpoint: options.endpoint || undefined,
    forcePathStyle: options.forcePathStyle ?? false,
    credentials: { accessKeyId: options.accessKeyId, secretAccessKey: options.secretAccessKey },
  });
  try {
    await client.send(new HeadBucketCommand({ Bucket: options.bucket }));
    return true;
  } catch (error) {
    console.log(`✗ ${error instanceof Error ? error.message : String(error)}`);
    return false;
  } finally {
    client.destroy();
  }
}

async function storageWizard(rl: readline.Interface, values: Values): Promise<boolean> {
  const items = [
    { id: 'huggingface' as const, label: 'Hugging Face S3' },
    { id: 'r2' as const, label: 'Cloudflare R2' },
    { id: 's3' as const, label: 'S3 / S3-compatible' },
    { id: 'local' as const, label: 'Local' },
  ];
  const current = items.findIndex((item) => item.id === currentStorage(values));
  console.log('');
  const selected = await choose(rl, 'Storage', items, current >= 0 ? current : undefined);
  if (!selected) return false;
  values.set('MEMORY_STORAGE_PROVIDER', selected.id);

  console.log('');
  console.log(selected.label);
  console.log('────────────────────────────────────────');

  if (selected.id === 'local') {
    const fallback = values.get('MEMORY_LOCAL_STORAGE_PATH') || path.join(os.homedir(), '.local', 'share', 'toolnet-memory');
    const entered = await rl.question(`Path [${fallback}]: `);
    values.set('MEMORY_LOCAL_STORAGE_PATH', entered.trim() || fallback);
    save(values);
    console.log('✓ Local storage saved');
    return true;
  }

  if (selected.id === 'r2') {
    const account = await rl.question(`Account ID [${values.get('R2_ACCOUNT_ID') || ''}]: `);
    setIfEntered(values, 'R2_ACCOUNT_ID', account);
    const bucket = await rl.question(`Bucket [${values.get('R2_BUCKET') || 'toolnet-memory'}]: `);
    setIfEntered(values, 'R2_BUCKET', bucket, 'toolnet-memory');
    const access = await rl.question(`Access key ID [${values.get('R2_ACCESS_KEY_ID') ? 'configured' : ''}]: `);
    setIfEntered(values, 'R2_ACCESS_KEY_ID', access);
    const secret = await secretQuestion(rl, values.get('R2_SECRET_ACCESS_KEY') ? 'Secret access key [configured, Enter = keep]: ' : 'Secret access key: ');
    if (secret.trim()) values.set('R2_SECRET_ACCESS_KEY', secret.trim());
    const ok = await testS3({
      endpoint: values.get('R2_ACCOUNT_ID') ? `https://${values.get('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com` : undefined,
      region: 'auto',
      bucket: values.get('R2_BUCKET') || 'toolnet-memory',
      accessKeyId: values.get('R2_ACCESS_KEY_ID') || '',
      secretAccessKey: values.get('R2_SECRET_ACCESS_KEY') || '',
    });
    if (!ok) return false;
  } else if (selected.id === 's3') {
    const endpoint = await rl.question(`Endpoint [${values.get('S3_ENDPOINT') || 'AWS default'}]: `);
    if (endpoint.trim()) values.set('S3_ENDPOINT', normalizeEndpoint(endpoint));
    const region = await rl.question(`Region [${values.get('S3_REGION') || 'us-east-1'}]: `);
    setIfEntered(values, 'S3_REGION', region, 'us-east-1');
    const bucket = await rl.question(`Bucket [${values.get('S3_BUCKET') || 'toolnet-memory'}]: `);
    setIfEntered(values, 'S3_BUCKET', bucket, 'toolnet-memory');
    const access = await rl.question(`Access key ID [${values.get('S3_ACCESS_KEY_ID') ? 'configured' : ''}]: `);
    setIfEntered(values, 'S3_ACCESS_KEY_ID', access);
    const secret = await secretQuestion(rl, values.get('S3_SECRET_ACCESS_KEY') ? 'Secret access key [configured, Enter = keep]: ' : 'Secret access key: ');
    if (secret.trim()) values.set('S3_SECRET_ACCESS_KEY', secret.trim());
    const ok = await testS3({
      endpoint: values.get('S3_ENDPOINT') || undefined,
      region: values.get('S3_REGION') || 'us-east-1',
      bucket: values.get('S3_BUCKET') || 'toolnet-memory',
      accessKeyId: values.get('S3_ACCESS_KEY_ID') || '',
      secretAccessKey: values.get('S3_SECRET_ACCESS_KEY') || '',
      forcePathStyle: values.get('S3_FORCE_PATH_STYLE') === 'true',
    });
    if (!ok) return false;
  } else {
    const namespace = await rl.question(`Namespace [${values.get('HF_NAMESPACE') || ''}]: `);
    setIfEntered(values, 'HF_NAMESPACE', namespace);
    const bucket = await rl.question(`Bucket [${values.get('HF_BUCKET') || 'toolnet-memory'}]: `);
    setIfEntered(values, 'HF_BUCKET', bucket, 'toolnet-memory');
    const url = await rl.question(`S3 endpoint [${values.get('HF_URL') || ''}]: `);
    setIfEntered(values, 'HF_URL', url);
    const access = await rl.question(`Access key ID [${values.get('HF_S3_ACCESS_KEY_ID') ? 'configured' : ''}]: `);
    setIfEntered(values, 'HF_S3_ACCESS_KEY_ID', access);
    const secret = await secretQuestion(rl, values.get('HF_S3_SECRET_ACCESS_KEY') ? 'Secret access key [configured, Enter = keep]: ' : 'Secret access key: ');
    if (secret.trim()) values.set('HF_S3_SECRET_ACCESS_KEY', secret.trim());
    const ok = await testS3({
      endpoint: values.get('HF_URL') || undefined,
      region: 'us-east-1',
      bucket: values.get('HF_BUCKET') || 'toolnet-memory',
      accessKeyId: values.get('HF_S3_ACCESS_KEY_ID') || '',
      secretAccessKey: values.get('HF_S3_SECRET_ACCESS_KEY') || '',
      forcePathStyle: true,
    });
    if (!ok) return false;
  }

  save(values);
  console.log('✓ Storage saved');
  return true;
}

function integrations(): void {
  console.log('');
  console.log('Agent integrations');
  console.log('────────────────────────────────────────');
  try {
    const results = installAutoIntegrations();
    if (!results.length) {
      console.log('No supported coding agents detected.');
      return;
    }
    for (const result of results) {
      const state = result.installed ? '✓' : '·';
      console.log(`${state} ${result.agent}`);
    }
  } catch (error) {
    console.log(`⚠ ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function health(values: Values): Promise<boolean> {
  console.log('');
  console.log('Health check');
  console.log('────────────────────────────────────────');
  const llm = await testLlm(values, true);
  console.log(`LLM        ${llm ? '✓ ready' : '✗ needs attention'}`);
  const embedding = await testEmbedding(values);
  console.log(`Embedding  ${embedding ? '✓ ready' : '✗ needs attention'}`);
  console.log(`Storage    ${labelStorage(currentStorage(values))}`);
  console.log('');
  return llm && embedding;
}

async function configuredMenu(rl: readline.Interface, values: Values): Promise<void> {
  while (true) {
    header('Configure');
    status(values);
    console.log('  1. Model');
    console.log('  2. Embedding');
    console.log('  3. Storage');
    console.log('  4. Agent integrations');
    console.log('  5. Health check');
    console.log('  0. Done');
    console.log('');
    const answer = (await rl.question('Choose: ')).trim();
    if (answer === '0') return;
    if (answer === '1') await modelWizard(rl, values);
    else if (answer === '2') await embeddingWizard(rl, values);
    else if (answer === '3') await storageWizard(rl, values);
    else if (answer === '4') integrations();
    else if (answer === '5') await health(values);
  }
}

function parseSection(args: string[]): Section | undefined {
  const index = args.indexOf('--section');
  const value = index >= 0 ? args[index + 1] : undefined;
  if (value === 'model' || value === 'embedding' || value === 'storage' || value === 'integrations' || value === 'health') return value;
  return undefined;
}

async function runSection(rl: readline.Interface, values: Values, section: Section): Promise<void> {
  if (section === 'model') await modelWizard(rl, values);
  else if (section === 'embedding') await embeddingWizard(rl, values);
  else if (section === 'storage') await storageWizard(rl, values);
  else if (section === 'integrations') integrations();
  else await health(values);
}

async function firstRun(rl: readline.Interface, values: Values): Promise<void> {
  header('Welcome');
  console.log('Inference first. ToolNet saves a model only after a live check succeeds.');
  console.log('');
  const modelOk = await modelWizard(rl, values);
  if (!modelOk) return;

  if (!values.get('TOOLNET_EMBEDDING_PROVIDER')) {
    values.set('TOOLNET_EMBEDDING_PROVIDER', 'local');
    clearEmbedding(values);
    save(values);
    console.log('');
    console.log('✓ Embedding — Local / Hash (recommended default)');
  }

  if (!values.get('MEMORY_STORAGE_PROVIDER')) {
    values.set('MEMORY_STORAGE_PROVIDER', 'local');
  }

  integrations();
  await health(values);
  save(values);

  console.log('Setup complete.');
  console.log(`Config: ${ENV_FILE}`);
  console.log('Next: toolnet-memory init');
}

async function existingRun(rl: readline.Interface, values: Values): Promise<void> {
  header('Setup');
  status(values);

  if (values.get('TOOLNET_LLM_PROVIDER') && values.get('TOOLNET_LLM_MODEL')) {
    process.stdout.write('Checking current model... ');
    const ok = await testLlm(values, true);
    console.log(ok ? '✓' : '✗');
    console.log('');
  }

  console.log('  1. Keep current & run health check');
  console.log('  2. Change model');
  console.log('  3. Change embedding');
  console.log('  4. Change storage');
  console.log('  5. Configure everything');
  console.log('  0. Exit');
  console.log('');
  const answer = (await rl.question('Choose [1]: ')).trim() || '1';
  if (answer === '0') return;
  if (answer === '1') await health(values);
  else if (answer === '2') await modelWizard(rl, values);
  else if (answer === '3') await embeddingWizard(rl, values);
  else if (answer === '4') await storageWizard(rl, values);
  else await configuredMenu(rl, values);
  save(values);
}

async function main(): Promise<void> {
  const exists = fs.existsSync(ENV_FILE);
  const values = exists ? parseEnv(fs.readFileSync(ENV_FILE, 'utf8')) : new Map<string, string>();
  migrateLegacy(values);
  applyDefaults(values);

  const args = process.argv.slice(2).filter((arg) => arg !== 'setup');
  const section = parseSection(args);

  if (!input.isTTY || !output.isTTY) {
    if (!exists) save(values);
    console.log(`ToolNet Memory config: ${ENV_FILE}`);
    console.log('Run `toolnet-memory setup` in an interactive terminal.');
    return;
  }

  const rl = readline.createInterface({ input, output });
  try {
    if (section) {
      header(`Configure ${section}`);
      await runSection(rl, values, section);
      save(values);
      return;
    }

    const configured = Boolean(values.get('TOOLNET_LLM_PROVIDER') && values.get('TOOLNET_LLM_MODEL'));
    if (!exists || !configured) await firstRun(rl, values);
    else await existingRun(rl, values);
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
