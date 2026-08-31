import { installToolNetCliIntegration } from './installer.js';

import { inspectToolNetCliIntegrationStatus } from './status.js';

function printStatus(): boolean {
  const status = inspectToolNetCliIntegrationStatus();

  console.log('ToolNet CLI Integration');
  console.log('=======================');
  console.log('');
  console.log(`State : ${status.state}`);
  console.log(`MCP   : ${status.mcp.configured ? 'ready' : 'missing'} — ${status.mcp.configFile}`);

  for (const error of status.errors) {
    console.log(`Error : ${error}`);
  }

  console.log('');

  return status.installed;
}

function main(): void {
  const args = process.argv.slice(2);

  const json = args.includes('--json');

  const wantsStatus = args.includes('--status') || args[0] === 'status';

  if (wantsStatus) {
    const status = inspectToolNetCliIntegrationStatus();

    if (json) {
      console.log(JSON.stringify(status, null, 2));
    } else {
      printStatus();
    }

    if (!status.installed) {
      process.exitCode = 1;
    }

    return;
  }

  const force = args.includes('--force');

  const result = installToolNetCliIntegration({ force });

  const status = inspectToolNetCliIntegrationStatus();

  if (!status.installed) {
    throw new Error(
      `ToolNet CLI integration installation did not verify successfully (state=${status.state}).`
    );
  }

  if (json) {
    console.log(
      JSON.stringify(
        {
          installed: true,

          changed: result.changed,

          files: result.files,

          status,
        },
        null,
        2
      )
    );

    return;
  }

  console.log(`ToolNet CLI MCP: ${result.mcp.configured ? 'configured' : 'not configured'}`);

  if (result.changed) {
    console.log(`Config updated: ${result.mcp.configFile}`);
  } else {
    console.log('Config unchanged (already configured)');
  }

  console.log('');
  console.log('ToolNet CLI integration ready.');
}

main();
