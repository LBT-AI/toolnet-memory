import { closeSync, mkdirSync, openSync, rmSync, writeFileSync } from 'node:fs';

import { join } from 'node:path';

import { ProjectManager } from '../core/index.js';

import { runProductionIndex, type IndexStageId } from './index-pipeline.js';

import { IndexLiveUI, type IndexUiStage } from './index-live-ui.js';

import { invalidateServiceProject } from '../service/client.js';

const project = new ProjectManager().detect();

const toolnetDir = join(project.rootPath, '.toolnet');

const lockFile = join(toolnetDir, 'index.lock');

const statusFile = join(toolnetDir, 'last-index.json');

const json = process.argv.includes('--json');

const stages: IndexUiStage[] = [
  {
    id: 'source-index',
    title: 'Source Index',
  },
  {
    id: 'type-resolution',
    title: 'Resolving refs',
  },
  {
    id: 'rich-graph',
    title: 'Building rich graph',
  },
  {
    id: 'semantic-index',
    title: 'Semantic index',
  },
  {
    id: 'architecture',
    title: 'Architecture intelligence',
  },
  {
    id: 'analysis',
    title: 'Graph analysis',
  },
  {
    id: 'visualization',
    title: 'Visualization dataset',
  },
];

const ui = new IndexLiveUI({
  rootPath: project.rootPath,

  stages,

  enabled: !json,
});

mkdirSync(toolnetDir, {
  recursive: true,
});

function writeStatus(value: Record<string, unknown>) {
  writeFileSync(statusFile, JSON.stringify(value, null, 2) + '\n', {
    encoding: 'utf8',

    mode: 0o600,
  });
}

let lockFd: number | undefined;

try {
  lockFd = openSync(lockFile, 'wx', 0o600);
} catch {
  console.error('❌ Index already running for this project.');

  console.error(`Lock: ${lockFile}`);

  process.exit(2);
}

const startedAt = new Date().toISOString();

const completedStages: string[] = [];

try {
  ui.start();

  writeStatus({
    version: 2,

    state: 'running',

    startedAt,

    completedStages,

    project,
  });

  const result = await runProductionIndex(project, {
    onSourceProgress: (event) => {
      if (event.phase === 'scan') {
        ui.scanningComplete(event.total);

        return;
      }

      ui.parsingProgress(event.current, event.total);
    },

    onStage: async (event) => {
      if (event.state === 'start') {
        ui.startStage(event.id, event.title);
      } else {
        completedStages.push(event.id);

        ui.completeStage(event.id, event.title, event.durationMs ?? 0);
      }

      writeStatus({
        version: 2,

        state: 'running',

        startedAt,

        currentStage: event.id,

        completedStages: [...completedStages],

        project,
      });
    },
  });

  writeStatus({
    version: 2,

    state: 'complete',

    startedAt,

    finishedAt: new Date().toISOString(),

    completedStages,

    result,
  });

  await invalidateServiceProject(project);

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    ui.finish({
      files: result.files,

      symbols: result.graph.symbols,

      edges: result.graph.edges,

      durationMs: result.durationMs,

      storage: result.storage,
    });
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);

  writeStatus({
    version: 2,

    state: 'failed',

    startedAt,

    failedAt: new Date().toISOString(),

    completedStages,

    error: message,
  });

  ui.fail(`Full index failed: ${message}`);

  if (json) {
    console.error(message);
  }

  process.exitCode = 1;
} finally {
  if (lockFd !== undefined) {
    closeSync(lockFd);
  }

  rmSync(lockFile, {
    force: true,
  });
}
