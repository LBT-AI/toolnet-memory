import { spawnSync } from 'node:child_process';

import {
  chmodSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from 'node:fs';

import { tmpdir } from 'node:os';

import { basename, dirname, join, resolve } from 'node:path';

import { fileURLToPath } from 'node:url';

export interface ProductionReadinessCheck {
  id: string;

  label: string;

  passed: boolean;

  detail?: string;
}

export interface ProductionReadinessResult {
  passed: boolean;

  total: number;

  passedCount: number;

  checks: ProductionReadinessCheck[];
}

export const PRODUCTION_PACK_REQUIRED_FILES = [
  'package.json',
  'bin/toolnet-memory',
  'bundle/init.js',
  'bundle/auto-integrate.js',
  'bundle/kiro.js',
  'bundle/kiro-hook.js',
  'bundle/cursor.js',
  'bundle/cursor-hook.js',
  'bundle/copilot.js',
  'bundle/copilot-hook.js',
  'bundle/grok.js',
  'bundle/grok-hook.js',
  'bundle/mcp.js',
  'bundle/continuity-certify.js',
  'bundle/recovery-certify.js',
  'bundle/production-certify.js',
] as const;

const PRODUCTION_BUNDLE_REQUIRED_FILES = [
  'init.js',
  'auto-integrate.js',
  'kiro.js',
  'kiro-hook.js',
  'cursor.js',
  'cursor-hook.js',
  'copilot.js',
  'copilot-hook.js',
  'grok.js',
  'grok-hook.js',
  'mcp.js',
  'continuity-certify.js',
  'recovery-certify.js',
  'production-certify.js',
] as const;

interface CommandResult {
  status: number | null;

  stdout: string;

  stderr: string;
}

interface RuntimeMirrorResult {
  firstStatus: number | null;

  secondStatus: number | null;

  firstId?: string;

  secondId?: string;

  sourceAbsent: boolean;

  detail?: string;
}

export interface PackedRuntimeValidation {
  passed: boolean;

  missing: string[];

  sourceFiles: string[];
}

function currentPackageRoot(): string {
  if (process.env.TOOLNET_PACKAGE_ROOT?.trim()) {
    return resolve(process.env.TOOLNET_PACKAGE_ROOT);
  }

  const currentDirectory = dirname(fileURLToPath(import.meta.url));

  /*
   * Production bundle:
   *   <root>/bundle/production-certify.js
   */
  if (basename(currentDirectory) === 'bundle') {
    return dirname(currentDirectory);
  }

  /*
   * Source / tsx:
   *   <root>/src/production/production-certify.ts
   */
  if (
    basename(currentDirectory) === 'production' &&
    basename(dirname(currentDirectory)) === 'src'
  ) {
    return dirname(dirname(currentDirectory));
  }

  return process.cwd();
}

function run(
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv = process.env
): CommandResult {
  const result = spawnSync(command, args, {
    cwd,

    env,

    encoding: 'utf8',

    timeout: 30_000,

    maxBuffer: 10 * 1024 * 1024,
  });

  return {
    status: result.status,

    stdout: result.stdout ?? '',

    stderr: result.stderr ?? '',
  };
}

function compactError(result: CommandResult): string {
  const value = `${result.stdout}\n${result.stderr}`.trim();

  if (!value) {
    return `exit=${String(result.status)}`;
  }

  return value.slice(-1200);
}

function check(
  id: string,
  label: string,
  passed: boolean,
  detail?: string
): ProductionReadinessCheck {
  return {
    id,

    label,

    passed,

    detail: passed ? undefined : detail,
  };
}

export function validatePackedRuntimeFiles(files: string[]): PackedRuntimeValidation {
  const normalized = files.map((file) => file.replace(/\\/gu, '/'));

  const present = new Set(normalized);

  const missing = PRODUCTION_PACK_REQUIRED_FILES.filter((required) => !present.has(required));

  const sourceFiles = normalized.filter((file) => file === 'src' || file.startsWith('src/'));

  return {
    passed: missing.length === 0 && sourceFiles.length === 0,

    missing: [...missing],

    sourceFiles,
  };
}

function npmPackedFiles(packageRoot: string): {
  files: string[];

  error?: string;
} {
  const result = run('npm', ['pack', '--dry-run', '--json'], packageRoot);

  if (result.status !== 0) {
    return {
      files: [],

      error: compactError(result),
    };
  }

  try {
    const parsed = JSON.parse(result.stdout) as
      | {
          files?: Array<{
            path?: string;
          }>;
        }
      | Array<{
          files?: Array<{
            path?: string;
          }>;
        }>;

    const entry = Array.isArray(parsed) ? parsed[0] : parsed;

    const files =
      entry?.files
        ?.map((item) => item.path)
        .filter((value): value is string => typeof value === 'string') ?? [];

    return {
      files,
    };
  } catch (error) {
    return {
      files: [],

      error:
        error instanceof Error ? `Cannot parse npm pack JSON: ${error.message}` : String(error),
    };
  }
}

function readManifestId(file: string): string | undefined {
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as {
      id?: unknown;
    };

    return typeof parsed.id === 'string' && parsed.id.trim() ? parsed.id : undefined;
  } catch {
    return undefined;
  }
}

