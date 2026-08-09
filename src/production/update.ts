import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const PACKAGE = 'toolnet-memory';

function run(
  command: string,
  args: string[],
  options: {
    capture?: boolean;
  } = {}
) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
}

function localPackageRoot() {
  const here = path.dirname(fileURLToPath(import.meta.url));

  // bundle/update.js -> package root
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
  const marker = `${path.sep}lib${path.sep}node_modules${path.sep}${PACKAGE}`;

  if (root.endsWith(marker)) {
    const prefix = root.slice(0, -marker.length);

    return prefix || path.parse(root).root;
  }

  return null;
}

function main() {
  const root = localPackageRoot();

  const current = readVersion(root);

  const latestResult = run('npm', ['view', `${PACKAGE}@latest`, 'version', '--silent'], {
    capture: true,
  });

  if (latestResult.status !== 0) {
    console.error('Unable to check the latest ToolNet Memory version.');

    if (latestResult.stderr) {
      console.error(latestResult.stderr.trim());
    }

    process.exit(1);
  }

  const latest = (latestResult.stdout ?? '').trim();

  console.log('');
  console.log('ToolNet Memory Update');
  console.log('=====================');
  console.log('');
  console.log(`Current: v${current}`);
  console.log(`Latest : v${latest}`);
  console.log('');

  if (current === latest) {
    console.log('✓ ToolNet Memory is already up to date');
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
    console.log('  npx toolnet-memory-install');
    console.log('');
    process.exit(1);
  }

  console.log(`Updating to v${latest}...`);
  console.log('');

  const result = run('npm', [
    'install',
    '-g',
    '--prefix',
    prefix,
    `${PACKAGE}@latest`,
    '--no-fund',
    '--no-audit',
    '--loglevel=error',
  ]);

  if (result.status !== 0) {
    console.error('');
    console.error('✗ Update failed');
    console.error('');
    console.error('You can retry using:');
    console.error('  npx toolnet-memory-install');

    process.exit(result.status ?? 1);
  }

  console.log('');
  console.log(`✓ ToolNet Memory updated to v${latest}`);
  console.log('');
}

main();
