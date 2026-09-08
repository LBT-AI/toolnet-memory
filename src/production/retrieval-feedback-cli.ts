import { ProjectManager } from '../core/index.js';
import { findProjectRoot } from '../work-continuity/fast-context.js';
import {
  refreshAdaptiveRetrievalOverrides,
  summarizeRetrievalFeedback,
} from '../work-continuity/retrieval-feedback.js';

interface Options {
  json: boolean;
  refresh: boolean;
}

function parseArgs(): Options {
  const args = new Set(process.argv.slice(2));
  return {
    json: args.has('--json'),
    refresh: args.has('--refresh'),
  };
}

function main(): void {
  const options = parseArgs();
  const root = findProjectRoot(process.cwd());
  if (!root) {
    throw new Error('Not in a ToolNet project.');
  }
  const project = new ProjectManager().requireExisting(root);
  const refresh = options.refresh ? refreshAdaptiveRetrievalOverrides(project) : undefined;
  const summary = summarizeRetrievalFeedback(project);
  if (options.json) {
    console.log(
      JSON.stringify(
        {
          summary,
          ...(refresh ? { refresh } : {}),
        },
        null,
        2
      )
    );
    return;
  }
  console.log('Retrieval Feedback');
  console.log('==================');
  console.log(`Feedback events: ${summary.feedbackEvents}`);
  console.log(`Structural signatures: ${summary.signatures}`);
  console.log(`Active adaptive rules: ${summary.activeRules}`);
  console.log(`Benchmark: ${summary.benchmarkVersion}`);
  if (refresh) {
    console.log(`Refresh: ${refresh.status}`);
    console.log(`Benchmark gate: ${refresh.benchmarkPassed ? 'PASS' : 'FAIL'}`);
  }
  if (summary.rules.length > 0) {
    console.log('');
    console.log('Rules:');
    for (const rule of summary.rules) {
      console.log(
        [
          '-',
          rule.fromIntent,
          '->',
          rule.toIntent,
          `support=${rule.support}/${rule.totalFeedback}`,
          `confidence=${rule.confidence}`,
          `signature=${rule.routeSignature}`,
        ].join(' ')
      );
    }
  }
  console.log('');
  console.log('No question/answer text or query hash is stored.');
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