function runPackagedRuntimeInit(packageRoot: string): RuntimeMirrorResult {
  const base = mkdtempSync(join(tmpdir(), 'toolnet-x3-runtime-'));

  const runtimeRoot = join(base, 'package');

  const projectRoot = join(base, 'project');

  try {
    mkdirSync(join(runtimeRoot, 'bin'), {
      recursive: true,
    });

    mkdirSync(projectRoot, {
      recursive: true,
    });

    cpSync(join(packageRoot, 'bin', 'toolnet-memory'), join(runtimeRoot, 'bin', 'toolnet-memory'));

    chmodSync(join(runtimeRoot, 'bin', 'toolnet-memory'), 0o755);

    cpSync(join(packageRoot, 'bundle'), join(runtimeRoot, 'bundle'), {
      recursive: true,
    });

    cpSync(join(packageRoot, 'package.json'), join(runtimeRoot, 'package.json'));

    /*
     * Simulate dependencies installed beside the package.
     *
     * The important X3 property is that src/ is NOT present.
     */
    const nodeModules = join(packageRoot, 'node_modules');

    if (!existsSync(nodeModules)) {
      return {
        firstStatus: null,

        secondStatus: null,

        sourceAbsent: true,

        detail: 'node_modules is missing; run npm ci first.',
      };
    }

    symlinkSync(nodeModules, join(runtimeRoot, 'node_modules'), 'dir');

    const binary = join(runtimeRoot, 'bin', 'toolnet-memory');

    const args = ['init', '--project', projectRoot, '--json', '--no-integrate'];

    const environment = {
      ...process.env,

      TOOLNET_MEMORY_BIN: binary,

      TOOLNET_PACKAGE_ROOT: runtimeRoot,
    };

    const first = run(binary, args, projectRoot, environment);

    const manifest = join(projectRoot, '.toolnet', 'project.json');

    const firstId = readManifestId(manifest);

    const second = run(binary, args, projectRoot, environment);

    const secondId = readManifestId(manifest);

    return {
      firstStatus: first.status,

      secondStatus: second.status,

      firstId,

      secondId,

      sourceAbsent: !existsSync(join(runtimeRoot, 'src')),

      detail:
        first.status === 0 && second.status === 0
          ? undefined
          : ['First init:', compactError(first), '', 'Second init:', compactError(second)].join(
              '\n'
            ),
    };
  } finally {
    rmSync(base, {
      recursive: true,

      force: true,
    });
  }
}

function runBundleCertification(packageRoot: string, file: string): CommandResult {
  return run(process.execPath, [join(packageRoot, 'bundle', file)], packageRoot, {
    ...process.env,

    TOOLNET_PACKAGE_ROOT: packageRoot,
  });
}

