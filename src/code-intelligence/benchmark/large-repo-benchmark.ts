import { createHash } from 'node:crypto';

import { mkdirSync, mkdtempSync, renameSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { performance } from 'node:perf_hooks';

import type { StorageObject, StorageProvider } from '../../storage/types.js';

import { scanRepositoryDetailed } from '../indexer/repository-scanner.js';

import { IncrementalRepositoryIndexer } from '../incremental/incremental-indexer.js';

import { CodeFtsIndex } from '../semantic/code-fts.js';

import type { CodeChunk } from '../chunks/types.js';

const PROFILES = {
  '10k': 10_000,
  '50k': 50_000,
  '100k': 100_000,
} as const;

type ProfileName = keyof typeof PROFILES;

interface BenchmarkOptions {
  profile: ProfileName;
  full: boolean;
}

class MemoryStorage implements StorageProvider {
  readonly name = 'benchmark-memory';

  private readonly data = new Map<string, Uint8Array>();

  async put(key: string, data: string | Uint8Array): Promise<void> {
    this.data.set(key, typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data));
  }

  async get(key: string): Promise<Uint8Array | null> {
    const value = this.data.get(key);

    return value ? Buffer.from(value) : null;
  }

  async getText(key: string): Promise<string | null> {
    const value = await this.get(key);

    return value ? Buffer.from(value).toString('utf8') : null;
  }

  async exists(key: string): Promise<boolean> {
    return this.data.has(key);
  }

  async delete(key: string): Promise<void> {
    this.data.delete(key);
  }

  async list(prefix = ''): Promise<StorageObject[]> {
    return [...this.data.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => ({
        key,
        size: value.byteLength,
      }));
  }
}

function options(): BenchmarkOptions {
  const args = process.argv.slice(2);

  let profile: ProfileName = '10k';

  let full = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--full') {
      full = true;
      continue;
    }

    if (arg === '--scan-only') {
      full = false;
      continue;
    }

    if (arg === '--profile') {
      const value = args[index + 1];
      index += 1;

      if (value !== '10k' && value !== '50k' && value !== '100k') {
        throw new Error('profile must be 10k, 50k, or 100k');
      }

      profile = value;
      continue;
    }

    if (arg.startsWith('--profile=')) {
      const value = arg.slice('--profile='.length);

      if (value !== '10k' && value !== '50k' && value !== '100k') {
        throw new Error('profile must be 10k, 50k, or 100k');
      }

      profile = value;
      continue;
    }

    throw new Error(`Unknown benchmark option: ${arg}`);
  }

  return {
    profile,
    full,
  };
}

interface Measurement<T> {
  milliseconds: number;
  peakRssBytes: number;
  result: T;
}

async function measure<T>(operation: () => Promise<T>): Promise<Measurement<T>> {
  let peakRssBytes = process.memoryUsage().rss;

  const sample = setInterval(() => {
    peakRssBytes = Math.max(peakRssBytes, process.memoryUsage().rss);
  }, 25);

  sample.unref();

  const start = performance.now();

  try {
    const result = await operation();

    return {
      milliseconds: performance.now() - start,
      peakRssBytes,
      result,
    };
  } finally {
    clearInterval(sample);
  }
}

function fileName(index: number): string {
  return `file-${String(index).padStart(6, '0')}.ts`;
}

function directoryName(index: number): string {
  return `group-${String(Math.floor(index / 500)).padStart(4, '0')}`;
}

function filePath(root: string, index: number): string {
  return join(root, 'src', directoryName(index), fileName(index));
}

function source(index: number): string {
  return [
    `export const value${index} = ${index};`,
    `export function function${index}(input: number): number {`,
    `  return input + value${index};`,
    `}`,
    '',
  ].join('\n');
}

function generateRepository(root: string, count: number): void {
  let currentDirectory = '';

  for (let index = 0; index < count; index += 1) {
    const directory = join(root, 'src', directoryName(index));

    if (directory !== currentDirectory) {
      mkdirSync(directory, {
        recursive: true,
      });

      currentDirectory = directory;
    }

    writeFileSync(filePath(root, index), source(index), 'utf8');
  }
}

