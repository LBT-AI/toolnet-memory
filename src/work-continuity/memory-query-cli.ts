import { loadConfig, ProjectManager } from '../core/index.js';
import {
  createStorageProvider,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from '../storage/index.js';
import type { StorageProvider } from '../storage/types.js';
import {
  retrieveIntentAwareAnswer,
  routeNeedsStorage,
  routeRetrievalIntent,
} from './intent-aware-retrieval.js';
import { findProjectRoot } from './fast-context.js';

interface CliInput {
  question: string;
  json: boolean;
  debugRoute: boolean;
}

function parseArgs(): CliInput {
  const args = process.argv.slice(2);
  const question: string[] = [];
  let json = false;
  let debugRoute = false;
  for (const arg of args) {
    if (arg === '--json') {
      json = true;
      continue;
    }
    if (arg === '--debug-route') {
      debugRoute = true;
      continue;
    }
    question.push(arg);
  }
  return {
    question: question.join(' ').trim(),
    json,
    debugRoute,
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
    console.error('Usage: toolnet-memory ask [--debug-route] [--json] "<question>"');
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
  const route = routeRetrievalIntent(input.question);
  /*
   * Critical Phase 59 property:
   *
   * Do not even construct remote storage for a pure
   * current-work / artifact / continuity query.
   */
  const storage = routeNeedsStorage(route) ? projectStorage(project) : undefined;
  const result = await retrieveIntentAwareAnswer(project, input.question, {
    route,
    ...(storage ? { storage } : {}),
    agentId: process.env.TOOLNET_AGENT_ID ?? 'opencode',
  });
  if (input.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  process.stdout.write(`${result.answer}\n`);
  if (input.debugRoute) {
    process.stderr.write(
      [
        '',
        '[ToolNet Retrieval Router]',
        `intent=${result.route.intent}`,
        `confidence=${result.route.confidence.toFixed(2)}`,
        `primary=${result.route.primarySource}`,
        `attempted=${result.attemptedSources.join(' -> ')}`,
        `selected=${result.source}`,
        `reasons=${result.route.reasons.join(',')}`,
        '',
      ].join('\n')
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
