import { runNewAgentIntegrationCli } from '../new-agents/cli.js';

try {
  runNewAgentIntegrationCli('copilot');
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
