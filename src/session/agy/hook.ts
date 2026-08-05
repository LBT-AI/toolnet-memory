import {
  loadConfig,
} from "../../core/index.js";

import {
  createStorageProvider,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from "../../storage/index.js";

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
  value: unknown,
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
  ) as string[];
}

async function main() {
  const phase =
    (
      process.argv[2] ??
      "post"
    ) as
      "pre"
      | "post"
      | "stop";

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

  /*
   * Global hook may run in projects which do not use ToolNet.
   * Never create .toolnet there automatically.
   */
  const project =
    findToolNetProject(
      workspacePaths,
    );

  if (
    project &&
    conversationId &&
    transcriptPath
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
            attempts: 3,
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
    } catch (
      error
    ) {
      /*
       * Capture must never break Agy.
       */
      console.error(
        "[toolnet-memory]",
        error instanceof Error
          ? error.message
          : String(
              error,
            ),
      );
    }
  }

  /*
   * Hooks communicate over stdout JSON.
   */
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
  } else {
    process.stdout.write(
      "{}",
    );
  }
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
