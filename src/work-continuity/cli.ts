import { loadConfig, ProjectManager } from '../core/index.js';

import {
  createStorageProvider,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from '../storage/index.js';

import { loadWorkState, reconcileWorkState } from './reducer.js';

function after(
  args: string[],

  flag: string
): string | undefined {
  const index = args.indexOf(flag);

  return index >= 0 ? args[index + 1] : undefined;
}

function storageFor(project: ReturnType<ProjectManager['detect']>) {
  const config = loadConfig();

  const raw = withStorageRetry(
    createStorageProvider({
      provider: config.storage.provider,

      huggingface: config.storage.huggingface,

      localRoot: config.storage.localRoot,
    }),
    {
      attempts: 3,
    }
  );

  return new ProjectScopedStorageProvider(
    raw,
    project.id,
    project.name,
    project.remote ?? project.name
  );
}

function printState(state: NonNullable<Awaited<ReturnType<typeof loadWorkState>>>) {
  console.log();
  console.log(`Project: ${state.projectName}`);

  if (state.goal) {
    console.log(`Goal: ${state.goal}`);
  }

  if (state.currentPhase) {
    console.log(`Current phase: ${state.currentPhase.title} [${state.currentPhase.status}]`);
  }

  if (state.currentTask) {
    console.log(`Current task: ${state.currentTask.title} [${state.currentTask.status}]`);
  }

  console.log(`Phases: ${state.progress.phasesCompleted}/${state.progress.phasesTotal}`);

  console.log(`Tasks: ${state.progress.tasksCompleted}/${state.progress.tasksTotal}`);

  if (state.nextActions.length) {
    console.log();
    console.log('Next actions:');

    state.nextActions.forEach((item, index) => console.log(`${index + 1}. ${item}`));
  }

  if (state.blockers.length) {
    console.log();
    console.log('Blockers:');

    state.blockers.forEach((item) => console.log(`- ${item}`));
  }

  if (state.lastSession) {
    console.log();
    console.log(`Last session: ${state.lastSession.agent} / ${state.lastSession.nativeSessionId}`);
  }
}

async function main() {
  const [command = 'help', ...args] = process.argv.slice(2);

  const project = new ProjectManager().detect(after(args, '--project') ?? process.cwd());

  const storage = storageFor(project);

  if (command === 'reconcile') {
    const state = await reconcileWorkState(project, storage);

    printState(state);

    return;
  }

  if (command === 'status') {
    const state = await loadWorkState(project, storage);

    if (!state) {
      console.log('No active work state yet.');

      return;
    }

    printState(state);

    return;
  }

  if (command === 'json') {
    const state = await loadWorkState(project, storage);

    console.log(JSON.stringify(state, null, 2));

    return;
  }

  console.log(
    `Work Continuity

Commands:
  status [--project PATH]
  json [--project PATH]
  reconcile [--project PATH]
`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);

  process.exit(1);
});
