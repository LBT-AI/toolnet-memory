import { loadConfig } from '../../core/index.js';

import {
  createStorageProvider,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from '../../storage/index.js';

import { triggerProjectBackgroundRefresh } from '../../multi-host/refresh-trigger.js';

import {
  buildAgyPreInvocationOutput,
  refreshStartupBriefCache,
} from '../../work-continuity/index.js';

import { findToolNetProject } from './project-resolver.js';

import { syncAgySession } from './adapter.js';

async function readStdin(): Promise<Record<string, unknown>> {
  let content = '';

  for await (const chunk of process.stdin) {
    content += chunk.toString();
  }

  if (!content.trim()) {
    return {};
  }

  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item) => typeof item === 'string') as string[];
}

interface NormalizedInput {
  conversationId: string;
  transcriptPath: string;
  workspacePaths: string[];
  invocationNum?: number;
  artifactDirectoryPath?: string;
  modelName?: string;
  fullyIdle?: boolean;
  terminationReason?: string;
  error?: string;
}

/**
 * Normalize AGY hook input.
 *
 * Priority: official camelCase fields first, then snake_case for backward compatibility.
 * Official fields: conversationId, workspacePaths, transcriptPath, artifactDirectoryPath, modelName
 */
export function normalizeAgyInput(input: Record<string, unknown>): NormalizedInput {
  // Official camelCase is top-level in the hook payload.
  // Also support legacy nested schema for backward compatibility.
  const common =
    typeof input.common === 'object' && input.common !== null
      ? (input.common as Record<string, unknown>)
      : {};

  const preInvocationArgs =
    typeof input.pre_invocation_hook_args === 'object' && input.pre_invocation_hook_args !== null
      ? (input.pre_invocation_hook_args as Record<string, unknown>)
      : {};

  const postInvocationArgs =
    typeof input.post_invocation_hook_args === 'object' && input.post_invocation_hook_args !== null
      ? (input.post_invocation_hook_args as Record<string, unknown>)
      : {};

  const stopArgs =
    typeof input.stop_hook_args === 'object' && input.stop_hook_args !== null
      ? (input.stop_hook_args as Record<string, unknown>)
      : {};

  // Priority: official top-level camelCase > legacy nested > snake_case
  // Top-level camelCase is the official AGY schema.
  // Nested common.* is legacy backward compatibility.
  const conversationId =
    (typeof input.conversationId === 'string' ? input.conversationId : '') ||
    (typeof input.conversation_id === 'string' ? input.conversation_id : '') ||
    (typeof common.conversation_id === 'string' ? common.conversation_id : '');

  const transcriptPath =
    (typeof input.transcriptPath === 'string' ? input.transcriptPath : '') ||
    (typeof input.transcript_path === 'string' ? input.transcript_path : '') ||
    (typeof common.transcript_path === 'string' ? common.transcript_path : '');

  const workspacePaths =
    strings(input.workspacePaths).length > 0
      ? strings(input.workspacePaths)
      : strings(input.workspace_paths).length > 0
        ? strings(input.workspace_paths)
        : strings(common.workspace_paths);

  const invocationNum =
    typeof input.invocationNum === 'number'
      ? input.invocationNum
      : typeof preInvocationArgs.invocation_num === 'number'
        ? preInvocationArgs.invocation_num
        : typeof input.invocation_num === 'number'
          ? input.invocation_num
          : undefined;

  const artifactDirectoryPath =
    (typeof input.artifactDirectoryPath === 'string' ? input.artifactDirectoryPath : '') ||
    (typeof common.artifact_directory_path === 'string' ? common.artifact_directory_path : '') ||
    (typeof input.artifact_directory_path === 'string' ? input.artifact_directory_path : '') ||
    undefined;

  const modelName =
    (typeof input.modelName === 'string' ? input.modelName : '') ||
    (typeof common.model_name === 'string' ? common.model_name : '') ||
    (typeof input.model_name === 'string' ? input.model_name : '') ||
    undefined;

  const fullyIdle =
    stopArgs.fully_idle === true || input.fullyIdle === true || input.fully_idle === true;

  const terminationReason =
    (typeof stopArgs.termination_reason === 'string' ? stopArgs.termination_reason : '') ||
    (typeof input.terminationReason === 'string' ? input.terminationReason : '') ||
    (typeof input.termination_reason === 'string' ? input.termination_reason : '') ||
    undefined;

  const error =
    (typeof stopArgs.error === 'string' && stopArgs.error ? stopArgs.error : '') ||
    (typeof input.error === 'string' && input.error ? input.error : '') ||
    undefined;

  return {
    conversationId,
    transcriptPath,
    workspacePaths,
    invocationNum,
    artifactDirectoryPath,
    modelName,
    fullyIdle,
    terminationReason,
    error,
  };
}

