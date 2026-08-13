import { installClaudeIntegration } from './installer.js';

function main(): void {
  const command = process.argv[2] ?? 'install';

  if (command !== 'install') {
    throw new Error('Usage: toolnet-memory integrate:claude');
  }

  const result = installClaudeIntegration();

  console.log('✅ Claude Code integration installed');

  console.log(`Hooks: ${result.hooks.settingsFile}`);

  console.log(`MCP: ${result.mcp.configFile}`);

  console.log('Server: toolnet-memory');
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));

  process.exitCode = 1;
}
