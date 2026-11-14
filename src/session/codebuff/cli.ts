import { installCodebuffMcp } from './mcp-installer.js';

import { inspectCodebuffStatus } from './status.js';

function after(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);

  return index >= 0 ? args[index + 1] : undefined;
}

function main() {
  const [command = 'help', ...args] = process.argv.slice(2);

  if (command === 'install' || command === 'install-mcp') {
    const cwd = after(args, '--project');

    const result = installCodebuffMcp({
      ...(after(args, '--file') ? { configFile: after(args, '--file') } : {}),
      ...(after(args, '--bin') ? { binary: after(args, '--bin') } : {}),
      ...(cwd ? { cwd } : {}),
      force: args.includes('--force'),
    });

    console.log(`Codebuff MCP configured: ${result.configFile}`);

    return;
  }

  if (command === 'status') {
    const status = inspectCodebuffStatus();

    console.log('Codebuff Integration Status');
    console.log('===========================');
    console.log(`Installed       : ${status.installed ? 'yes' : 'no'}`);
    console.log(`State           : ${status.state}`);
    console.log(`MCP configured  : ${status.mcp.configured ? 'yes' : 'no'}`);
    console.log(`MCP config file : ${status.mcp.configFile}`);
    console.log('Capture mode    : MCP only (no native lifecycle hooks)');

    return;
  }

  console.log(`Codebuff MCP Adapter

Commands:
  install / install-mcp
    --project PATH                   Write <project>/.agents/mcp.json
    --file PATH                      Explicit .agents/mcp.json
    --bin PATH                       ToolNet binary
    --force                          Rewrite existing entry

  status

Codebuff exposes no native lifecycle hooks; ToolNet Memory integrates
through MCP only. Session capture is not automatic.
`);
}

main();
