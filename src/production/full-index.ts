import {
  existsSync,
  mkdirSync,
  openSync,
  closeSync,
  rmSync,
  writeFileSync,
} from "node:fs";

import {
  dirname,
  join,
  resolve,
} from "node:path";

import {
  fileURLToPath,
} from "node:url";

import {
  spawnSync,
} from "node:child_process";

import {
  ProjectManager,
} from "../core/index.js";

interface Stage {
  id: string;
  title: string;
  script: string;
  args?: string[];
}

const currentFile =
  fileURLToPath(
    import.meta.url,
  );

const toolnetRoot =
  resolve(
    dirname(
      currentFile,
    ),
    "../..",
  );

const tsx =
  join(
    toolnetRoot,
    "node_modules",
    ".bin",
    "tsx",
  );

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

if (
  !existsSync(
    tsx,
  )
) {
  throw new Error(
    `tsx not found: ${tsx}`,
  );
}

const stages:
  Stage[] = [
  {
    id:
      "source-index",

    title:
      "Source Index",

    script:
      "src/code-intelligence/test-index.ts",
  },

  {
    id:
      "type-resolution",

    title:
      "Type Resolution",

    script:
      "src/code-intelligence/test-resolution.ts",
  },

  {
    id:
      "rich-graph",

    title:
      "Rich Graph",

    script:
      "src/code-intelligence/test-rich-graph.ts",
  },

  {
    id:
      "semantic-index",

    title:
      "Semantic Code Index",

    script:
      "src/code-intelligence/test-semantic.ts",

    /*
     * Existing semantic entry point accepts an optional query.
     * Passing a stable harmless query keeps compatibility while
     * still forcing initialize/persistence.
     */
    args: [
      "project architecture",
    ],
  },

  {
    id:
      "architecture",

    title:
      "Architecture Intelligence",

    script:
      "src/code-intelligence/test-architecture.ts",
  },

  {
    id:
      "analysis",

    title:
      "Graph Analysis",

    script:
      "src/code-intelligence/test-analysis.ts",
  },

  {
    id:
      "visualization",

    title:
      "3D Visualization Dataset",

    script:
      "src/code-intelligence/test-visualization.ts",
  },
];

function writeStatus(
  value:
    Record<string, unknown>,
) {
  writeFileSync(
    statusFile,

    JSON.stringify(
      value,
      null,
      2,
    ) + "\n",

    {
      encoding:
        "utf8",

      mode:
        0o600,
    },
  );
}

let lockFd:
  number |
  undefined;

try {
  /*
   * wx = create only if it doesn't already exist.
   * Prevent two agents/users indexing the same project
   * simultaneously and corrupting current state.
   */
  lockFd =
    openSync(
      lockFile,
      "wx",
      0o600,
    );
} catch {
  console.error();
  console.error(
    "❌ ToolNet index is already running for this project.",
  );

  console.error(
    `Lock: ${lockFile}`,
  );

  console.error();
  console.error(
    "If no index process is actually running, remove the stale lock:",
  );

  console.error(
    `rm -f "${lockFile}"`,
  );

  process.exit(2);
}

const startedAt =
  new Date()
    .toISOString();

const completedStages:
  string[] = [];