export async function certifyProductionReadiness(
  packageRoot = currentPackageRoot()
): Promise<ProductionReadinessResult> {
  const checks: ProductionReadinessCheck[] = [];

  const packageFile = join(packageRoot, 'package.json');

  const binFile = join(packageRoot, 'bin', 'toolnet-memory');

  const bundleRoot = join(packageRoot, 'bundle');

  let packageJson: {
    name?: unknown;
    version?: unknown;
    bin?: unknown;
    files?: unknown;
  } = {};

  try {
    packageJson = JSON.parse(readFileSync(packageFile, 'utf8')) as typeof packageJson;
  } catch {
    // handled by check below
  }

  const packageBin =
    packageJson.bin && typeof packageJson.bin === 'object'
      ? (packageJson.bin as Record<string, unknown>)['toolnet-memory']
      : undefined;

  const configuredFiles = Array.isArray(packageJson.files) ? packageJson.files : [];

  checks.push(
    check(
      'package-manifest',
      'package manifest valid',
      packageJson.name === 'toolnet-memory' &&
        typeof packageJson.version === 'string' &&
        packageJson.version.length > 0 &&
        packageBin === 'bin/toolnet-memory' &&
        configuredFiles.includes('bundle') &&
        configuredFiles.includes('bin/toolnet-memory'),
      'package.json does not expose the expected production package.'
    )
  );

  const packed = npmPackedFiles(packageRoot);

  const packedValidation = validatePackedRuntimeFiles(packed.files);

  checks.push(
    check(
      'npm-package',
      'npm package contains production runtime only',
      !packed.error && packedValidation.passed,
      packed.error ??
        [
          packedValidation.missing.length > 0
            ? `Missing: ${packedValidation.missing.join(', ')}`
            : '',
          packedValidation.sourceFiles.length > 0
            ? `Unexpected src files: ${packedValidation.sourceFiles.join(', ')}`
            : '',
        ]
          .filter(Boolean)
          .join('\n')
    )
  );

  let cliExecutable = false;

  if (existsSync(binFile)) {
    try {
      cliExecutable = (lstatSync(binFile).mode & 0o111) !== 0;
    } catch {
      cliExecutable = false;
    }
  }

  const versionResult = existsSync(binFile)
    ? run(binFile, ['--version'], packageRoot)
    : {
        status: null,

        stdout: '',

        stderr: 'CLI file does not exist.',
      };

  checks.push(
    check(
      'cli',
      'CLI executable and version command works',
      cliExecutable &&
        versionResult.status === 0 &&
        typeof packageJson.version === 'string' &&
        `${versionResult.stdout}${versionResult.stderr}`.includes(packageJson.version),
      compactError(versionResult)
    )
  );

  const missingBundles = PRODUCTION_BUNDLE_REQUIRED_FILES.filter(
    (file) => !existsSync(join(bundleRoot, file))
  );

  checks.push(
    check(
      'bundle-complete',
      'production bundle complete',
      missingBundles.length === 0,
      missingBundles.length > 0 ? `Missing bundles: ${missingBundles.join(', ')}` : undefined
    )
  );

  const mirror = runPackagedRuntimeInit(packageRoot);

  checks.push(
    check(
      'init-outside-source',
      'init works outside source tree',
      mirror.firstStatus === 0 && mirror.sourceAbsent && Boolean(mirror.firstId),
      mirror.detail ??
        `firstStatus=${String(mirror.firstStatus)}, sourceAbsent=${String(
          mirror.sourceAbsent
        )}, projectId=${String(mirror.firstId)}`
    )
  );

  checks.push(
    check(
      'stable-project-id',
      'project identity remains stable after re-init',
      mirror.firstStatus === 0 &&
        mirror.secondStatus === 0 &&
        Boolean(mirror.firstId) &&
        mirror.firstId === mirror.secondId,
      `first=${String(mirror.firstId)}, second=${String(mirror.secondId)}`
    )
  );

  let binText = '';

  try {
    binText = readFileSync(binFile, 'utf8');
  } catch {
    binText = '';
  }

  checks.push(
    check(
      'auto-integration',
      'automatic integration production entry available',
      existsSync(join(bundleRoot, 'auto-integrate.js')) &&
        binText.includes('bundle/auto-integrate.js'),
      'auto-integrate production bundle or CLI routing is missing.'
    )
  );

  checks.push(
    check(
      'kiro-integration',
      'Kiro CLI production integration available',
      existsSync(join(bundleRoot, 'kiro.js')) &&
        existsSync(join(bundleRoot, 'kiro-hook.js')) &&
        binText.includes('integrate:kiro)') &&
        binText.includes('session:kiro-hook)') &&
        binText.includes('bundle/kiro.js') &&
        binText.includes('bundle/kiro-hook.js'),
      'Kiro production bundle or CLI routing is missing.'
    )
  );

  checks.push(
    check(
      'cursor-copilot-grok-integrations',
      'Cursor, Copilot and Grok production integrations available',
      existsSync(join(bundleRoot, 'cursor.js')) &&
        existsSync(join(bundleRoot, 'cursor-hook.js')) &&
        existsSync(join(bundleRoot, 'copilot.js')) &&
        existsSync(join(bundleRoot, 'copilot-hook.js')) &&
        existsSync(join(bundleRoot, 'grok.js')) &&
        existsSync(join(bundleRoot, 'grok-hook.js')) &&
        binText.includes('integrate:cursor)') &&
        binText.includes('session:cursor-hook)') &&
        binText.includes('integrate:copilot)') &&
        binText.includes('session:copilot-hook)') &&
        binText.includes('integrate:grok)') &&
        binText.includes('session:grok-hook)') &&
        binText.includes('bundle/cursor.js') &&
        binText.includes('bundle/cursor-hook.js') &&
        binText.includes('bundle/copilot.js') &&
        binText.includes('bundle/copilot-hook.js') &&
        binText.includes('bundle/grok.js') &&
        binText.includes('bundle/grok-hook.js'),
      'Cursor/Copilot/Grok production bundle or CLI routing is missing.'
    )
  );

  checks.push(
    check(
      'mcp-bootstrap',
      'MCP production bootstrap available',
      existsSync(join(bundleRoot, 'mcp.js')) &&
        binText.includes('run bundle/mcp.js src/mcp/bootstrap.ts'),
      'MCP production bundle or CLI routing is missing.'
    )
  );

  const x1 = runBundleCertification(packageRoot, 'continuity-certify.js');

  checks.push(
    check('x1', 'X1 cross-agent certification passes', x1.status === 0, compactError(x1))
  );

  const x2 = runBundleCertification(packageRoot, 'recovery-certify.js');

  checks.push(check('x2', 'X2 recovery certification passes', x2.status === 0, compactError(x2)));

  const passedCount = checks.filter((item) => item.passed).length;

  return {
    passed: passedCount === checks.length,

    total: checks.length,

    passedCount,

    checks,
  };
}
