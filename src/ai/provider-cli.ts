import 'dotenv/config';

import { loadAiConfig } from './config.js';

import { createAiProvider } from './factory.js';

import { AI_PROVIDER_DEFINITIONS } from './registry.js';

import { createEmbeddingProvider } from '../embeddings/index.js';

import { CliProgress } from '../production/cli-progress.js';

function masked(value: string | undefined): string {
  if (!value) {
    return 'not configured';
  }

  if (value.length <= 8) {
    return '********';
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function printList(): void {
  console.log('');
  console.log('ToolNet AI Providers');
  console.log('====================');
  console.log('');

  for (const provider of AI_PROVIDER_DEFINITIONS) {
    console.log(`- ${provider.label}`);

    console.log(`  id       : ${provider.id}`);

    console.log(`  protocol : ${provider.transport}`);

    if (provider.defaultBaseUrl) {
      console.log(`  base URL : ${provider.defaultBaseUrl}`);
    }

    if (provider.defaultModel) {
      console.log(`  model    : ${provider.defaultModel}`);
    }

    console.log('');
  }

  console.log('- Local / Hash embedding');

  console.log('  id       : local');

  console.log('  protocol : local');

  console.log('');
}

function printStatus(): void {
  const config = loadAiConfig();

  console.log('');
  console.log('◇ ToolNet AI Providers');
  console.log('');
  console.log('◆ Configuration');
  console.log('│');
  console.log(`├ ◆ LLM       — ${config.llm.provider}`);
  console.log(`│  Model      — ${config.llm.model ?? 'not configured'}`);
  console.log(`│  Base URL   — ${config.llm.baseUrl ?? 'default/provider native'}`);
  console.log(`│  API Key    — ${masked(config.llm.apiKey)}`);

  if (config.llm.accountId) {
    console.log(`│  Account    — ${config.llm.accountId}`);
  }

  console.log(`│  Legacy     — ${config.legacy.llm ? 'yes' : 'no'}`);
  console.log('│');

  console.log(`├ ◆ Embedding — ${config.embedding.provider}`);
  console.log(
    `│  Model      — ${
      config.embedding.model ??
      (config.embedding.provider === 'local' ? 'local hash' : 'not configured')
    }`
  );
  console.log(
    `│  Base URL   — ${
      config.embedding.baseUrl ??
      (config.embedding.provider === 'local' ? 'local' : 'default/provider native')
    }`
  );
  console.log(
    `│  API Key    — ${
      config.embedding.provider === 'local' ? 'not required' : masked(config.embedding.apiKey)
    }`
  );

  if (config.embedding.accountId) {
    console.log(`│  Account    — ${config.embedding.accountId}`);
  }

  console.log(`│  Legacy     — ${config.legacy.embedding ? 'yes' : 'no'}`);
  console.log('│');
  console.log('└ ◆ Configuration loaded');
  console.log('');
}

async function testLlm(): Promise<boolean> {
  const config = loadAiConfig().llm;

  const progress = new CliProgress(`Testing LLM — ${config.provider}`, {
    stream: process.stdout,
    display: 'bar',
    intervalMs: 180,
  }).start();

  try {
    const provider = createAiProvider({
      id: config.provider,
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      model: config.model,
      accountId: config.accountId,
    });

    const result = await provider.healthCheck();

    if (!result.ok) {
      progress.fail(`LLM — ${result.message}`);

      return false;
    }

    const details = [
      config.provider,
      result.model ?? config.model,
      result.latencyMs !== undefined ? `${result.latencyMs}ms` : undefined,
    ].filter(Boolean);

    progress.succeed(`LLM — ${details.join(' · ')}`);

    return true;
  } catch (error) {
    progress.fail(`LLM — ${error instanceof Error ? error.message : String(error)}`);

    return false;
  }
}

async function testEmbedding(): Promise<boolean> {
  const config = loadAiConfig().embedding;

  const progress = new CliProgress(`Testing embedding — ${config.provider}`, {
    stream: process.stdout,
    display: 'bar',
    intervalMs: 180,
  }).start();

  try {
    const provider = createEmbeddingProvider();

    const startedAt = Date.now();

    const vector = await provider.embed('ToolNet Memory provider health check');

    const latencyMs = Date.now() - startedAt;

    if (!Array.isArray(vector) || vector.length === 0) {
      throw new Error('Empty embedding vector');
    }

    progress.succeed(`Embedding — ${config.provider} · ${vector.length}d · ${latencyMs}ms`);

    return true;
  } catch (error) {
    progress.fail(`Embedding — ${error instanceof Error ? error.message : String(error)}`);

    return false;
  }
}

async function testAll(): Promise<boolean> {
  console.log('');
  console.log('◇ ToolNet AI Providers');
  console.log('');
  console.log('◆ Health check');
  console.log('│');

  const llm = await testLlm();
  const embedding = await testEmbedding();

  console.log('│');

  if (llm && embedding) {
    console.log('└ ◆ Providers ready');
  } else {
    console.log('└ ✗ Provider check failed');
  }

  console.log('');

  return llm && embedding;
}

async function main(): Promise<void> {
  const command = process.argv[2] ?? 'status';

  if (command === 'list') {
    printList();
    return;
  }

  if (command === 'status') {
    printStatus();
    return;
  }

  if (command === 'test') {
    const target = process.argv[3] ?? 'all';

    let ok = false;

    if (target === 'llm') {
      ok = await testLlm();
    } else if (target === 'embedding') {
      ok = await testEmbedding();
    } else {
      ok = await testAll();
    }

    process.exitCode = ok ? 0 : 1;

    return;
  }

  console.error(`Unknown provider command: ${command}`);

  console.error('');

  console.error('Usage:');

  console.error('  toolnet-memory provider:list');

  console.error('  toolnet-memory provider:status');

  console.error('  toolnet-memory provider:test');

  console.error('  toolnet-memory provider:test llm');

  console.error('  toolnet-memory provider:test embedding');

  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));

  process.exitCode = 1;
});
