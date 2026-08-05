import {
  closeSync,
  mkdirSync,
  openSync,
  rmSync,
  writeFileSync,
} from "node:fs";

import {
  join,
} from "node:path";

import {
  ProjectManager,
} from "../core/index.js";

import {
  runProductionIndex,
} from "./index-pipeline.js";

const project =
  new ProjectManager()
    .detect();

const toolnetDir =
  join(
    project.rootPath,
    ".toolnet",
  );

const lockFile =
  join(
    toolnetDir,
    "index.lock",
  );

const statusFile =
  join(
    toolnetDir,
    "last-index.json",
  );

mkdirSync(
  toolnetDir,
  {
    recursive: true,
  },
);

function writeStatus(
  value: Record<string, unknown>,
) {
  writeFileSync(
    statusFile,
    JSON.stringify(
      value,
      null,
      2,
    ) + "\n",
    {
      encoding: "utf8",
      mode: 0o600,
    },
  );
}

let lockFd:
  number |
  undefined;

try {
  lockFd =
    openSync(
      lockFile,
      "wx",
      0o600,
    );
} catch {
  console.error(
    "❌ Index already running for this project.",
  );

  console.error(
    `Lock: ${lockFile}`,
  );

  process.exit(2);
}

const startedAt =
  new Date()
    .toISOString();

const completedStages:
  string[] = [];

try {
  console.log();
  console.log(
    "==============================================",
  );

  console.log(
    " ToolNet Production Index",
  );

  console.log(
    "==============================================",
  );

  console.log(
    `Project : ${project.name}`,
  );

  console.log(
    `Remote  : projects/${
      project.remote ??
      project.name
    }/`,
  );

  console.log(
    "Runtime : production/dist",
  );

  console.log(
    "Snapshot: disabled",
  );

  writeStatus({
    version: 2,
    state: "running",
    startedAt,
    completedStages,
    project,
  });

  const result =
    await runProductionIndex(
      project,
      {
        onStage:
          async event => {
            if (
              event.state ===
              "start"
            ) {
              console.log();
              console.log(
                `===== ${event.title} =====`,
              );
            } else {
              completedStages.push(
                event.id,
              );

              console.log(
                `✅ ${event.title} (${(
                  (
                    event.durationMs ??
                    0
                  ) /
                  1000
                ).toFixed(1)}s)`,
              );
            }

            writeStatus({
              version: 2,

              state:
                "running",

              startedAt,

              currentStage:
                event.id,

              completedStages:
                [
                  ...completedStages,
                ],

              project,
            });
          },
      },
    );

  writeStatus({
    version: 2,

    state:
      "complete",

    startedAt,

    finishedAt:
      new Date()
        .toISOString(),

    completedStages,

    result,
  });

  console.log();
  console.log(
    "==============================================",
  );

  console.log(
    " FULL INDEX COMPLETE ✅",
  );

  console.log(
    "==============================================",
  );

  console.log(
    JSON.stringify(
      result,
      null,
      2,
    ),
  );
} catch (
  error
) {
  writeStatus({
    version: 2,

    state:
      "failed",

    startedAt,

    failedAt:
      new Date()
        .toISOString(),

    completedStages,

    error:
      error instanceof Error
        ? error.message
        : String(
            error,
          ),
  });

  console.error(
    "FULL INDEX FAILED ❌",
  );

  console.error(
    error,
  );

  process.exitCode =
    1;
} finally {
  if (
    lockFd !==
    undefined
  ) {
    closeSync(
      lockFd,
    );
  }

  rmSync(
    lockFile,
    {
      force: true,
    },
  );
}
