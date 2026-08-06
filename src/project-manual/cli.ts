import {
  readFileSync,
} from "node:fs";

import {
  loadConfig,
  ProjectManager,
} from "../core/index.js";

import {
  createStorageProvider,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from "../storage/index.js";

import {
  ensureProjectManual,
  loadProjectManual,
  syncProjectManual,
} from "./manager.js";

function after(
  args:
    string[],

  flag:
    string,
): string |
undefined {
  const index =
    args.indexOf(
      flag,
    );

  return index >=
    0
    ? args[
        index + 1
      ]
    : undefined;
}

function storageFor(
  project:
    ReturnType<
      ProjectManager[
        "detect"
      ]
    >,
) {
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
          3,
      },
    );

  return new ProjectScopedStorageProvider(
    raw,
    project.id,
    project.name,
    project.remote ??
      project.name,
  );
}

async function main() {
  const [
    command =
      "help",
    ...args
  ] =
    process.argv.slice(
      2,
    );

  const project =
    new ProjectManager()
      .detect(
        after(
          args,
          "--project",
        ) ??
        process.cwd(),
      );

  if (
    command ===
    "init"
  ) {
    const file =
      ensureProjectManual(
        project,
      );

    console.log(
      `✅ Project manual: ${file}`,
    );

    return;
  }

  if (
    command ===
    "show"
  ) {
    const manual =
      loadProjectManual(
        project,
        false,
      );

    if (
      !manual
    ) {
      console.log(
        "No .toolnet/PROJECT.md yet.",
      );

      return;
    }

    process.stdout.write(
      readFileSync(
        manual.path,
        "utf8",
      ),
    );

    return;
  }

  if (
    command ===
    "sync"
  ) {
    const manual =
      await syncProjectManual(
        project,
        storageFor(
          project,
        ),
      );

    console.log(
      JSON.stringify(
        {
          project:
            project.name,

          path:
            manual.path,

          digest:
            manual.digest,

          bytes:
            manual.bytes,

          rules:
            manual.rules.length,

          enforce:
            manual.rules.filter(
              rule =>
                rule.mode ===
                "enforce",
            ).length,

          advisory:
            manual.rules.filter(
              rule =>
                rule.mode ===
                "advisory",
            ).length,
        },
        null,
        2,
      ),
    );

    return;
  }

  console.log(
`Project Manual

Commands:
  init [--project PATH]
  show [--project PATH]
  sync [--project PATH]
`,
  );
}

main().catch(
  error => {
    console.error(
      error instanceof Error
        ? error.message
        : error,
    );

    process.exit(
      1,
    );
  },
);
