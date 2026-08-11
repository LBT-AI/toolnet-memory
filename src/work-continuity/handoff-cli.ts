import { findProjectRoot } from './fast-context.js';

import { refreshFastHandoffFromCurrent } from './handoff-refresh.js';

import { ProjectManager } from '../core/index.js';

function main(): void {
  const cwd = process.cwd();

  const root = findProjectRoot(cwd);

  if (!root) {
    console.error('Not in a ToolNet project.');

    process.exitCode = 1;

    return;
  }

  const project = new ProjectManager().detect(root);

  if (!project) {
    console.error('Unable to detect ToolNet project.');

    process.exitCode = 1;

    return;
  }

  const result = refreshFastHandoffFromCurrent(project);

  console.log(
    JSON.stringify(
      {
        project: project.name,

        ...result,
      },
      null,
      2
    )
  );
}

main();
