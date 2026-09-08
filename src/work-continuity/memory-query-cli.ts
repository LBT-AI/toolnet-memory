import { loadConfig, ProjectManager } from '../core/index.js';
import {
  createStorageProvider,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from '../storage/index.js';
import type { StorageProvider } from '../storage/types.js';
import {
  compositePlanNeedsStorage,
  planCompositeRetrieval,
  retrieveCompositeAnswer,
} from './composite-retrieval.js';
import { findProjectRoot } from './fast-context.js';
import { explainRetrievalPlan, measureRetrievalExecution } from './retrieval-quality.js';
import { recordRetrievalTelemetry, recordRetrievalTelemetryError } from './retrieval-telemetry.js';
import {
  applyAdaptiveRetrievalRoute,
  loadAdaptiveRetrievalOverrides,
  recordRetrievalFeedback,
} from './retrieval-feedback.js';
import { isRetrievalIntent, type IntentAwareRetrievalIntent } from './intent-aware-retrieval.js';

interface CliInput {
  question: string;
  json: boolean;
  debugRoute: boolean;
  feedbackIntent?: IntentAwareRetrievalIntent;
}

function parseArgs(): CliInput {
  const args = process.argv.slice(2);
  const question: string[] = [];
  let json = false;
  let debugRoute = false;
  let feedbackIntent: IntentAwareRetrievalIntent | undefined;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!;
    if (arg === '--json') {
      json = true;
      continue;
    }
    if (arg === '--debug-route') {
      debugRoute = true;
      continue;
    }
    if (arg === '--feedback-intent') {
      const value = args[++index];
      if (!value || !isRetrievalIntent(value)) {
        throw new Error('INVALID_RETRIEVAL_FEEDBACK_INTENT');
      }
      feedbackIntent = value;
      continue;
    }
    question.push(arg);
  }
  return {
    question: question.join(' ').trim(),
    json,
    debugRoute,
    ...(feedbackIntent ? { feedbackIntent } : {}),
  };
}

function projectStorage(project: ReturnType<ProjectManager['detect']>): StorageProvider {
  const config = loadConfig();
  const raw = withStorageRetry(
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
  return new ProjectScopedStorageProvider(
    raw,
    project.id,
    project.name,
    project.remote ?? project.name
  );
}

async function main(): Promise<void> {
  const input = parseArgs();
  if (!input.question) {
    console.error(
      'Usage: toolnet-memory ask [--debug-route] [--json] [--feedback-intent INTENT] "<question>"'
    );
    process.exitCode = 1;
    return;
  }
  const root = findProjectRoot(process.cwd());
  if (!root) {
    console.error('Not in a ToolNet project.');
    process.exitCode = 1;
    return;
  }
  const project = new ProjectManager().requireExisting(root);
  /*
   * Phase 60:
   *
   * Plan before storage construction.
   *
   * A local Task + Artifact composite query still performs
   * ZERO remote Memory / Code storage initialization.
   */
  /*
   * Baseline remains Phase 59/60 without adaptive feedback.
   *
   * This is what explicit feedback evaluates.
   */
  const baselinePlan = planCompositeRetrieval(input.question);
  const adaptive = loadAdaptiveRetrievalOverrides(project);
  const plan = planCompositeRetrieval(input.question, {
    routeOverride: (route) => applyAdaptiveRetrievalRoute(route, adaptive),
  });
  const storage = compositePlanNeedsStorage(plan) ? projectStorage(project) : undefined;
  const telemetryStarted = process.hrtime.bigint();
  let result;
  try {
    result = await retrieveCompositeAnswer(project, input.question, {
      plan,
      ...(storage ? { storage } : {}),
      agentId: process.env.TOOLNET_AGENT_ID ?? 'opencode',
    });
  } catch (error) {
    const durationMs = Number(process.hrtime.bigint() - telemetryStarted) / 1_000_000;
    recordRetrievalTelemetryError(project, plan, {
      surface: 'cli',
      durationMs,
      error,
    });
    throw error;
  }
  const durationMs = Number(process.hrtime.bigint() - telemetryStarted) / 1_000_000;
  recordRetrievalTelemetry(project, result, {
    surface: 'cli',
    durationMs,
  });
  const feedback = input.feedbackIntent
    ? recordRetrievalFeedback(project, baselinePlan, input.feedbackIntent, 'cli')
    : undefined;
  if (input.debugRoute) {
    const execution = measureRetrievalExecution(result);
    const conflicts = result.conflicts.map((conflict) => conflict.code).join(',') || 'none';
    process.stderr.write(
      [
        '',
        '[ToolNet Retrieval Planner]',
        ...explainRetrievalPlan(result.plan),
        `attempted=${result.attemptedSources.join(' -> ')}`,
        `selected=${result.source}`,
        `answer_chars=${execution.answerChars}`,
        `estimated_tokens=${execution.estimatedTokens}`,
        `provenance_coverage=${execution.provenanceCoverage.toFixed(2)}`,
        `conflicts=${conflicts}`,
        `adaptive_rules=${adaptive.rules.length}`,
        `feedback=${feedback ? feedback.status : 'none'}`,
        ...(feedback?.refresh
          ? [
              `feedback_refresh=${feedback.refresh.status}`,
              `feedback_active_rules=${feedback.refresh.activeRules}`,
              `feedback_benchmark=${feedback.refresh.benchmarkPassed ? 'PASS' : 'FAIL'}`,
            ]
          : []),
        '',
      ].join('\n')
    );
  }
  if (input.json) {
    process.stdout.write(
      `${JSON.stringify(feedback ? { ...result, feedback } : result, null, 2)}\n`
    );
    return;
  }
  process.stdout.write(`${result.answer}\n`);
  if (feedback) {
    process.stderr.write(
      [
        '',
        '[ToolNet Retrieval Feedback]',
        `status=${feedback.status}`,
        `predicted=${feedback.predictedIntent ?? 'n/a'}`,
        `expected=${feedback.expectedIntent ?? input.feedbackIntent ?? 'n/a'}`,
        `promotion=${feedback.refresh?.status ?? 'n/a'}`,
        `benchmark=${feedback.refresh ? (feedback.refresh.benchmarkPassed ? 'PASS' : 'FAIL') : 'n/a'}`,
        '',
      ].join('\n')
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
