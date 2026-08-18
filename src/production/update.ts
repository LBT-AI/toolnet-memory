import fs from 'node:fs';

import path from 'node:path';

import { fileURLToPath } from 'node:url';

import { spawn } from 'node:child_process';

import { CliProgress } from './cli-progress.js';

const PACKAGE = 'toolnet-memory';

interface RunResult {
  status: number;

  stdout: string;

  stderr: string;
}

function run(
  command: string,

  args: string[]
): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],

      env: process.env,
    });

    let stdout = '';

    let stderr = '';

    child.stdout?.setEncoding('utf8');

    child.stderr?.setEncoding('utf8');

    child.stdout?.on('data', (chunk: string) => {
      stdout += chunk;
    });

    child.stderr?.on('data', (chunk: string) => {
      stderr += chunk;
    });

    child.once('error', reject);

    child.once('close', (code) => {
      resolve({
        status: code ?? 1,

        stdout,

        stderr,
      });
    });
  });
}

function localPackageRoot() {
  const here = path.dirname(fileURLToPath(import.meta.url));

  return path.resolve(here, '..');
}

function readVersion(root: string) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

    return String(pkg.version ?? 'unknown');
  } catch {
    return 'unknown';
  }
}

function detectPrefix(root: string): string | null {
  const marker = `${path.sep}lib${path.sep}` + `node_modules${path.sep}${PACKAGE}`;

  if (root.endsWith(marker)) {
    const prefix = root.slice(0, -marker.length);

    return prefix || path.parse(root).root;
  }

  return null;
}

async function main() {
  const root = localPackageRoot();

  const current = readVersion(root);

  console.log('');
  console.log('◇ ToolNet Memory Update');
  console.log('');
  console.log('│');

  const check = new CliProgress('Checking npm registry', {
    stream: process.stdout,
    display: 'bar',
    intervalMs: 180,
  }).start();

  let latestResult: RunResult;

  try {
    latestResult = await run('npm', ['view', `${PACKAGE}@latest`, 'version', '--silent']);
  } catch (error) {
    check.fail('Unable to reach npm registry');

    throw error;
  }

  if (latestResult.status !== 0) {
    check.fail('Unable to check latest version');

    if (latestResult.stderr.trim()) {
      console.error(latestResult.stderr.trim());
    }

    process.exitCode = 1;

    return;
  }

  const latest = latestResult.stdout.trim();

  check.succeed(`Checking registry — done`);

  console.log('│');
  console.log(`◆ Current   v${current}`);
  console.log(`◆ Latest    v${latest}`);
  console.log('│');

  if (current === latest) {
    console.log('└ ◆ Already up to date');
    console.log('');

    return;
  }

  const prefix = detectPrefix(root);

  if (!prefix) {
    console.log('This appears to be a development checkout.');

    console.log('');

    console.log('Self-update is disabled for source checkouts.');

    console.log('');

    console.log('For the published CLI, install/update with:');

    console.log('  npm install -g toolnet-memory@latest');

    console.log('');

    process.exitCode = 1;

    return;
  }

  const install = new CliProgress('Downloading & installing', {
    stream: process.stdout,
    display: 'bar',
    intervalMs: 180,
  }).start();

  let result: RunResult;

  try {
    result = await run('npm', [
      'install',
      '-g',

      '--prefix',
      prefix,

      `${PACKAGE}@${latest}`,

      '--no-fund',
      '--no-audit',

      '--loglevel=error',
    ]);
  } catch (error) {
    install.fail('ToolNet Memory update failed');

    throw error;
  }

  if (result.status !== 0) {
    install.fail('ToolNet Memory update failed');

    if (result.stderr.trim()) {
      console.error('');
      console.error(result.stderr.trim());
    }

    console.error('');
    console.error('Retry with:');

    console.error(`  npm install -g ${PACKAGE}@${latest}`);

    console.error('');

    process.exitCode = result.status || 1;

    return;
  }

  install.succeed(`Downloading & installing — done`);

  console.log('│');
  console.log(`└ ◆ Updated to v${latest}`);
  console.log('');
}

main().catch((error) => {
  console.error('');

  console.error(error instanceof Error ? error.message : String(error));

  console.error('');

  process.exitCode = 1;
});
