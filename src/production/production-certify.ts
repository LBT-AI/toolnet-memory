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

import { createRequire } from 'node:module';

import { fileURLToPath } from 'node:url';
import { parsePackManifestEntries } from '../code-intelligence/release/package-audit.js';
import { certifyMemoryQualityGA } from './memory-quality-ga-certify.js';
import { certifyWikiFleetState } from './wiki-fleet-certify.js';
import { certifyRetrievalProduction } from './retrieval-production-certify.js';
import { certifyAdaptiveRetrieval } from './retrieval-adaptive-certify.js';
import { certifyRetrievalGa } from './retrieval-ga-certify.js';
import { certifyLifecycleDriftControl } from './lifecycle-certify.js';
import { certifyDisasterRecovery } from './disaster-recovery-certify.js';

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
  'release-manifest.json',
  '.release-target',
  'docs/architecture.md',
  'bin/toolnet-memory',
  'bundle/init.js',
  'bundle/auto-integrate.js',
  'bundle/agy.js',
  'bundle/agy-hook.js',
  'bundle/opencode.js',
  'bundle/codex.js',
  'bundle/codex-context.js',
  'bundle/claude.js',
  'bundle/claude-hook.js',
  'bundle/kiro.js',
  'bundle/kiro-hook.js',
  'bundle/cursor.js',
  'bundle/cursor-hook.js',
  'bundle/copilot.js',
  'bundle/copilot-hook.js',
  'bundle/grok.js',
  'bundle/grok-hook.js',
  'bundle/toolnet-cli.js',
  'bundle/kilo.js',
  'bundle/integration-status.js',
  'bundle/background-refresh.js',
  'bundle/memory-review.js',
  'bundle/memory-query.js',
  'bundle/mcp.js',
  'bundle/continuity-certify.js',
  'bundle/recovery-certify.js',
  'bundle/production-certify.js',
  'bundle/goose.js',
  'bundle/goose-hook.js',
  'bundle/qwen.js',
  'bundle/qwen-hook.js',
  'bundle/kimi.js',
  'bundle/kimi-hook.js',
  'bundle/hermes.js',
  'bundle/hermes-hook.js',
  'bundle/qoder.js',
  'bundle/qoder-hook.js',
  'bundle/aider.js',
  'bundle/plandex.js',
  'bundle/openrouter.js',
  'bundle/bob.js',
  'bundle/bob-hook.js',
  'bundle/cline.js',
  'bundle/cline-hook.js',
  'bundle/rovo.js',
  'bundle/rovo-hook.js',
  'bundle/warp.js',
] as const;

const PRODUCTION_BUNDLE_REQUIRED_FILES = [
  'init.js',
  'auto-integrate.js',
  'agy.js',
  'agy-hook.js',
  'opencode.js',
  'codex.js',
  'codex-context.js',
  'claude.js',
  'claude-hook.js',
  'kiro.js',
  'kiro-hook.js',
  'cursor.js',
  'cursor-hook.js',
  'copilot.js',
  'copilot-hook.js',
  'grok.js',
  'grok-hook.js',
  'toolnet-cli.js',
  'kilo.js',
  'integration-status.js',
  'background-refresh.js',
  'memory-review.js',
  'memory-query.js',
  'mcp.js',
  'continuity-certify.js',
  'recovery-certify.js',
  'production-certify.js',
  'goose.js',
  'goose-hook.js',
  'qwen.js',
  'qwen-hook.js',
  'kimi.js',
  'kimi-hook.js',
  'hermes.js',
  'hermes-hook.js',
  'qoder.js',
  'qoder-hook.js',
  'aider.js',
  'plandex.js',
  'openrouter.js',
  'bob.js',
  'bob-hook.js',
  'cline.js',
  'cline-hook.js',
  'rovo.js',
  'rovo-hook.js',
  'warp.js',
] as const;

interface CommandResult {
  status: number | null;

  stdout: string;

  stderr: string;