/**
 * Build PreToolUse output.
 *
 * Official decision values: allow, deny, ask, force_ask, deny_unless_prior_grant
 */
export function buildAgyPreToolUseOutput(input: Record<string, unknown>): Record<string, unknown> {
  const toolCall =
    typeof input.toolCall === 'object' && input.toolCall !== null
      ? (input.toolCall as Record<string, unknown>)
      : {};

  const args =
    typeof toolCall.args === 'object' && toolCall.args !== null
      ? (toolCall.args as Record<string, unknown>)
      : {};

  let serialized = '';

  try {
    serialized = JSON.stringify(args).replace(/\\\\/g, '/').toLowerCase();
  } catch {
    serialized = '';
  }

  if (
    serialized.includes('.toolnet/journal') ||
    serialized.includes('.toolnet/runtime/sources') ||
    serialized.includes('.toolnet/sessions')
  ) {
    return {
      decision: 'deny',
      reason:
        'ToolNet continuity guard: do not replay raw .toolnet/journal, .toolnet/runtime/sources ' +
        'or legacy .toolnet/sessions history. ' +
        'Use the injected continuity handoff. If deeper history is required, ' +
        'invoke memory_agent_ask directly.',
    };
  }

  return {
    decision: 'allow',
  };
}

async function main() {
  const phase = (process.argv[2] ?? 'post') as 'pre' | 'post' | 'stop' | 'pre-tool';

  const input = await readStdin();

  if (phase === 'pre-tool') {
    process.stdout.write(JSON.stringify(buildAgyPreToolUseOutput(input)));
    return;
  }

  const normalized = normalizeAgyInput(input);

  const conversationId = normalized.conversationId;

  const transcriptPath = normalized.transcriptPath;

  const workspacePaths = normalized.workspacePaths;

  const project = findToolNetProject(workspacePaths);

  const shouldRefreshProjection = phase === 'pre' || phase === 'stop';

  if (project && shouldRefreshProjection) {
    triggerProjectBackgroundRefresh(project.rootPath);
  }

  let hookOutput: Record<string, unknown> = {};

  if (project && conversationId) {
    try {
      const config = loadConfig();

      const raw = withStorageRetry(
        createStorageProvider({
          provider: config.storage.provider,
          huggingface: config.storage.huggingface,
          localRoot: config.storage.localRoot,
        }),
        {
          attempts: 2,
        }
      );

      const storage = new ProjectScopedStorageProvider(
        raw,
        project.id,
        project.name,
        project.remote ?? project.name
      );

      /*
       * Session capture remains independent from context
       * injection. One failure cannot break the other.
       */
      if (transcriptPath) {
        try {
          await syncAgySession({
            project,
            storage,
            conversationId,
            transcriptPath,
            workspacePaths,
            artifactDirectoryPath: normalized.artifactDirectoryPath,
            modelName: normalized.modelName,
            phase,
            fullyIdle: normalized.fullyIdle,
            terminationReason: normalized.terminationReason,
            error: normalized.error,
          });
        } catch {
          // Capture failure must not block Agy.
        }
      }

      if (phase === 'pre') {
        try {
          hookOutput = await buildAgyPreInvocationOutput({
            project,
            storage,
            conversationId,
            invocationNum: normalized.invocationNum,
          });
        } catch {
          hookOutput = {};
        }
      }

      /*
       * End of one Agy execution:
       * publish the newest compact Startup Brief so another
       * agent/VPS can resume immediately.
       * Use 800 token budget for minimal context.
       */
      if (phase === 'stop') {
        try {
          await refreshStartupBriefCache(project, storage, 800);
        } catch {
          // Optional derived cache.
        }
      }
    } catch {
      // ToolNet must never break Agy.
    }
  }

  if (phase === 'stop') {
    /*
     * Official Stop hook output:
     * decision: "continue" re-enters the loop.
     * Any other value allows the stop.
     *
     * Stop is NOT permanent SessionEnd.
     * The same conversationId may be resumed with `agy -c`.
     */
    process.stdout.write(
      JSON.stringify({
        decision: 'stop',
      })
    );

    return;
  }

  process.stdout.write(JSON.stringify(hookOutput));
}

main().catch(() => {
  if (process.argv[2] === 'stop') {
    process.stdout.write('{"decision":"stop"}');
  } else if (process.argv[2] === 'pre-tool') {
    process.stdout.write('{"decision":"allow"}');
  } else {
    process.stdout.write('{}');
  }

  process.exitCode = 0;
});
