import 'dotenv/config';

import { loadConfig, ProjectManager } from '../core/index.js';

import {
  createStorageProvider,
  withStorageRetry,
  MemoryStore,
  PersistentCodeGraphStore,
  PersistentVectorStore,
  PersistentCodeChunkStore,
  PersistentCodeVectorStore,
} from '../storage/index.js';

import { createEmbeddingProvider } from '../embeddings/index.js';

import { loadAiConfig } from '../ai/config.js';

import { createAiProvider } from '../ai/factory.js';

import { SnapshotManager } from '../snapshot/index.js';

import { checkProductionConfig } from './config-check.js';

import { ProductionHealth } from './health.js';

type DoctorResult = {
  ok: boolean;
  project?: string;

  storage?: {
    ok: boolean;
    provider?: string;
  } | null;

  llm?: {
    ok: boolean;
    provider?: string;
    model?: string;
    latencyMs?: number;
    error?: string;
  } | null;

  embedding?: {
    ok: boolean;
    dimensions?: number;
    mode?: string;
  } | null;

  memory?: number;
  graphSymbols?: number;
  graphEdges?: number;
  memoryVectors?: number;
  codeChunks?: number;
  codeVectors?: number;
  snapshots?: number;

  config?: {
    ok: boolean;
    errors?: string[];
    warnings?: string[];
  };

  warnings?: string[];
};

function wantsJson(): boolean {
  return process.argv.includes('--json');
}

function printHuman(result: DoctorResult): void {
  console.log('');
  console.log('ToolNet Memory Doctor');
  console.log('=====================');
  console.log('');

  if (result.project) {
    console.log(`Project: ${result.project}`);
    console.log('');
  }

  if (result.storage) {
    if (result.storage.ok) {
      const provider =
        typeof result.storage.provider === 'string' ? ` (${result.storage.provider})` : '';

      console.log(`✓ Storage${provider}`);
    } else {
      console.log('✗ Storage');
    }
  }

  if (result.llm) {
    if (result.llm.ok) {
      const details: string[] = [];

      if (result.llm.provider) {
        details.push(result.llm.provider);
      }

      if (result.llm.model) {
        details.push(result.llm.model);
      }

      if (typeof result.llm.latencyMs === 'number') {
        details.push(`${result.llm.latencyMs} ms`);
      }

      console.log(`✓ LLM${details.length ? ` (${details.join(', ')})` : ''}`);
    } else {
      console.log(`✗ LLM${result.llm.error ? ` (${result.llm.error})` : ''}`);
    }
  }

  if (result.embedding) {
    if (result.embedding.ok) {
      const details: string[] = [];

      if (typeof result.embedding.mode === 'string') {
        details.push(result.embedding.mode);
      }

      if (typeof result.embedding.dimensions === 'number') {
        details.push(`${result.embedding.dimensions} dimensions`);
      }

      console.log(`✓ Embedding${details.length ? ` (${details.join(', ')})` : ''}`);
    } else {
      console.log('✗ Embedding');
    }
  }

  if (
    result.memory !== undefined ||
    result.graphSymbols !== undefined ||
    result.codeChunks !== undefined
  ) {
    console.log('');
    console.log('Project data:');

    if (result.memory !== undefined) {
      console.log(`  Memories       ${result.memory}`);
    }

    if (result.graphSymbols !== undefined) {
      console.log(`  Graph symbols  ${result.graphSymbols}`);
    }

    if (result.graphEdges !== undefined) {
      console.log(`  Graph edges    ${result.graphEdges}`);
    }

    if (result.memoryVectors !== undefined) {
      console.log(`  Memory vectors ${result.memoryVectors}`);
    }

    if (result.codeChunks !== undefined) {
      console.log(`  Code chunks    ${result.codeChunks}`);
    }

    if (result.codeVectors !== undefined) {
      console.log(`  Code vectors   ${result.codeVectors}`);
    }

    if (result.snapshots !== undefined) {
      console.log(`  Snapshots      ${result.snapshots}`);
    }
  }

  const errors = result.config?.errors ?? [];

  if (errors.length > 0) {
    console.log('');
    console.log('Configuration required:');

    for (const error of errors) {
      console.log(`  - ${error}`);
    }
  }

  const warnings = [...(result.config?.warnings ?? []), ...(result.warnings ?? [])];

  const uniqueWarnings = [...new Set(warnings)];

  if (uniqueWarnings.length > 0) {
    console.log('');
    console.log('Warnings:');

    for (const warning of uniqueWarnings) {
      console.log(`  - ${warning}`);
    }
  }

  console.log('');

  if (result.ok) {
    console.log('✓ ToolNet Memory is ready');
  } else {
    console.log('✗ ToolNet Memory requires attention');

    if (errors.length > 0) {
      console.log('');
      console.log('Run:');
      console.log('  toolnet-memory setup');
    }
  }

  console.log('');
}

