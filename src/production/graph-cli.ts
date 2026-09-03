/**
 * ToolNet Memory Graph CLI
 *
 * Launches the code graph visualization UI.
 */

import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { graphTokenIsStrong, isLoopbackGraphHost } from '../visualization/security.js';
import {
  renderHeader,
  renderSuccess,
  renderError,
  dim,
  cyan,
  type CliUiOptions,
} from './ui/cli-ui.js';

interface GraphCliOptions {
  tty?: boolean;
  noColor?: boolean;
}

function toCliUiOptions(options: GraphCliOptions): CliUiOptions {
  return {
    tty: options.tty,
    noColor: options.noColor,
  };
}

async function startGraphUI(options: GraphCliOptions): Promise<void> {
  const uiOpts = toCliUiOptions(options);

  console.log('');
  console.log(renderHeader('Code Graph', undefined, uiOpts));
  console.log('');

  const moduleDir = dirname(fileURLToPath(import.meta.url));

  // Production bundle layout:
  // bundle/graph-cli.js
  // bundle/graph-ui.js
  // bundle/public/*
  const serverPath = resolve(moduleDir, 'graph-ui.js');

  const PORT = process.env.TOOLNET_GRAPH_PORT ?? '9749';
  const HOST = process.env.TOOLNET_GRAPH_HOST ?? '127.0.0.1';
  const graphToken = process.env.TOOLNET_GRAPH_TOKEN?.trim();
  if (!isLoopbackGraphHost(HOST)) {
    console.warn(`  WARNING: Graph UI is exposed beyond localhost at ${HOST}:${PORT}`);
    if (graphToken) {
      console.warn('  Graph API bearer authentication: enabled');
    } else {
      console.warn('  WARNING: Graph API bearer authentication: disabled');
      console.warn('  Set TOOLNET_GRAPH_TOKEN before exposing this port to an untrusted network.');
    }
    console.log('');
  }
  if (graphToken && !graphTokenIsStrong(graphToken)) {
    console.warn('  WARNING: TOOLNET_GRAPH_TOKEN should contain at least 24 random bytes.');
    console.log('');
  }
  console.log(dim('  Starting visualization server...', uiOpts));
  console.log('');

  const child = spawn(process.execPath, [serverPath], {
    stdio: 'inherit',
    env: {
      ...process.env,
      TOOLNET_GRAPH_PORT: PORT,
      TOOLNET_GRAPH_HOST: HOST,
    },
  });

  // Wait a moment for server to start
  await new Promise((resolve) => setTimeout(resolve, 1000));

  console.log(renderSuccess(uiOpts) + ' Graph UI started');
  console.log('');
  console.log(`  ${cyan(`http://${HOST}:${PORT}`, uiOpts)}`);
  console.log('');
  console.log(dim('  Press Ctrl+C to stop', uiOpts));
  console.log('');

  // Handle cleanup
  process.on('SIGINT', () => {
    child.kill('SIGTERM');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    child.kill('SIGTERM');
    process.exit(0);
  });

  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.log('');
      console.log(renderError(uiOpts) + ' Graph UI stopped unexpectedly');
      console.log('');
      process.exit(code);
    }
  });
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const options: GraphCliOptions = {
    tty: process.stdout.isTTY,
    noColor: process.env.NO_COLOR !== undefined || args.includes('--no-color'),
  };

  await startGraphUI(options);
}

main().catch((error) => {
  console.error('');
  console.error(error instanceof Error ? error.message : String(error));
  console.error('');
  process.exitCode = 1;
});
