import { ProjectManager } from '../core/index.js';
import { findProjectRoot } from '../work-continuity/fast-context.js';
import {
  readRetrievalTelemetry,
  summarizeRetrievalTelemetry,
} from '../work-continuity/retrieval-telemetry.js';

interface Options {
  json: boolean;
  hours: number;
  tail: number;
}

function parseArgs(): Options {
  const args = process.argv.slice(2);
  let json = false;
  let hours = 24 * 7;
  let tail = 0;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--json') {
      json = true;
      continue;
    }
    if (arg === '--hours' && args[index + 1]) {
      hours = Number.parseInt(args[++index]!, 10);
      continue;
    }
    if (arg === '--tail' && args[index + 1]) {
      tail = Number.parseInt(args[++index]!, 10);
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }
  return {
    json,
    hours: Math.max(1, hours),
    tail: Math.max(0, tail),
  };
}

function main(): void {
  const options = parseArgs();
  const root = findProjectRoot(process.cwd());
  if (!root) {
    throw new Error('Not in a ToolNet project.');
  }
  const project = new ProjectManager().requireExisting(root);
  const summary = summarizeRetrievalTelemetry(project, {
    windowHours: options.hours,
  });
  const events = options.tail > 0 ? readRetrievalTelemetry(project).slice(-options.tail) : [];
  if (options.json) {
    console.log(
      JSON.stringify(
        {
          summary,
          ...(events.length > 0 ? { events } : {}),
        },
        null,
        2
      )
    );
    return;
  }
  console.log('Retrieval Telemetry');
  console.log('===================');
  console.log(`Window: ${summary.windowHours}h`);
  console.log(`Events: ${summary.eventsInWindow}/${summary.totalStored}`);
  console.log(`Success: ${summary.success}`);
  console.log(`No result: ${summary.noResult}`);
  console.log(`Errors: ${summary.errors}`);
  console.log(`Single / composite: ${summary.single} / ${summary.composite}`);
  console.log(`Average latency: ${summary.averageDurationMs} ms`);
  console.log(`P95 latency: ${summary.p95DurationMs} ms`);
  console.log(`Average tokens: ${summary.averageEstimatedTokens}`);
  console.log(`Average sources: ${summary.averageAttemptedSources}`);
  console.log(`Provenance coverage: ${summary.averageProvenanceCoverage}`);
  console.log(`Conflict events: ${summary.conflictEvents}`);
  console.log(`Budget violations: ${summary.sourceBudgetViolations}`);
  console.log('');
  console.log('No question/answer content is stored.');
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