function output(result: DoctorResult): void {
  if (wantsJson()) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printHuman(result);
  }
}

async function main(): Promise<void> {
  const configCheck = checkProductionConfig();

  if (!configCheck.ok) {
    const result: DoctorResult = {
      ok: false,
      config: configCheck,
      warnings: configCheck.warnings,
    };

    output(result);

    process.exitCode = 1;
    return;
  }

  const config = loadConfig();

  const project = new ProjectManager().detect();

  const storage = withStorageRetry(
    createStorageProvider({
      provider: config.storage.provider,
      r2: config.storage.r2,
      s3: config.storage.s3,
      huggingface: config.storage.huggingface,
      localRoot: config.storage.localRoot,
    }),
    {
      attempts: 3,
    }
  );

  const embeddings = createEmbeddingProvider();

  const aiConfig = loadAiConfig();

  let llmHealth: DoctorResult['llm'];

  try {
    const provider = createAiProvider({
      id: aiConfig.llm.provider,

      apiKey: aiConfig.llm.apiKey,

      baseUrl: aiConfig.llm.baseUrl,

      model: aiConfig.llm.model,

      accountId: aiConfig.llm.accountId,
    });

    const result = await provider.healthCheck();

    llmHealth = {
      ok: result.ok,
      provider: aiConfig.llm.provider,
      model: result.model ?? aiConfig.llm.model,
      latencyMs: result.latencyMs,
      error: result.ok ? undefined : result.message,
    };
  } catch (error) {
    llmHealth = {
      ok: false,
      provider: aiConfig.llm.provider,
      model: aiConfig.llm.model,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  const health = await new ProductionHealth(storage, embeddings).run();

  const memories = await new MemoryStore(storage).load(project.id);

  const graph = await new PersistentCodeGraphStore(storage).load(project.id);

  const vectors = await new PersistentVectorStore(storage).load(project.id);

  const chunks = await new PersistentCodeChunkStore(storage).load(project.id);

  const codeVectors = await new PersistentCodeVectorStore(storage).load(project.id);

  const snapshots = await new SnapshotManager(storage).list(project.id);

  const result: DoctorResult = {
    ok: health.ok && Boolean(llmHealth?.ok),
    project: project.name,
    storage: health.storage,
    llm: llmHealth,
    embedding: health.embedding,
    memory: memories.length,
    graphSymbols: graph?.symbols.length ?? 0,
    graphEdges: graph?.edges.length ?? 0,
    memoryVectors: vectors?.records.length ?? 0,
    codeChunks: chunks?.chunks.length ?? 0,
    codeVectors: codeVectors?.records.length ?? 0,
    snapshots: snapshots.length,
    warnings: configCheck.warnings,
  };

  output(result);

  process.exitCode = result.ok ? 0 : 1;
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);

  if (wantsJson()) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          error: message,
        },
        null,
        2
      )
    );
  } else {
    console.error('');
    console.error('ToolNet Memory Doctor');
    console.error('=====================');
    console.error('');
    console.error(`✗ ${message}`);
    console.error('');
  }

  process.exitCode = 1;
});
