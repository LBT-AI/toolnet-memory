import { existsSync } from 'node:fs';
import { arch, platform } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);

function valueAfter(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

const target = valueAfter('--target');
const binaryRaw = valueAfter('--binary');

if (!target || !binaryRaw) {
  console.error('Usage: standalone-ci-smoke --target TARGET --binary FILE');
  process.exitCode = 1;
} else {
  const binary = resolve(binaryRaw);
  const match = target.match(/^node22-(linux|macos|win)-(x64|arm64)$/u);
  if (!match) {
    console.error(`Invalid target: ${target}`);
    process.exitCode = 1;
  } else if (!existsSync(binary)) {
    console.error(`Standalone binary missing: ${binary}`);
    process.exitCode = 1;
  } else {
    const runnerPlatform =
      platform() === 'darwin' ? 'macos' : platform() === 'win32' ? 'win' : 'linux';
    const targetPlatform = match[1];
    const targetArch = match[2];
    if (runnerPlatform !== targetPlatform || arch() !== targetArch) {
      console.log(
        [
          'STANDALONE_RUNTIME_SMOKE=SKIP',
          `target=${target}`,
          `runner=${runnerPlatform}-${arch()}`,
        ].join(' ')
      );
    } else {
      const version = spawnSync(binary, ['--version'], { encoding: 'utf8' });
      process.stdout.write(version.stdout ?? '');
      process.stderr.write(version.stderr ?? '');
      if (version.status !== 0) {
        console.error('STANDALONE_VERSION_SMOKE=FAIL');
        process.exitCode = 1;
      } else {
        const help = spawnSync(binary, ['help'], { encoding: 'utf8' });
        if (help.status !== 0) {
          process.stdout.write(help.stdout ?? '');
          process.stderr.write(help.stderr ?? '');
          console.error('STANDALONE_HELP_SMOKE=FAIL');
          process.exitCode = 1;
        } else {
          console.log('STANDALONE_RUNTIME_SMOKE=PASS');
        }
      }
    }
  }
}
