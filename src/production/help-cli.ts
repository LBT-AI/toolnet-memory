import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  findSimilarCommands,
  generateCommandHelp,
  generateDefaultHelp,
  generateFullHelp,
} from '../../packages/cli/help.js';

import { resolvePackageVersion } from '../runtime/build-identity.js';

/**
 * Phase 84D1 — help reports the same version truth as the daemon and the
 * standalone binary, resolved by the shared build-identity module rather than by
 * its own package.json search.
 */
function readVersion(): string {
  const resolved = resolvePackageVersion({
    from: dirname(fileURLToPath(import.meta.url)),
  });

  return resolved.source === 'fallback'
    ? (process.env.npm_package_version ?? 'unknown')
    : resolved.value;
}

const args = process.argv.slice(2);

const options = {
  version: readVersion(),
  tty: Boolean(process.stdout.isTTY),
};

function printUnknown(command: string): void {
  const similar = findSimilarCommands(command);

  console.error('');
  console.error(`✕ Unknown command: ${command}`);

  if (similar.length > 0) {
    console.error('');
    console.error('  Did you mean:');

    for (const item of similar) {
      console.error(`    ${item}`);
    }
  }

  console.error('');
  console.error('  Run `toolnet-memory help` to see available commands.');
  console.error('');
}

if (args[0] === '--unknown') {
  printUnknown(args[1] ?? '');
  process.exitCode = 1;
} else if (args[0] === '--all') {
  console.log(generateFullHelp(options));
} else if (args[0]) {
  const help = generateCommandHelp(args[0], options);

  if (help) {
    console.log(help);
  } else {
    printUnknown(args[0]);
    process.exitCode = 1;
  }
} else {
  console.log(generateDefaultHelp(options));
}