  /** True when the subprocess was killed for exceeding its time budget. */
  timedOut: boolean;

  /** Wall-clock time spent waiting on the subprocess. */
  elapsedMs: number;
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

export interface RunCommandBudget {
  /**
   * Hard bound for one subprocess invocation.
   *
   * Short interactive checks keep the 30s default. Packaging/build probes
   * (npm pack runs the prepack build first) use PACKAGING_PROBE_TIMEOUT_MS.
   */
  timeoutMs?: number;
  /** Human label for timeout diagnostics (command + purpose). */
  label?: string;
}

/** Default bound for short certification subprocesses (init, CLI, bundles). */
export const SHORT_CHECK_TIMEOUT_MS = 30_000;

/**
 * Bound for packaging/build probes.
 *
 * `npm pack` runs the prepack build first; build:prod measured 64s on a
 * constrained host, so 300s leaves ample headroom for slow CI/VPS runners
 * while still failing closed on a genuinely hung build.
 */
export const PACKAGING_PROBE_TIMEOUT_MS = 300_000;

function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const code = (error as NodeJS.ErrnoException).code;
  return code === 'ETIMEDOUT' || /timed out/i.test(error.message);
}

function describeTimeout(
  command: string,
  args: string[],
  timeoutMs: number,
  elapsedMs: number
): string {
  return (
    `CERTIFY_SUBPROCESS_TIMEOUT command=${command} ` +
    `args=${JSON.stringify(args)} budgetMs=${timeoutMs} elapsedMs=${elapsedMs}`
  );
}

/**
 * Run one certification subprocess with a hard bound.
 *
 * Exported for timeout fault-injection tests. Production callers use the
 * short-check default; packaging/build probes pass PACKAGING_PROBE_TIMEOUT_MS.
 */
