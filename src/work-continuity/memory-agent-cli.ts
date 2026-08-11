import { findProjectRoot } from './fast-context.js';

import { askMemoryAgent } from './memory-agent.js';

import { ProjectManager } from '../core/index.js';

async function main(): Promise<void> {
  const question = process.argv.slice(2).join(' ').trim();

  if (!question) {
    console.error('Usage: toolnet-memory ask-ai "<question>"');

    process.exitCode = 1;

    return;
  }

  const root = findProjectRoot(process.cwd());

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

  const result = await askMemoryAgent(project, question);

  process.stdout.write(`${result.answer}\n`);

  if (process.env.TOOLNET_MEMORY_AGENT_DEBUG === '1') {
    process.stderr.write(
      [
        '',
        `[ToolNet Memory Agent] AI: ${result.usedAi ? 'yes' : 'fallback'}`,
        result.provider ? `Provider: ${result.provider}` : '',
        result.model ? `Model: ${result.model}` : '',
      ]
        .filter(Boolean)
        .join('\n') + '\n'
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));

  process.exitCode = 1;
});
