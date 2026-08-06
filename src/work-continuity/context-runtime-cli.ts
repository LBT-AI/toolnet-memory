import {
  existsSync,
} from "node:fs";

import {
  dirname,
  join,
  resolve,
} from "node:path";

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
  getStartupBriefForInjection,
  refreshStartupBriefCache,
} from "./brief-cache.js";

function after(
  args:
    string[],

  flag:
    string,
) {
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

function existingProjectRoot(
  start:
    string,
): string |
null {
  let current =
    resolve(start);

  while (
    true
  ) {
    if (
      existsSync(
        join(
          current,
          ".toolnet",
          "project.json",
        ),
      )
    ) {
      return current;
    }

    const parent =
      dirname(
        current,
      );

    if (
      parent ===
      current
    ) {
      return null;
    }

    current =
      parent;
  }
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
          2,
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
      "print",
    ...args
  ] =
    process.argv.slice(
      2,
    );

  const requested =
    after(
      args,
      "--project",
    ) ??
    process.cwd();

  const root =
    existingProjectRoot(
      requested,
    );

  /*
   * Global agent integrations must silently ignore
   * projects which are not managed by ToolNet.
   */
  if (
    !root
  ) {
    return;
  }

  const project =
    new ProjectManager()
      .detect(root);

  const storage =
    storageFor(
      project,
    );

  const tokens =
    Number(
      after(
        args,
        "--tokens",
      ) ??
      900,
    );

  if (
    command ===
    "refresh"
  ) {
    const cache =
      await refreshStartupBriefCache(
        project,
        storage,
        Number.isFinite(tokens)
          ? tokens
          : 900,
      );

    console.log(
      cache.text,
    );

    return;
  }

  const cache =
    await getStartupBriefForInjection(
      project,
      storage,
      Number.isFinite(tokens)
        ? tokens
        : 900,
    );

  if (
    !cache
  ) {
    return;
  }

  if (
    command ===
      "sync"
  ) {
    console.log(
      cache.digest,
    );

    return;
  }

  process.stdout.write(
    cache.text +
    "\n",
  );
}

main().catch(
  () => {
    /*
     * Context integration must never break an agent.
     */
    process.exitCode =
      0;
  },
);
