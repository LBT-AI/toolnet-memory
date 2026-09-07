#!/usr/bin/env node
/**
 * ToolNet Memory Review
 *
 * Read-only review of canonical project Memory.
 *
 * No sample transcript.
 * No Memory mutation.
 * No automatic deletion.
 */
import type { MemoryFreshnessState, MemoryScope } from '../core/types.js';
import { loadConfig, ProjectManager } from '../core/index.js';
import { ConvergentMemoryStore } from '../multi-host/memory-projection.js';
import {
  filterMemoryQualityItems,
  inspectMemoryQuality,
  memoryAgeLabel,
} from '../memory/quality.js';
import {
  createStorageProvider,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from '../storage/index.js';

interface CliOptions {
  project?: string;
  freshness: MemoryFreshnessState[];
  scope?: MemoryScope;
  limit: number;
  json: boolean;
}

function parseScope(value: string): MemoryScope {
  const valid: MemoryScope[] = ['rule', 'decision', 'fact', 'observation', 'history'];
  if (valid.includes(value as MemoryScope)) {
    return value as MemoryScope;
  }
  throw new Error(`Invalid --scope: ${value}`);
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const freshness: MemoryFreshnessState[] = [];
  const options: CliOptions = {
    freshness,
    limit: 50,
    json: false,
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--project' && args[index + 1]) {
      options.project = args[++index];
      continue;
    }
    if (arg === '--fresh') {
      freshness.push('fresh');
      continue;
    }
    if (arg === '--stale') {
      freshness.push('stale');
      continue;
    }
    if (arg === '--needs-verification') {
      freshness.push('needs_verification');
      continue;
    }
    if (arg === '--scope' && args[index + 1]) {
      options.scope = parseScope(args[++index]!);
      continue;
    }
    if (arg === '--limit' && args[index + 1]) {
      const parsed = Number.parseInt(args[++index]!, 10);
      if (!Number.isFinite(parsed) || parsed < 1) {
        throw new Error('--limit must be >= 1');
      }
      options.limit = Math.min(500, parsed);
      continue;
    }
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      console.log(`Memory Review
Usage:
  toolnet-memory memory:review [options]
Filters:
  --fresh
  --stale
  --needs-verification
  --scope <rule|decision|fact|observation|history>
  --limit <N>
Output:
  --json
Examples:
  toolnet-memory memory:review
  toolnet-memory memory:review --needs-verification
  toolnet-memory memory:review --stale
  toolnet-memory memory:review --scope rule
  toolnet-memory memory:review --needs-verification --json
`);
      process.exit(0);
    }
    throw new Error(`Unknown option: ${arg}`);
  }
  return options;
}

function freshnessLabel(value: MemoryFreshnessState): string {
  switch (value) {
    case 'fresh':
      return 'FRESH';
    case 'needs_verification':
      return 'VERIFY';
    case 'stale':
      return 'STALE';
  }
}

function confidenceLabel(value: string): string {
  return value.toUpperCase();
}

async function main(): Promise<void> {
  const options = parseArgs();
  const project = new ProjectManager().detect(options.project ?? process.cwd());
  const config = loadConfig();
  const raw = withStorageRetry(
    createStorageProvider({
      provider: config.storage.provider,
      r2: config.storage.r2,
      s3: config.storage.s3,
      huggingface: config.storage.huggingface,
      localRoot: config.storage.localRoot,
    }),
    { attempts: 3 }
  );
  const storage = new ProjectScopedStorageProvider(
    raw,
    project.id,
    project.name,
    project.remote ?? project.name
  );
  /*
   * Canonical multi-host Memory projection.
   */
  const memories = await new ConvergentMemoryStore(storage).load(project.id);
  const now = Date.now();
  const report = inspectMemoryQuality(memories, now);
  const items = filterMemoryQualityItems(report, {
    ...(options.freshness.length ? { freshness: options.freshness } : {}),
    ...(options.scope ? { scope: options.scope } : {}),
    limit: options.limit,
  });

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          project: {
            id: project.id,
            name: project.name,
          },
          generatedAt: new Date(now).toISOString(),
          summary: {
            total: report.total,
            rules: report.rules,
            fresh: report.fresh,
            needsVerification: report.needsVerification,
            stale: report.stale,
            highConfidence: report.highConfidence,
            mediumConfidence: report.mediumConfidence,
            lowConfidence: report.lowConfidence,
            verified: report.verified,
            unverified: report.unverified,
          },
          filters: {
            freshness: options.freshness,
            scope: options.scope,
            limit: options.limit,
          },
          items,
        },
        null,
        2
      )
    );
    return;
  }

  console.log('');
  console.log('ToolNet Memory Review');
  console.log('=====================');
  console.log('');
  console.log(`Project: ${project.name}`);
  console.log(`Total: ${report.total}`);
  console.log(`Fresh: ${report.fresh}`);
  console.log(`Needs verification: ${report.needsVerification}`);
  console.log(`Stale: ${report.stale}`);
  console.log(`Verified: ${report.verified}`);
  console.log('');

  if (items.length === 0) {
    console.log('No Memory entries match the selected filters.');
    console.log('');
    return;
  }

  for (const item of items) {
    const confidence = item.confidence.toFixed(2);
    console.log(
      `[${freshnessLabel(item.freshness)}] [${confidenceLabel(
        item.confidenceBand
      )} ${confidence}] [${item.scope}] ${item.id}`
    );
    console.log(`  observed: ${item.observedAt} (${memoryAgeLabel(item.observedAt, now)} ago)`);
    console.log(`  verified: ${item.verifiedAt ?? 'never'}`);
    if (item.staleAfter) {
      console.log(`  staleAfter: ${item.staleAfter}`);
    }
    console.log(`  source: ${item.source}${item.sourceRef ? ` / ${item.sourceRef}` : ''}`);
    console.log(`  ${item.content}`);
    console.log('');
  }

  console.log('Review is read-only. No Memory was modified or deleted.');
  console.log('Use `toolnet-memory ask` when older historical context is intentionally needed.');
  console.log('');
}

main().catch((error) => {
  console.error('');
  console.error(error instanceof Error ? error.message : String(error));
  console.error('');
  process.exitCode = 1;
});
