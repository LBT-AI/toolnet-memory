import 'dotenv/config';

import { loadAiConfig } from './config.js';

import { createAiProvider } from './factory.js';

import { AI_PROVIDER_DEFINITIONS } from './registry.js';

import { createEmbeddingProvider } from '../embeddings/index.js';

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
  console.log('ToolNet Provider Status');

  console.log('=======================');

  console.log('');

  console.log('LLM');

  console.log(`  Provider : ${config.llm.provider}`);

  console.log(`  Model    : ${config.llm.model ?? 'not configured'}`);

  console.log(`  Base URL : ${config.llm.baseUrl ?? 'default/provider native'}`);

  console.log(`  API Key  : ${masked(config.llm.apiKey)}`);

  if (config.llm.accountId) {
    console.log(`  Account  : ${config.llm.accountId}`);
  }

  console.log(`  Legacy   : ${config.legacy.llm ? 'yes' : 'no'}`);

  console.log('');

  console.log('Embedding');

  console.log(`  Provider : ${config.embedding.provider}`);

  console.log(
    `  Model    : ${
      config.embedding.model ??
      (config.embedding.provider === 'local' ? 'local hash' : 'not configured')
    }`
  );

  console.log(
    `  Base URL : ${
      config.embedding.baseUrl ??
      (config.embedding.provider === 'local' ? 'local' : 'default/provider native')
    }`
  );

  console.log(
    `  API Key  : ${
      config.embedding.provider === 'local' ? 'not required' : masked(config.embedding.apiKey)
    }`
  );

  if (config.embedding.accountId) {
    console.log(`  Account  : ${config.embedding.accountId}`);
  }

  console.log(`  Legacy   : ${config.legacy.embedding ? 'yes' : 'no'}`);

  console.log('');
}

async function testLlm(): Promise<boolean> {
  const config = loadAiConfig().llm;

  console.log('');
  console.log('Testing LLM');
  console.log('-----------');

  console.log(`Provider : ${config.provider}`);

  console.log(`Model    : ${config.model ?? 'not configured'}`);

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
      console.log(`✗ ${result.message}`);

      return false;
    }

    console.log(`✓ Provider reachable`);

    if (result.latencyMs !== undefined) {
      console.log(`✓ Latency: ${result.latencyMs} ms`);
    }

    console.log('');
    return true;
  } catch (error) {
    console.log(`✗ ${error instanceof Error ? error.message : String(error)}`);

    console.log('');
    return false;
  }
}

async function testEmbedding(): Promise<boolean> {
  const config = loadAiConfig().embedding;

  console.log('');
  console.log('Testing Embedding');

  console.log('-----------------');

  console.log(`Provider : ${config.provider}`);

  console.log(
    `Model    : ${config.model ?? (config.provider === 'local' ? 'local hash' : 'not configured')}`
  );

  try {
    const provider = createEmbeddingProvider();

    const vector = await provider.embed('ToolNet Memory provider health check');

    if (!Array.isArray(vector) || vector.length === 0) {
      throw new Error('Empty embedding vector');
    }

    console.log('✓ Embedding ready');

    console.log(`✓ Dimensions: ${vector.length}`);

    console.log('');
    return true;
  } catch (error) {
    console.log(`✗ ${error instanceof Error ? error.message : String(error)}`);

    console.log('');
    return false;
  }
}

async function testAll(): Promise<boolean> {
  const llm = await testLlm();

  const embedding = await testEmbedding();

  console.log('');
  console.log('Provider Test Summary');

  console.log('=====================');

  console.log(`LLM       : ${llm ? 'READY' : 'FAILED'}`);

  console.log(`Embedding : ${embedding ? 'READY' : 'FAILED'}`);

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
