import {
  loadConfig,
} from "../../core/index.js";

import {
  createStorageProvider,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from "../../storage/index.js";

import {
  buildAgyPreInvocationOutput,
  refreshStartupBriefCache,
} from "../../work-continuity/index.js";

import {
  findToolNetProject,
} from "./project-resolver.js";

import {
  syncAgySession,
} from "./adapter.js";

async function readStdin():
  Promise<
    Record<
      string,
      unknown
    >
  > {
  let content =
    "";

  for await (
    const chunk
    of process.stdin
  ) {
    content +=
      chunk.toString();
  }

  if (
    !content.trim()
  ) {
    return {};
  }

  try {
    return JSON.parse(
      content,
    ) as
      Record<
        string,
        unknown
      >;
  } catch {
    return {};
  }
}

function strings(
  value:
    unknown,
): string[] {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [];
  }

  return value.filter(
    item =>
      typeof item ===
      "string",
  ) as
    string[];
}

async function main() {
  const phase =
    (
      process.argv[2] ??
      "post"
    ) as
      "pre" |
      "post" |
      "stop";

  const input =
    await readStdin();

  const conversationId =
    typeof input
      .conversationId ===
      "string"
      ? input
          .conversationId
      : "";

  const transcriptPath =
    typeof input
      .transcriptPath ===
      "string"
      ? input
          .transcriptPath
      : "";

  const workspacePaths =
    strings(
      input.workspacePaths,
    );

  const project =
    findToolNetProject(
      workspacePaths,
    );

  let hookOutput:
    Record<
      string,
      unknown
    > = {};

  if (
    project &&
    conversationId
  ) {
    try {
      const config =
        loadConfig();

      const raw =
        withStorageRetry(
          createStorageProvider({
            provider:
              config.storage
                .provider,

            huggingface:
              config.storage
                .huggingface,

            localRoot:
              config.storage
                .localRoot,
          }),
          {
            attempts:
              2,
          },
        );

      const storage =
        new ProjectScopedStorageProvider(
          raw,
          project.id,
          project.name,
          project.remote ??
            project.name,
        );

      /*
       * Session capture remains independent from context
       * injection. One failure cannot break the other.
       */
      if (
        transcriptPath
      ) {
        try {
          await syncAgySession({
            project,
            storage,

            conversationId,
            transcriptPath,
            workspacePaths,

            artifactDirectoryPath:
              typeof input
                .artifactDirectoryPath ===
                "string"
                ? input
                    .artifactDirectoryPath
                : undefined,

            modelName:
              typeof input
                .modelName ===
                "string"
                ? input
                    .modelName
                : undefined,

            phase,

            fullyIdle:
              input.fullyIdle ===
              true,

            terminationReason:
              typeof input
                .terminationReason ===
                "string"
                ? input
                    .terminationReason
                : undefined,

            error:
              typeof input.error ===
                "string" &&
              input.error
                ? input.error
                : undefined,
          });
        } catch {
          // Capture failure must not block Agy.
        }
      }

      if (
        phase ===
        "pre"
      ) {
        try {
          hookOutput =
            await buildAgyPreInvocationOutput({
              project,
              storage,
              conversationId,

              invocationNum:
                typeof input
                  .invocationNum ===
                  "number"
                  ? input
                      .invocationNum
                  : undefined,
            });
        } catch {
          hookOutput =
            {};
        }
      }

      /*
       * End of one Agy execution:
       * publish the newest compact Startup Brief so another
       * agent/VPS can resume immediately.
       */
      if (
        phase ===
        "stop"
      ) {
        try {
          await refreshStartupBriefCache(
            project,
            storage,
            900,
          );
        } catch {
          // Optional derived cache.
        }
      }
    } catch {
      // ToolNet must never break Agy.
    }
  }

  if (
    phase ===
    "stop"
  ) {
    process.stdout.write(
      JSON.stringify({
        decision:
          "stop",
      }),
    );

    return;
  }

  process.stdout.write(
    JSON.stringify(
      hookOutput,
    ),
  );
}

main().catch(
  () => {
    if (
      process.argv[2] ===
      "stop"
    ) {
      process.stdout.write(
        '{"decision":"stop"}',
      );
    } else {
      process.stdout.write(
        "{}",
      );
    }

    process.exitCode =
      0;
  },
);
