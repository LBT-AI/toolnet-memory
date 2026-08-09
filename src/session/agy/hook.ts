import { loadConfig } from '../../core/index.js';

import {
  createStorageProvider,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from '../../storage/index.js';

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

export function normalizeAgyInput(input: Record<string, unknown>): NormalizedInput {
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

  const conversationId =
    (typeof common.conversation_id === 'string' ? common.conversation_id : '') ||
    (typeof input.conversationId === 'string' ? input.conversationId : '') ||
    (typeof input.conversation_id === 'string' ? input.conversation_id : '');

  const transcriptPath =
    (typeof common.transcript_path === 'string' ? common.transcript_path : '') ||
    (typeof input.transcriptPath === 'string' ? input.transcriptPath : '') ||
    (typeof input.transcript_path === 'string' ? input.transcript_path : '');

  const workspacePaths =
    strings(common.workspace_paths).length > 0
      ? strings(common.workspace_paths)
      : strings(input.workspacePaths).length > 0
        ? strings(input.workspacePaths)
        : strings(input.workspace_paths);

  const invocationNum =
    typeof preInvocationArgs.invocation_num === 'number'
      ? preInvocationArgs.invocation_num
      : typeof input.invocationNum === 'number'
        ? input.invocationNum
        : typeof input.invocation_num === 'number'
          ? input.invocation_num
          : undefined;

  const artifactDirectoryPath =
    (typeof common.artifact_directory_path === 'string' ? common.artifact_directory_path : '') ||
    (typeof input.artifactDirectoryPath === 'string' ? input.artifactDirectoryPath : '') ||
    (typeof input.artifact_directory_path === 'string' ? input.artifact_directory_path : '') ||
    undefined;

  const modelName =
    (typeof common.model_name === 'string' ? common.model_name : '') ||
    (typeof input.modelName === 'string' ? input.modelName : '') ||
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

async function main() {
  const phase = (process.argv[2] ?? 'post') as 'pre' | 'post' | 'stop';

  const input = await readStdin();

  const normalized = normalizeAgyInput(input);

  const conversationId = normalized.conversationId;

  const transcriptPath = normalized.transcriptPath;

  const workspacePaths = normalized.workspacePaths;

  const project = findToolNetProject(workspacePaths);

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
  } else {
    process.stdout.write('{}');
  }

  process.exitCode = 0;
});
