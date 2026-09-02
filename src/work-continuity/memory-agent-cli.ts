import { askMemoryAgent } from './memory-agent.js';

import { ProjectManager } from '../core/index.js';

async function main(): Promise<void> {
  const question = process.argv.slice(2).join(' ').trim();

  if (!question) {
    console.error('Usage: toolnet-memory ask "<question>"');
    process.exitCode = 1;
    return;
  }

  let project;
  try {
    project = new ProjectManager().requireExisting(process.cwd());
  } catch (error) {
    if (error instanceof Error && error.message === 'PROJECT_NOT_INITIALIZED') {
      console.error('PROJECT_NOT_INITIALIZED');
      process.exitCode = 1;
      return;
    }
    throw error;
  }

  const result = await askMemoryAgent(project, question);

  process.stdout.write(`${result.answer}\n`);

  if (process.env.TOOLNET_MEMORY_AGENT_DEBUG === '1') {
    process.stderr.write(
      ['', `[ToolNet Memory Agent] local=${result.usedAi ? 'no' : 'yes'}`]
        .filter(Boolean)
        .join('\n') + '\n'
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
