import { installKiroIntegration } from './installer.js';

import { inspectKiroIntegrationStatus } from './status.js';

function printStatus(): boolean {
  const status = inspectKiroIntegrationStatus();

  console.log('Kiro CLI Integration');
  console.log('====================');
  console.log('');
  console.log(`State : ${status.state}`);
  console.log(`MCP   : ${status.mcp.configured ? 'ready' : 'missing'} — ${status.mcp.configFile}`);
  console.log(
    `Hooks : ${status.hooks.configured ? 'ready' : 'missing'} — ${status.hooks.hooksFile}`
  );

  if (status.hooks.triggers.length > 0) {
    console.log(`Events: ${status.hooks.triggers.join(', ')}`);
  }

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
    const status = inspectKiroIntegrationStatus();

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

  const result = installKiroIntegration();

  const status = inspectKiroIntegrationStatus();

  if (!status.installed) {
    throw new Error(
      `Kiro integration installation did not verify successfully (state=${status.state}).`
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

  console.log('✅ Kiro CLI integration installed');
  console.log(`MCP: ${result.mcp.configFile}`);
  console.log(`Hooks: ${result.hooks.hooksFile}`);
  console.log('Server: toolnet-memory');
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));

  process.exitCode = 1;
}
