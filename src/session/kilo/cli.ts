import { installKiloIntegration } from './installer.js';

import { inspectKiloIntegrationStatus } from './status.js';

function printStatus(): boolean {
  const status = inspectKiloIntegrationStatus();

  console.log('Kilo CLI Integration');
  console.log('====================');
  console.log('');
  console.log(`State : ${status.state}`);
  console.log(`MCP   : ${status.mcp.configured ? 'ready' : 'missing'} — ${status.mcp.configFile}`);
  console.log(`Memory: ${status.capabilities.level}`);
  console.log(`Capture: ${status.capabilities.nativeCapture ? 'native' : 'not available'}`);

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
    const status = inspectKiloIntegrationStatus();

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

  const result = installKiloIntegration({ force });

  const status = inspectKiloIntegrationStatus();

  if (!status.installed) {
    throw new Error(
      `Kilo integration installation did not verify successfully (state=${status.state}).`
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

  console.log(`Kilo MCP: ${result.mcp.configured ? 'configured' : 'not configured'}`);

  if (result.changed) {
    console.log(`Config updated: ${result.mcp.configFile}`);
  } else {
    console.log('Config unchanged (already configured)');
  }

  console.log('');
  console.log('Kilo integration ready.');
}

main();
