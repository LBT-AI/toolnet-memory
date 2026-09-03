import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { arch, platform } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const args = process.argv.slice(2);

function valueAfter(flag) {
  const index = args.indexOf(flag);
  if (index < 0) {
    return undefined;
  }
  return args[index + 1];
}

function hostPlatform() {
  if (platform() === 'darwin') {
    return 'macos';
  }
  if (platform() === 'win32') {
    return 'win';
  }
  return 'linux';
}

function hostTarget() {
  return ['node22', hostPlatform(), arch()].join('-');
}

function targetParts(target) {
  const match = target.match(/^node22-(linux|macos|win)-(x64|arm64)$/u);
  if (!match) {
    throw new Error(
      [
        `Unsupported standalone target: ${target}`,
        '',
        'Expected:',
        '  node22-linux-x64',
        '  node22-linux-arm64',
        '  node22-macos-x64',
        '  node22-macos-arm64',
        '  node22-win-x64',
      ].join('\n')
    );
  }
  return { platform: match[1], arch: match[2] };
}

function defaultFilename(target) {
  const parsed = targetParts(target);
  const platformName = parsed.platform === 'win' ? 'windows' : parsed.platform;
  return (
    ['toolnet-memory', platformName, parsed.arch].join('-') +
    (parsed.platform === 'win' ? '.exe' : '')
  );
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const target = valueAfter('--target') ?? hostTarget();
targetParts(target);
const stage = join(root, '.standalone-build');
const publicDir = join(stage, 'public');
const vendorDir = join(publicDir, 'vendor');
const output = resolve(
  root,
  valueAfter('--output') ?? join('dist', 'standalone', defaultFilename(target))
);

rmSync(stage, { recursive: true, force: true });
mkdirSync(vendorDir, { recursive: true });
mkdirSync(dirname(output), { recursive: true });

console.log(`Standalone target: ${target}`);
console.log(`Standalone output: ${output}`);

await build({
  entryPoints: [join(root, 'src', 'standalone', 'cli.ts')],
  outfile: join(stage, 'cli.js'),
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  splitting: false,
  sourcemap: false,
  minify: true,
  legalComments: 'none',
  define: {
    __TOOLNET_VERSION__: JSON.stringify(pkg.version),
  },
  // Bundled dependencies are required because a standalone target must not
  // depend on node_modules on the target host.
  packages: 'bundle',
});

copyFileSync(
  join(root, 'src', 'visualization', 'public', 'index.html'),
  join(publicDir, 'index.html')
);
copyFileSync(
  join(root, 'node_modules', '3d-force-graph', 'dist', '3d-force-graph.min.js'),
  join(vendorDir, '3d-force-graph.min.js')
);

writeFileSync(
  join(stage, 'package.json'),
  JSON.stringify(
    {
      name: 'toolnet-memory-standalone',
      version: pkg.version,
      private: true,
      type: 'module',
      bin: 'cli.js',
      pkg: {
        sea: true,
        assets: ['public/**/*'],
      },
    },
    null,
    2
  ) + '\n'
);

const { exec } = await import('@yao-pkg/pkg');
await exec([stage, '--targets', target, '--output', output, '--compress', 'Brotli', '--sea']);

console.log(`STANDALONE_BUILD=PASS target=${target}`);
console.log(`STANDALONE_BINARY=${output}`);
