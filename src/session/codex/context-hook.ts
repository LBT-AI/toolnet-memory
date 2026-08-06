import {
  loadConfig,
} from "../../core/index.js";

import {
  createStorageProvider,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from "../../storage/index.js";

import {
  buildCodexSessionStartOutput,
} from "../../work-continuity/index.js";

import {
  findCodexToolNetProject,
} from "./project-resolver.js";

async function readInput() {
  let raw =
    "";

  for await (
    const chunk
    of process.stdin
  ) {
    raw +=
      chunk.toString();
  }

  if (
    !raw.trim()
  ) {
    return {} as
      Record<
        string,
        unknown
      >;
  }

  try {
    return JSON.parse(
      raw,
    ) as
      Record<
        string,
        unknown
      >;
  } catch {
    return {};
  }
}

async function main() {
  const input =
    await readInput();

  if (
    input.hook_event_name !==
    "SessionStart"
  ) {
    process.stdout.write(
      "{}",
    );

    return;
  }

  const cwd =
    typeof input.cwd ===
      "string"
      ? input.cwd
      : "";

  if (
    !cwd
  ) {
    process.stdout.write(
      "{}",
    );

    return;
  }

  const project =
    findCodexToolNetProject(
      cwd,
    );

  if (
    !project
  ) {
    process.stdout.write(
      "{}",
    );

    return;
  }

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

    const output =
      await buildCodexSessionStartOutput({
        project,
        storage,
      });

    process.stdout.write(
      JSON.stringify(
        output,
      ),
    );
  } catch {
    process.stdout.write(
      "{}",
    );
  }
}

main().catch(
  () => {
    process.stdout.write(
      "{}",
    );

    process.exitCode =
      0;
  },
);
