import { findProjectRoot } from './fast-context.js';

import { answerMemoryQuestion } from './memory-query.js';

import { ProjectManager } from '../core/index.js';

function main(): void {
  const question = process.argv.slice(2).join(' ').trim();

  if (!question) {
    console.error('Usage: toolnet-memory ask "<question>"');

    process.exitCode = 1;

    return;
  }

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

  const result = answerMemoryQuestion(project, question);

  process.stdout.write(`${result.answer}\n`);
}

main();