export function run(
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv = process.env,
  budget: RunCommandBudget = {}
): CommandResult {
  const timeoutMs = budget.timeoutMs ?? SHORT_CHECK_TIMEOUT_MS;
  const startedAt = Date.now();

  const result = spawnSync(command, args, {
    cwd,

    env,

    encoding: 'utf8',

    timeout: timeoutMs,

    maxBuffer: 10 * 1024 * 1024,
  });

  const elapsedMs = Date.now() - startedAt;
  const timedOut = isTimeoutError(result.error);

  if (timedOut) {
    return {
      status: result.status,

      stdout: '',

      stderr: describeTimeout(command, args, timeoutMs, elapsedMs),

      timedOut: true,

      elapsedMs,
    };
  }

  return {
    status: result.status,

    stdout: result.stdout ?? '',

    stderr: result.stderr ?? '',

    timedOut: false,

    elapsedMs,
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

/**
 * Parse `npm pack --dry-run --json` output into the packed file paths.
 *
 * The shape normalization lives in one place (`parsePackManifestEntries`), so
 * npm <= 11 array output and npm >= 12 name-keyed object output are handled
 * identically here and in the release package audit. Malformed or unrecognized
 * output yields no paths, which makes the caller's required-file check fail
 * closed.
 */
export function parsePackedFiles(stdout: string): string[] {
  return parsePackManifestEntries(stdout).flatMap((entry) => entry.files.map((file) => file.path));
}

function npmPackedFiles(packageRoot: string): {
  files: string[];

  error?: string;
} {
  /*
   * `npm pack` runs the prepack build first (measured 64s for build:prod on
   * a constrained host), so this probe gets the packaging budget rather
   * than the 30s short-check default. A hung build still fails closed via
   * CERTIFY_SUBPROCESS_TIMEOUT.
   */
  const result = run('npm', ['pack', '--dry-run', '--json'], packageRoot, process.env, {
    timeoutMs: PACKAGING_PROBE_TIMEOUT_MS,
    label: 'npm-pack-manifest',
  });

  if (result.timedOut) {
    return {
      files: [],

      error: compactError(result),
    };
  }

  if (result.status !== 0) {
    return {
      files: [],

      error: compactError(result),
    };
  }

  try {
    return {
      files: parsePackedFiles(result.stdout),
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

export interface PackagedParserGate {
  passed: boolean;
  detail?: string;
}

/**
 * Phase 86E.7A — packaged parser release gate.
 *
 * A release fails certification when the manifest claims structural support
 * but the packaged runtime cannot actually load the grammars. Resolution is
 * anchored at the package (never `process.cwd()`), so this gate holds for
 * global installs running from any project directory.
 */
export function certifyPackagedParserRuntime(
  packageRoot = currentPackageRoot()
): PackagedParserGate {
  const fail = (detail: string): PackagedParserGate => ({ passed: false, detail });

  let packageJson: { dependencies?: Record<string, string> };
  let manifest: {
    hardening?: {
      codeIntelligence?: { treeSitterRuntime?: unknown; supportedExtensions?: unknown };
      nonTsIntelligence?: { structuralParserSupport?: unknown };
    };
  };

  try {
    packageJson = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
    };
  } catch {
    return fail('package.json is unreadable.');
  }

  try {
    manifest = JSON.parse(readFileSync(join(packageRoot, 'release-manifest.json'), 'utf8'));
  } catch {
    return fail('release-manifest.json is unreadable.');
  }

  if (manifest?.hardening?.codeIntelligence?.treeSitterRuntime !== true) {
    return fail('release-manifest does not claim treeSitterRuntime=true.');
  }

  if (manifest?.hardening?.nonTsIntelligence?.structuralParserSupport !== true) {
    return fail('release-manifest does not claim nonTs structuralParserSupport=true.');
  }

  const manifestExtensions = manifest?.hardening?.codeIntelligence?.supportedExtensions;
  const requiredExtensions = [
    '.py',
    '.go',
    '.rs',
    '.c',
    '.h',
    '.cc',
    '.cpp',
    '.cxx',
    '.hpp',
    '.hh',
  ];
  const missingExtensions = Array.isArray(manifestExtensions)
    ? requiredExtensions.filter((extension) => !manifestExtensions.includes(extension))
    : requiredExtensions;
  if (missingExtensions.length > 0) {
    return fail(`release-manifest omits structural extensions: ${missingExtensions.join(', ')}.`);
  }

  const requiredDeps: Array<{ package: string; asset: string }> = [
    { package: 'web-tree-sitter', asset: '' },
    { package: 'tree-sitter-python', asset: 'tree-sitter-python.wasm' },
    { package: 'tree-sitter-go', asset: 'tree-sitter-go.wasm' },
    { package: 'tree-sitter-rust', asset: 'tree-sitter-rust.wasm' },
    { package: 'tree-sitter-c', asset: 'tree-sitter-c.wasm' },
    { package: 'tree-sitter-cpp', asset: 'tree-sitter-cpp.wasm' },
  ];

  const missingDeps = requiredDeps.filter(({ package: name }) => !packageJson.dependencies?.[name]);
  if (missingDeps.length > 0) {
    return fail(
      `grammar runtime missing from dependencies: ${missingDeps.map((item) => item.package).join(', ')}.`
    );
  }

  const packageRequire = createRequire(join(packageRoot, 'package.json'));
  const missingAssets: string[] = [];
  for (const { package: name, asset } of requiredDeps) {
    if (!asset) {
      continue;
    }
    try {
      packageRequire.resolve(`${name}/${asset}`);
    } catch {
      missingAssets.push(`${name}/${asset}`);
    }
  }
  if (missingAssets.length > 0) {
    return fail(
      `grammar assets do not resolve from the packaged tree: ${missingAssets.join(', ')}.`
    );
  }

  return { passed: true };
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

  const packagedParser = certifyPackagedParserRuntime(packageRoot);

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

  checks.push(
    check(
      'packaged-parser-runtime',
      'packaged parser grammars resolve and manifest claims structural truth',
      packagedParser.passed,
      packagedParser.detail
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

        timedOut: false,

        elapsedMs: 0,
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
      'toolnet-cli-kilo-integrations',
      'ToolNet CLI and Kilo production integrations available',
      existsSync(join(bundleRoot, 'toolnet-cli.js')) &&
        existsSync(join(bundleRoot, 'kilo.js')) &&
        binText.includes('integrate:toolnet-cli)') &&
        binText.includes('integrate:kilo)') &&
        binText.includes('bundle/toolnet-cli.js') &&
        binText.includes('bundle/kilo.js'),
      'ToolNet CLI/Kilo production bundle or CLI routing is missing.'
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

  const memoryQualityGA = await certifyMemoryQualityGA();

  checks.push(
    check(
      'phase58-memory-quality-ga',
      'Phase 53-58 Memory Quality GA certification passes',
      memoryQualityGA.passed,
      memoryQualityGA.passed
        ? undefined
        : memoryQualityGA.checks
            .filter((item) => !item.passed)
            .map((item) => `${item.id}: ${item.detail ?? 'failed'}`)
            .join('\n')
    )
  );

  /*
   * Phase 62 retrieval quality is now a production/release gate.
   *
   * This runs:
   *   1. hardened deterministic benchmark
   *   2. actual packaged ask CLI through bundle/memory-query.js
   */
  const wikiFleet = await certifyWikiFleetState();

  checks.push(
    check(
      'phase86e-wiki-fleet-state',
      'Phase 86E Wiki/Fleet state recovery certification passes',
      wikiFleet.passed,
      wikiFleet.passed
        ? undefined
        : wikiFleet.checks
            .filter((item) => !item.passed)
            .map((item) => `${item.id}: ${item.detail ?? 'failed'}`)
            .join('\n')
    )
  );

  const retrieval = certifyRetrievalProduction(packageRoot);
  checks.push(
    check(
      'phase62-retrieval-quality',
      'Phase 62 retrieval benchmark passes production thresholds',
      retrieval.gate.passed,
      retrieval.gate.passed
        ? undefined
        : [
            `benchmark=${retrieval.benchmark.benchmarkVersion}`,
            `passed=${retrieval.benchmark.passedCases}/${retrieval.benchmark.totalCases}`,
            ...retrieval.gate.failures,
          ].join('\n')
    )
  );
  checks.push(
    check(
      'phase62-packaged-ask',
      'packaged ask CLI routes through production retrieval bundle',
      retrieval.live.passed,
      retrieval.live.detail
    )
  );
  checks.push(
    check(
      'phase63-retrieval-telemetry',
      'packaged retrieval telemetry is local and privacy-safe',
      retrieval.live.telemetryPassed,
      retrieval.live.telemetryDetail
    )
  );
  const adaptive = certifyAdaptiveRetrieval();
  checks.push(
    check(
      'phase64-adaptive-retrieval',
      'feedback-driven adaptive routing is benchmark-gated and privacy-safe',
      adaptive.passed,
      adaptive.detail
    )
  );

  const retrievalGa = await certifyRetrievalGa();
  checks.push(
    check(
      'phase65-retrieval-ga',
      'Retrieval GA end-to-end certification passes',
      retrievalGa.passed,
      retrievalGa.detail
    )
  );

  const lifecycle = certifyLifecycleDriftControl();
  checks.push(
    check(
      'phase66-lifecycle-drift',
      'post-GA lifecycle and drift control passes',
      lifecycle.passed,
      lifecycle.detail
    )
  );

  const recovery = await certifyDisasterRecovery();
  checks.push(
    check(
      'phase67-disaster-recovery',
      'backup restore and disaster recovery certification passes',
      recovery.passed,
      recovery.detail
    )
  );

  const passedCount = checks.filter((item) => item.passed).length;

  return {
    passed: passedCount === checks.length,

    total: checks.length,

    passedCount,

    checks,
  };
}