try {
  writeStatus({
    version:
      1,

    state:
      "running",

    project: {
      id:
        project.id,

      name:
        project.name,

      remote:
        project.remote ??
        project.name,

      rootPath:
        project.rootPath,
    },

    startedAt,

    completedStages,
  });

  console.log();
  console.log(
    "==================================================",
  );

  console.log(
    " ToolNet Full Project Index",
  );

  console.log(
    "==================================================",
  );

  console.log(
    `Project : ${project.name}`,
  );

  console.log(
    `Root    : ${project.rootPath}`,
  );

  console.log(
    `Remote  : projects/${
      project.remote ??
      project.name
    }/`,
  );

  console.log(
    `Stages  : ${stages.length}`,
  );

  console.log(
    "Snapshot: disabled",
  );

  console.log(
    "==================================================",
  );

  const startTime =
    Date.now();

  for (
    let index = 0;
    index < stages.length;
    index++
  ) {
    const stage =
      stages[index];

    const stageNumber =
      index + 1;

    const stageStarted =
      Date.now();

    console.log();
    console.log(
      `===== [${stageNumber}/${stages.length}] ${stage.title} =====`,
    );

    const scriptPath =
      join(
        toolnetRoot,
        stage.script,
      );

    if (
      !existsSync(
        scriptPath,
      )
    ) {
      throw new Error(
        `Stage script missing: ${scriptPath}`,
      );
    }

    const result =
      spawnSync(
        tsx,

        [
          scriptPath,
          ...(
            stage.args ??
            []
          ),
        ],

        {
          cwd:
            project.rootPath,

          env:
            process.env,

          stdio:
            "inherit",
        },
      );

    if (
      result.error
    ) {
      throw result.error;
    }

    if (
      result.signal
    ) {
      throw new Error(
        `${stage.title} terminated by signal ${result.signal}`,
      );
    }

    if (
      result.status !==
      0
    ) {
      throw new Error(
        `${stage.title} failed with exit code ${result.status}`,
      );
    }

    completedStages.push(
      stage.id,
    );

    const durationMs =
      Date.now() -
      stageStarted;

    console.log(
      `✅ ${stage.title} (${(
        durationMs /
        1000
      ).toFixed(1)}s)`,
    );

    writeStatus({
      version:
        1,

      state:
        "running",

      project: {
        id:
          project.id,

        name:
          project.name,

        remote:
          project.remote ??
          project.name,

        rootPath:
          project.rootPath,
      },

      startedAt,

      currentStage:
        stage.id,

      completedStages:
        [
          ...completedStages,
        ],
    });
  }

  const finishedAt =
    new Date()
      .toISOString();

  const durationMs =
    Date.now() -
    startTime;

  writeStatus({
    version:
      1,

    state:
      "complete",

    project: {
      id:
        project.id,

      name:
        project.name,

      remote:
        project.remote ??
        project.name,

      rootPath:
        project.rootPath,
    },

    startedAt,

    finishedAt,

    durationMs,

    completedStages,
  });

  console.log();
  console.log(
    "==================================================",
  );

  console.log(
    " FULL PROJECT INDEX COMPLETE ✅",
  );

  console.log(
    "==================================================",
  );

  console.log(
    `Project: ${project.name}`,
  );

  console.log(
    `Remote : projects/${
      project.remote ??
      project.name
    }/`,
  );

  console.log(
    `Time   : ${(
      durationMs /
      1000
    ).toFixed(1)}s`,
  );

  console.log();
  console.log(
    "Generated/updated:",
  );

  console.log(
    "  code/graph/",
  );

  console.log(
    "  code/graph/resolution/",
  );

  console.log(
    "  code/chunks/",
  );

  console.log(
    "  code/vectors/",
  );

  console.log(
    "  code/architecture/",
  );

  console.log(
    "  code/analysis/",
  );

  console.log(
    "  code/visualization/",
  );

  console.log();
  console.log(
    `Status: ${statusFile}`,
  );

  console.log(
    "==================================================",
  );
} catch (
  error
) {
  const failedAt =
    new Date()
      .toISOString();

  writeStatus({
    version:
      1,

    state:
      "failed",

    project: {
      id:
        project.id,

      name:
        project.name,

      remote:
        project.remote ??
        project.name,

      rootPath:
        project.rootPath,
    },

    startedAt,

    failedAt,

    completedStages,

    error:
      error instanceof Error
        ? error.message
        : String(
            error,
          ),
  });

  console.error();
  console.error(
    "==================================================",
  );

  console.error(
    " FULL PROJECT INDEX FAILED ❌",
  );

  console.error(
    "==================================================",
  );

  console.error(
    error,
  );

  console.error();
  console.error(
    `Progress saved: ${statusFile}`,
  );

  process.exitCode =
    1;
} finally {
  if (
    lockFd !==
    undefined
  ) {
    try {
      closeSync(
        lockFd,
      );
    } catch {
      // ignore
    }
  }

  rmSync(
    lockFile,
    {
      force:
        true,
    },
  );
}
