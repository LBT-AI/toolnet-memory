import 'dotenv/config';

import { loadConfig, ProjectManager } from '../core/index.js';

import {
  createStorageProvider,
  withStorageRetry,
  ProjectScopedStorageProvider,
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

import {
  inspectSessionCaptureHealth,
  type SessionCaptureHealth,
} from './session-capture-health.js';

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

  capture?: SessionCaptureHealth;

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
  const colorEnabled =
    process.stdout.isTTY === true &&
    process.env.TERM !== 'dumb' &&
    process.env.NO_COLOR === undefined;

  const color = (code: string, value: string): string =>
    colorEnabled ? `\x1b[${code}m${value}\x1b[0m` : value;

  const green = (value: string): string => color('38;5;82', value);
  const cyan = (value: string): string => color('38;5;51', value);
  const amber = (value: string): string => color('38;5;214', value);
  const red = (value: string): string => color('38;5;196', value);
  const white = (value: string): string => color('38;5;255', value);
  const dim = (value: string): string => color('2', value);
  const bold = (value: string): string => color('1', value);

  const pipe = dim('│');
  const branch = dim('├');

  console.log('');
  console.log(`${cyan('◇')} ${bold(white('ToolNet Memory Doctor'))}`);
  console.log('');

  if (result.project) {
    console.log(`${green('◆')} Project    ${white(result.project)}`);
  }

  console.log(pipe);

  if (result.storage) {
    const provider =
      typeof result.storage.provider === 'string' ? ` — ${result.storage.provider}` : '';

    if (result.storage.ok) {
      console.log(`${branch} ${green('◆')} Storage${provider}`);
    } else {
      console.log(`${branch} ${red('✗')} Storage${provider}`);
    }
  }

  if (result.llm) {
    const details: string[] = [];

    if (result.llm.provider) {
      details.push(result.llm.provider);
    }

    if (result.llm.model) {
      details.push(result.llm.model);
    }

    if (typeof result.llm.latencyMs === 'number') {
      details.push(`${result.llm.latencyMs}ms`);
    }

    if (result.llm.ok) {
      console.log(
        `${branch} ${green('◆')} LLM${details.length ? ` — ${details.join(' · ')}` : ''}`
      );
    } else {
      const error = result.llm.error ? ` — ${result.llm.error}` : '';

      console.log(`${branch} ${red('✗')} LLM${error}`);
    }
  }

  if (result.embedding) {
    const details: string[] = [];

    if (typeof result.embedding.mode === 'string') {
      details.push(result.embedding.mode);
    }

    if (typeof result.embedding.dimensions === 'number') {
      details.push(`${result.embedding.dimensions}d`);
    }

    if (result.embedding.ok) {
      console.log(
        `${branch} ${green('◆')} Embedding${details.length ? ` — ${details.join(' · ')}` : ''}`
      );
    } else {
      console.log(`${branch} ${red('✗')} Embedding`);
    }
  }

  if (
    result.memory !== undefined ||
    result.graphSymbols !== undefined ||
    result.codeChunks !== undefined
  ) {
    console.log(pipe);
    console.log(`${cyan('◇')} ${white('Project data')}`);

    if (result.memory !== undefined) {
      console.log(`${branch} ${dim('Memories')}       ${white(String(result.memory))}`);
    }

    if (result.graphSymbols !== undefined) {
      console.log(`${branch} ${dim('Graph symbols')}  ${white(String(result.graphSymbols))}`);
    }

    if (result.graphEdges !== undefined) {
      console.log(`${branch} ${dim('Graph edges')}    ${white(String(result.graphEdges))}`);
    }

    if (result.memoryVectors !== undefined) {
      console.log(`${branch} ${dim('Memory vectors')} ${white(String(result.memoryVectors))}`);
    }

    if (result.codeChunks !== undefined) {
      console.log(`${branch} ${dim('Code chunks')}    ${white(String(result.codeChunks))}`);
    }

    if (result.codeVectors !== undefined) {
      console.log(`${branch} ${dim('Code vectors')}   ${white(String(result.codeVectors))}`);
    }

    if (result.snapshots !== undefined) {
      console.log(`${branch} ${dim('Snapshots')}      ${white(String(result.snapshots))}`);
    }
  }

  if (result.capture) {
    console.log(pipe);
    console.log(`${cyan('◇')} ${white('Session continuity')}`);

    console.log(
      `${branch} ${dim('Agents')}         ${white(
        result.capture.agents.length ? result.capture.agents.join(', ') : 'none'
      )}`
    );

    if (result.capture.latestAgent) {
      console.log(
        `${branch} ${dim('Latest agent')}   ${white(String(result.capture.latestAgent))}`
      );
    }

    if (result.capture.currentTask) {
      console.log(`${branch} ${dim('Current task')}   ${white(result.capture.currentTask)}`);
    }

    if (result.capture.currentFile) {
      console.log(`${branch} ${dim('Current file')}   ${white(result.capture.currentFile)}`);
    }

    if (result.capture.lastCaptureAt) {
      console.log(`${branch} ${dim('Last capture')}  ${white(result.capture.lastCaptureAt)}`);
    }

    if (result.capture.lastFlushAt) {
      console.log(`${branch} ${dim('Last flush')}    ${white(result.capture.lastFlushAt)}`);
    }

    console.log(`${branch} ${dim('Pending WAL')}   ${white(String(result.capture.pendingWal))}`);

    const sync =
      result.capture.syncHealth === 'healthy'
        ? green(result.capture.syncHealth)
        : result.capture.syncHealth === 'degraded'
          ? red(result.capture.syncHealth)
          : amber(result.capture.syncHealth);

    console.log(`${branch} ${dim('Sync health')}   ${sync}`);
  }

  const errors = result.config?.errors ?? [];

  if (errors.length > 0) {
    console.log(pipe);
    console.log(`${red('✗')} ${white('Configuration required')}`);

    for (const error of errors) {
      console.log(`${branch} ${red('•')} ${error}`);
    }
  }

  const warnings = [...(result.config?.warnings ?? []), ...(result.warnings ?? [])];
  const uniqueWarnings = [...new Set(warnings)];

  if (uniqueWarnings.length > 0) {
    console.log(pipe);
    console.log(`${amber('◇')} ${white('Warnings')}`);

    for (const warning of uniqueWarnings) {
      console.log(`${branch} ${amber('!')} ${warning}`);
    }
  }

  console.log(pipe);

  if (result.ok) {
    console.log(`${green('└ ◆')} ${bold(white('ToolNet Memory is ready'))}`);
  } else {
    console.log(`${red('└ ✗')} ${bold(white('ToolNet Memory requires attention'))}`);

    if (errors.length > 0) {
      console.log(dim('    Run: toolnet-memory setup'));
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

  const rawStorage = withStorageRetry(
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

  const storage = new ProjectScopedStorageProvider(
    rawStorage,
    project.id,
    project.name,
    project.remote ?? project.name
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

  const health = await new ProductionHealth(rawStorage, embeddings).run();

  const memories = await new MemoryStore(storage).load(project.id);

  const graph = await new PersistentCodeGraphStore(storage).load(project.id);

  const vectors = await new PersistentVectorStore(storage).load(project.id);

  const chunks = await new PersistentCodeChunkStore(storage).load(project.id);

  const codeVectors = await new PersistentCodeVectorStore(storage).load(project.id);

  const snapshots = await new SnapshotManager(storage).list(project.id);

  const capture = inspectSessionCaptureHealth(project);

  const captureWarnings =
    capture.syncHealth === 'degraded'
      ? [`Session capture degraded${capture.opencode?.error ? `: ${capture.opencode.error}` : ''}`]
      : [];

  const result: DoctorResult = {
    ok: health.ok && Boolean(llmHealth?.ok) && capture.ok,
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
    capture,
    warnings: [...configCheck.warnings, ...captureWarnings],
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