function chunk(index: number): CodeChunk {
  const content = source(index);

  return {
    id: `chunk-${index}`,
    projectId: 'benchmark',
    filePath: `src/${directoryName(index)}/${fileName(index)}`,
    symbolId: `symbol-${index}`,
    symbolName: `function${index}`,
    symbolType: 'function',
    startLine: 1,
    endLine: 4,
    content,
    contentHash: createHash('sha256').update(content).digest('hex'),
  };
}

function percentile(values: number[], fraction: number): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);

  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * fraction));

  return sorted[index]!;
}

async function benchmarkFts(count: number): Promise<{
  buildMs: number;
  queryP50Ms: number;
  queryP95Ms: number;
  peakRssBytes: number;
}> {
  const chunks = Array.from(
    {
      length: count,
    },
    (_, index) => chunk(index)
  );

  const index = new CodeFtsIndex('benchmark');

  try {
    const build = await measure(async () => {
      index.build(chunks);
    });

    const latencies: number[] = [];

    for (let query = 0; query < 50; query += 1) {
      const start = performance.now();

      index.search(`function${Math.floor(count / 2)}`, 8);

      latencies.push(performance.now() - start);
    }

    return {
      buildMs: build.milliseconds,
      queryP50Ms: percentile(latencies, 0.5),
      queryP95Ms: percentile(latencies, 0.95),
      peakRssBytes: build.peakRssBytes,
    };
  } finally {
    index.close();
  }
}

async function main(): Promise<void> {
  const config = options();

  const count = PROFILES[config.profile];

  const root = mkdtempSync(join(tmpdir(), `toolnet-large-repo-${config.profile}-`));

  try {
    const generationStart = performance.now();

    generateRepository(root, count);

    const generationMs = performance.now() - generationStart;

    const scan = await measure(() => scanRepositoryDetailed(root));

    const report: Record<string, unknown> = {
      profile: config.profile,
      requestedFiles: count,
      mode: config.full ? 'full' : 'scan-only',
      generationMs,
      scan: {
        milliseconds: scan.milliseconds,
        peakRssBytes: scan.peakRssBytes,
        files: scan.result.files.length,
        stats: scan.result.stats,
      },
    };

    if (!config.full) {
      console.log(JSON.stringify(report, null, 2));

      return;
    }

    const storage = new MemoryStorage();

    const incremental = new IncrementalRepositoryIndexer(storage);

    const initial = await measure(() => incremental.index('benchmark', root));

    const modifyTarget = filePath(root, 0);

    writeFileSync(modifyTarget, `${source(0)}\nexport const modified = true;\n`, 'utf8');

    const modified = await measure(() => incremental.index('benchmark', root));

    const movedDirectory = join(root, 'src', 'moved');

    mkdirSync(movedDirectory, {
      recursive: true,
    });

    renameSync(filePath(root, 1), join(movedDirectory, fileName(1)));

    const renamed = await measure(() => incremental.index('benchmark', root));

    unlinkSync(filePath(root, 2));

    const deleted = await measure(() => incremental.index('benchmark', root));

    const fts = await benchmarkFts(count);

    report.incremental = {
      initial: {
        milliseconds: initial.milliseconds,
        peakRssBytes: initial.peakRssBytes,
        result: initial.result,
      },
      oneFileModify: {
        milliseconds: modified.milliseconds,
        peakRssBytes: modified.peakRssBytes,
        result: modified.result,
      },
      crossDirectoryRename: {
        milliseconds: renamed.milliseconds,
        peakRssBytes: renamed.peakRssBytes,
        result: renamed.result,
      },
      oneFileDelete: {
        milliseconds: deleted.milliseconds,
        peakRssBytes: deleted.peakRssBytes,
        result: deleted.result,
      },
    };

    report.fts = fts;

    console.log(JSON.stringify(report, null, 2));
  } finally {
    rmSync(root, {
      recursive: true,
      force: true,
    });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);

  process.exitCode = 1;
});
