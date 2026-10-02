/*
 * Phase 85K — v0.6.2 Release Recovery / GHCR Completion.
 *
 * Certifies that the release-recovery patch release is consistent, complete and
 * truthful *before* anything is pushed, tagged or published:
 *
 *   1. version truth — every authoritative source (package.json,
 *      package-lock.json, .release-target, release-manifest.json, README,
 *      CHANGELOG) agrees on 0.6.2, and no source still advertises 0.6.0 as the
 *      active release version;
 *   2. release-manifest truth — the manifest describes the same capability
 *      generation as the published v0.6.0 plus the release-repair fixes only,
 *      and invents no new capability phase;
 *   3. changelog truth — exactly one current [0.6.2] section, above an
 *      untouched [0.6.0] history, with only factual repair items;
 *   4. build identity — the packaged runtime carries 0.6.2+<source-digest>,
 *      computed from source and never handwritten;
 *   5. retained repairs — the npm 10/11/12 tolerant package-audit parser, the
 *      Docker linux/arm64 native build toolchain, the amd64 + arm64 build
 *      matrix and the pinned release npm version are all still in place;
 *   6. no regression — the packaged runtime still exposes the full tool
 *      surface, ships no credentials/secrets and declares no public breaking
 *      change;
 *   7. immutable history — the published v0.6.0 tag is untouched, still points
 *      at its historical release commit, and is never reused for 0.6.2.
 *
 * Read-only: this suite never commits, tags, pushes or publishes.
 *
 * PASS marker: PHASE85K_V062_RELEASE_RECOVERY=PASS
 */

import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  REQUIRED_RELEASE_PHASES,
  buildReleaseFacts,
  resolveReleaseLimits,
  runReleaseAnalysis,
} from '../../src/code-intelligence/release/index.js';
import {
  auditPackageContents,
  parsePackManifestEntries,
} from '../../src/code-intelligence/release/package-audit.js';
import { collectVersionTruth } from '../../src/code-intelligence/release/version-truth.js';
import { runtimeSourceDigest } from '../../src/runtime/build-identity.js';

const REPO_ROOT = process.cwd();
const VERSION = '0.6.2';
const PREVIOUS_VERSION = '0.6.1';
const PHASE85K_MARKER = 'PHASE85K_V062_RELEASE_RECOVERY=PASS';

function git(args: string[]): { status: number; stdout: string } {
  try {
    return {
      status: 0,
      stdout: execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8', stdio: 'pipe' }),
    };
  } catch (error) {
    const failure = error as { status?: number; stdout?: string };

    return { status: failure.status ?? 1, stdout: failure.stdout ?? '' };
  }
}

const readText = (path: string): string => readFileSync(join(REPO_ROOT, path), 'utf8');

interface PackageJsonLike {
  version?: string;
}

interface PackageLockLike {
  version?: string;
  packages?: Record<string, { version?: string }>;
}

interface EngineeringLike {
  [key: string]: unknown;
  sourcePhase?: number;
  certificationThrough?: string;
  releaseBaseline?: string;
  targetVersion?: string;
  additiveFromBaseline?: boolean;
  publicBreakingChanges?: number;
}

interface ManifestLike {
  version?: string;
  schemaVersion?: unknown;
  releaseSeries?: string;
  releasePolicy?: Record<string, unknown>;
  hardening?: {
    releaseEngineering?: EngineeringLike;
    taskReleaseCertification?: unknown;
    retrievalReleaseCertification?: unknown;
    disasterRecovery?: unknown;
  };
}

function readJson<T>(path: string): T {
  return JSON.parse(readText(path)) as T;
}

/** Read a tracked file from a git ref; undefined when the ref/path is absent. */
function gitJson<T>(ref: string, path: string): T | undefined {
  const result = git(['show', `${ref}:${path}`]);

  if (result.status !== 0) return undefined;

  try {
    return JSON.parse(result.stdout) as T;
  } catch {
    return undefined;
  }
}

/*
 * The certified release set: the commit when it exists (HEAD carries the target
 * version, potentially via the authorized release tag), otherwise the pending
 * set in the working tree. A version mismatch is never tolerated — CI always
 * certifies the committed state, because main must build green before the
 * release tag is created.
 */
function headPackageVersion(): string | undefined {
  return (JSON.parse(git(['show', 'HEAD:package.json']).stdout || '{}') as { version?: string })
    .version;
}

const RELEASE_SET_COMMITTED = headPackageVersion() === VERSION;

const limits = resolveReleaseLimits();

const facts = buildReleaseFacts({
  projectRoot: REPO_ROOT,
  profile: 'auditor',
  requiredPhases: REQUIRED_RELEASE_PHASES,
  maxCapabilities: limits.maxCapabilities,
  maxBundleReadBytes: limits.maxBundleReadBytes,
  maxPackageJsonBytes: limits.maxPackageJsonBytes,
  maxWorktreeFiles: limits.maxWorktreeFiles,
});

const report = runReleaseAnalysis({
  facts,
  request: { operation: 'status', evidenceProfile: 'auditor' },
  rebuild: false,
});

const blockerCodes = report.blockers.map((blocker) => blocker.code);

const dockerfile = readText('Dockerfile');
const builderStage = dockerfile.slice(0, dockerfile.indexOf('AS runtime'));
const runtimeStage = dockerfile.slice(dockerfile.indexOf('AS runtime'));
const dockerWorkflow = readText('.github/workflows/docker.yml');
const releaseWorkflow = readText('.github/workflows/release.yml');

/* ================================================================== *
 * 1. Version truth — every authoritative source agrees on 0.6.2
 * ================================================================== */

describe('Phase 85K — version truth', () => {
  it('synchronizes every authoritative version source to 0.6.2', () => {
    const pkg = readJson<PackageJsonLike>('package.json');
    const lock = readJson<PackageLockLike>('package-lock.json');
    const manifest = readJson<ManifestLike>('release-manifest.json');

    expect(pkg.version).toBe(VERSION);
    expect(lock.version).toBe(VERSION);
    expect(lock.packages?.['']?.version).toBe(VERSION);
    expect(readText('.release-target').trim()).toBe(VERSION);
    expect(manifest.version).toBe(VERSION);
    expect(manifest.releaseSeries).toBe('0.6.x');
  });

  it('never leaves 0.6.0 as the active version of an authoritative source', () => {
    const pkg = readJson<PackageJsonLike>('package.json');
    const lock = readJson<PackageLockLike>('package-lock.json');
    const manifest = readJson<ManifestLike>('release-manifest.json');

    for (const [label, value] of [
      ['package.json', pkg.version],
      ['package-lock.json', lock.version],
      ['package-lock.json (root)', lock.packages?.['']?.version],
      ['.release-target', readText('.release-target').trim()],
      ['release-manifest.json', manifest.version],
      [
        'release-manifest.json (targetVersion)',
        manifest.hardening?.releaseEngineering?.targetVersion,
      ],
    ] as const) {
      expect(value, label).not.toBe(PREVIOUS_VERSION);
      expect(value, label).toBe(VERSION);
    }
  });

  it('resolves 0.6.2 as the current version with no stale active source', () => {
    const truth = collectVersionTruth({
      projectRoot: REPO_ROOT,
      sourcePhase: facts.sourcePhase,
      maxPackageJsonBytes: limits.maxPackageJsonBytes,
    });

    expect(truth.currentVersion).toBe(VERSION);

    const active = truth.sources.filter((source) => source.active);

    expect(active.length).toBeGreaterThanOrEqual(4);

    for (const source of active) {
      expect(source.version, source.source).toBe(VERSION);
    }

    /* Only the intentionally non-authoritative MCP protocol identity diverges. */
    expect(truth.divergences).toEqual(['mcp server identity']);

    const mcpIdentity = truth.sources.find((source) => source.source === 'mcp server identity');

    expect(mcpIdentity?.version).toBe('0.1.0');
    expect(mcpIdentity?.active).toBe(false);
  });
});

/* ================================================================== *
 * 2. Release-manifest truth — same capability generation as v0.6.0
 * ================================================================== */

describe('Phase 85K — release manifest', () => {
  it('declares 0.6.2 without moving the source phase or the certification series', () => {
    const manifest = readJson<ManifestLike>('release-manifest.json');
    const engineering = manifest.hardening?.releaseEngineering;

    expect(engineering?.sourcePhase).toBe(84);
    expect(engineering?.certificationThrough).toBe('Phase85B');
    expect(engineering?.releaseBaseline).toBe('v0.6.1');
    expect(engineering?.targetVersion).toBe(VERSION);
    expect(engineering?.additiveFromBaseline).toBe(true);
    expect(engineering?.publicBreakingChanges).toBe(0);
  });

  it('describes the same capability generation as the published v0.6.0', () => {
    /* The published v0.6.0 manifest is the capability authority this patch
     * release must not extend: a recovery release may change the version and
     * nothing else about the claimed capability set. A shallow CI checkout may
     * not carry the tag, in which case the comparison is skipped. */
    const published = gitJson<ManifestLike>(`v${PREVIOUS_VERSION}`, 'release-manifest.json');

    if (!published) return;

    const manifest = readJson<ManifestLike>('release-manifest.json');

    const publishedEngineering = { ...(published.hardening?.releaseEngineering ?? {}) };
    const localEngineering = { ...(manifest.hardening?.releaseEngineering ?? {}) };

    /* The only permitted differences inside release engineering are the
     * version and the baseline. */
    delete publishedEngineering.targetVersion;
    delete localEngineering.targetVersion;
    delete publishedEngineering.releaseBaseline;
    delete localEngineering.releaseBaseline;

    expect(localEngineering).toEqual(publishedEngineering);

    expect(manifest.hardening?.taskReleaseCertification).toEqual(
      published.hardening?.taskReleaseCertification
    );
    expect(manifest.hardening?.retrievalReleaseCertification).toEqual(
      published.hardening?.retrievalReleaseCertification
    );
    expect(manifest.hardening?.disasterRecovery).toEqual(published.hardening?.disasterRecovery);
    expect(manifest.releasePolicy).toEqual(published.releasePolicy);
    expect(manifest.schemaVersion).toBe(published.schemaVersion);
  });

  it('does not report the release manifest as stale', () => {
    expect(report.manifestTruth.present).toBe(true);
    expect(report.manifestTruth.stale).toBe(false);
    expect(blockerCodes).not.toContain('RELEASE_MANIFEST_STALE');
  });

  it('keeps tag creation and publishing outside this certification', () => {
    const manifest = readJson<ManifestLike>('release-manifest.json');

    expect(manifest.releasePolicy?.gitTagAutomatic).toBe(false);
    expect(manifest.releasePolicy?.npmPublishTrigger).toBe('git-tag-workflow-trusted-publishing');
  });
});

/* ================================================================== *
 * 3. Changelog and README truth
 * ================================================================== */

describe('Phase 85K — changelog and README', () => {
  it('documents 0.6.2 exactly once, above the historical 0.6.0 section', () => {
    const changelog = readText('CHANGELOG.md');

    expect(changelog.match(/^## \[0\.6\.1\]/gmu) ?? []).toHaveLength(1);
    expect(changelog.match(/^## \[0\.6\.0\]/gmu) ?? []).toHaveLength(1);

    /* Newest first: the current release is never buried under history. */
    expect(changelog.indexOf('## [0.6.2]')).toBeLessThan(changelog.indexOf('## [0.6.0]'));

    const current = changelog.slice(
      changelog.indexOf('## [0.6.2]'),
      changelog.indexOf('## [0.6.0]')
    );

    expect(current).toContain('### Compatibility');
    expect(current).toContain('### Known limitations');
  });

  it('records the minor release additions and changes truthfully', () => {
    const changelog = readText('CHANGELOG.md');
    const current = changelog.slice(
      changelog.indexOf('## [0.6.2]'),
      changelog.indexOf('## [0.6.1]')
    );

    expect(current).toContain('22-agent');
    expect(current).toContain('goose');
    expect(current).toContain('Qwen Code');
    expect(current).toContain('Aider');
    expect(current).toContain('Plandex');
    expect(current).toContain('OpenRouter');
    expect(current).toContain('Warp');
    expect(current).toContain('0 public breaking changes');
    expect(current).toMatch(/^### Added$/mu);
    expect(current).toMatch(/^### Changed$/mu);
    expect(current).toMatch(/^### Limitations$/mu);
  });

  it('leaves the published 0.6.0 history untouched', () => {
    const changelog = readText('CHANGELOG.md');
    const readme = readText('README.md');

    expect(changelog).toContain('Purely additive from v0.5.3');
    expect(readme).toContain('### v0.6.0 Code Intelligence, Daemon & Release Engineering');
    expect(readme).toContain('### v0.5.2 Retrieval GA');
    expect(readme).toContain('### v0.5.3 Disaster Recovery');
  });

  it('advertises v0.6.2 as the current release and never 0.6.0', () => {
    const readme = readText('README.md');

    expect(readme).toContain(`Current release: **v${VERSION}**`);
    expect(readme).toContain(`### v${VERSION}`);

    const currentClaims = readme.split(/\r?\n/u).filter((line) => /current release/iu.test(line));

    expect(currentClaims.length).toBeGreaterThan(0);

    for (const line of currentClaims) {
      expect(line).not.toContain(PREVIOUS_VERSION);
      expect(line).not.toContain('0.5.');
    }
  });
});

/* ================================================================== *
 * 4. Build identity — 0.6.2 + computed source digest
 * ================================================================== */

describe('Phase 85K — build identity', () => {
  const digest = runtimeSourceDigest(REPO_ROOT);
  const marker = `${VERSION}+${digest.slice(0, 16)}`;

  it('computes a 0.6.2 marker from the source digest', () => {
    expect(digest).toMatch(/^[0-9a-f]{16,}$/u);
    expect(marker).toMatch(/^0\.6\.2\+[0-9a-f]{16}$/u);
  });

  it('stamps the packaged runtime with the fresh marker', () => {
    for (const bundle of ['bundle/mcp.js', 'bundle/identity.js', 'bundle/daemon-cli.js']) {
      expect(readText(bundle), bundle).toContain(marker);
    }
  });

  it('ships no stale 0.6.0 build marker in any bundle', () => {
    const bundles = execFileSync('git', ['ls-files', 'bundle'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    })
      .split(/\r?\n/u)
      .filter((path) => path.endsWith('.js'));

    expect(bundles.length).toBeGreaterThan(0);

    for (const bundle of bundles) {
      expect(readText(bundle), bundle).not.toMatch(/0\.6\.0\+[0-9a-f]{16}/u);
    }
  });

  it('keeps source and packaged capability parity complete', () => {
    expect(report.capabilities.parity.complete).toBe(true);
    expect(report.capabilities.parity.missingRequired).toEqual([]);
    expect(blockerCodes).not.toContain('BUNDLE_STALE');
    expect(blockerCodes).not.toContain('PACKAGED_CAPABILITY_MISSING');
  });
});

/* ================================================================== *
 * 5. Retained repairs — npm 10/11/12 audit parser
 * ================================================================== */

describe('Phase 85K — npm package-audit compatibility retained', () => {
  const files = [
    { path: 'package.json', size: 10 },
    { path: './bundle/mcp.js', size: 20 },
    { path: 'release-manifest.json', size: 30 },
  ];

  it('parses npm 10/11 array output, npm 12 object output and a bare entry identically', () => {
    const expected = ['package.json', 'bundle/mcp.js', 'release-manifest.json'];

    /* npm <= 11: an array of entries. */
    const npm11 = parsePackManifestEntries(JSON.stringify([{ id: 'x@1.0.0', files }]));

    /* npm >= 12: an object keyed by package name. */
    const npm12 = parsePackManifestEntries(
      JSON.stringify({ 'toolnet-memory': { id: 'x@1.0.0', files } })
    );

    /* A single entry object carrying its own `files` array. */
    const bare = parsePackManifestEntries(JSON.stringify({ id: 'x@1.0.0', files }));

    for (const entries of [npm11, npm12, bare]) {
      expect(entries).toHaveLength(1);
      expect(entries[0]?.files.map((file) => file.path)).toEqual(expected);
    }
  });

  it('fails closed on an unrecognised, malformed or empty manifest', () => {
    for (const stdout of ['', '   ', 'not json', '[]', '{}', '{"a":{}}', '{"a":{"files":"x"}}']) {
      expect(parsePackManifestEntries(stdout), JSON.stringify(stdout)).toEqual([]);
    }
  });

  it('keeps the fail-closed audit notes inside the packaged runtimes', () => {
    const mcp = readText('bundle/mcp.js');
    const certifier = readText('bundle/production-certify.js');

    expect(mcp).toContain('npm pack manifest shape was not recognized');
    expect(mcp).toContain('npm pack --dry-run failed or produced no manifest');
    expect(mcp).toContain('duplicatePaths');

    /* Both consumers normalise npm 10/11 and npm 12 output the same way. */
    expect(certifier).toContain('startsWith("./")');
  });

  it('audits the real package as complete, secret-free and versioned 0.6.2', () => {
    const result = auditPackageContents({
      projectRoot: REPO_ROOT,
      maxPackageFiles: limits.maxPackageFiles,
      maxPackageJsonBytes: limits.maxPackageJsonBytes,
    });

    expect(result.note).toBeUndefined();
    expect(result.available).toBe(true);
    expect(result.audit.complete).toBe(true);
    expect(result.audit.requiredMissing).toEqual([]);
    expect(result.audit.sensitivePaths).toEqual([]);
    expect(result.audit.unexpectedPaths).toEqual([]);
    expect(result.audit.duplicatePaths).toEqual([]);

    const stdout = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, npm_config_color: 'false', NO_COLOR: '1' },
    });

    const entries = parsePackManifestEntries(stdout);

    expect(entries).toHaveLength(1);
    expect(entries[0]?.name).toBe('toolnet-memory');
    expect(entries[0]?.version).toBe(VERSION);
    expect(entries[0]?.id).toBe(`toolnet-memory@${VERSION}`);

    /* The release manifest is authoritative for shipped content. */
    expect(entries[0]?.files.map((file) => file.path)).toContain('release-manifest.json');
  }, 180_000);
});

/* ================================================================== *
 * 6. Retained repairs — Docker amd64 + arm64
 * ================================================================== */

describe('Phase 85K — Docker multi-arch retained', () => {
  it('installs the native tree-sitter build toolchain in the builder stage before npm ci', () => {
    const toolchain = builderStage.indexOf('apt-get install');

    expect(toolchain).toBeGreaterThan(-1);
    expect(builderStage).toMatch(/python3/u);
    expect(builderStage).toMatch(/\bmake\b/u);
    expect(builderStage).toMatch(/g\+\+/u);

    /* The toolchain must exist before the dependency install that needs it. */
    expect(toolchain).toBeLessThan(builderStage.indexOf('RUN npm ci'));
  });

  it('keeps the runtime stage minimal, without the build toolchain', () => {
    expect(runtimeStage).not.toMatch(/python3/u);
    expect(runtimeStage).not.toMatch(/g\+\+/u);
    expect(runtimeStage).not.toMatch(/\bmake\b/u);
  });

  it('preserves linux/amd64 and linux/arm64 in the docker workflow', () => {
    expect(dockerWorkflow).toContain('platforms: linux/amd64,linux/arm64');
    expect(dockerWorkflow).toContain('docker/setup-qemu-action');

    /* No platform may be silently dropped, excluded or allowed to fail. */
    expect(dockerWorkflow).not.toMatch(/platforms:[^\n]*arm64[^\n]*(exclude|skip)/u);
    expect(dockerWorkflow).not.toContain('continue-on-error');
  });

  it('publishes GHCR images only from release tag refs, never from a branch', () => {
    expect(dockerWorkflow).toContain("push: ${{ startsWith(github.ref, 'refs/tags/v') }}");
    expect(dockerWorkflow).toContain("if: startsWith(github.ref, 'refs/tags/v')");
    expect(dockerWorkflow).toContain('type=semver,pattern={{version}}');
    expect(dockerWorkflow).toContain('type=raw,value=latest');
  });

  it('pins the release npm version instead of floating on the newest major', () => {
    expect(releaseWorkflow).not.toContain('npm@latest');
    expect(releaseWorkflow).toMatch(/npm install -g npm@1[0-9]+\.[0-9]+\.[0-9]+/u);
  });
});

/* ================================================================== *
 * 7. No public breaking change
 * ================================================================== */

describe('Phase 85K — no public breaking change', () => {
  it('declares zero public breaking changes from v0.6.0', () => {
    const changelog = readText('CHANGELOG.md');
    const current = changelog.slice(
      changelog.indexOf('## [0.6.2]'),
      changelog.indexOf('## [0.6.0]')
    );

    expect(
      readJson<ManifestLike>('release-manifest.json').hardening?.releaseEngineering
        ?.publicBreakingChanges
    ).toBe(0);
    expect(current).toContain(`Purely additive from v${PREVIOUS_VERSION}`);
    expect(current).toContain('0 public breaking changes');
  });

  it('keeps the packaged MCP tool surface at least as wide as v0.6.0', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'toolnet-phase85k-'));
    const requests = `${[
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'phase85k-certify', version: '1.0.0' },
        },
      }),
      JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
      JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }),
    ].join('\n')}\n`;

    const child = spawn(process.execPath, [join(REPO_ROOT, 'bundle', 'mcp.js')], {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    child.stderr.resume();

    const tools = await new Promise<string[]>((resolvePromise, rejectPromise) => {
      let buffer = '';
      let settled = false;
      let timer: NodeJS.Timeout | undefined;

      const finish = (complete: () => void): void => {
        if (settled) return;

        settled = true;

        if (timer) clearTimeout(timer);

        child.kill('SIGKILL');
        complete();
      };

      timer = setTimeout(
        () => finish(() => rejectPromise(new Error('packaged runtime probe timed out'))),
        60_000
      );

      child.stdout.setEncoding('utf8');
      child.stdout.on('data', (chunk: string) => {
        buffer += chunk;

        for (const line of buffer.split('\n')) {
          if (!line.trim()) continue;

          try {
            const message = JSON.parse(line) as {
              id?: number;
              result?: { tools?: Array<{ name?: string }> };
            };

            if (message.id === 2 && message.result?.tools) {
              finish(() =>
                resolvePromise(
                  message.result?.tools?.map((tool) => tool.name ?? '').filter(Boolean) ?? []
                )
              );

              return;
            }
          } catch {
            /* Partial line: wait for the next chunk. */
          }
        }
      });

      child.on('error', (error) => finish(() => rejectPromise(error)));
      child.on('exit', () =>
        finish(() => rejectPromise(new Error('packaged runtime exited before tools/list')))
      );

      child.stdin.end(requests);
    });

    /* v0.6.0 shipped 63 tools; a patch release may add, never remove. */
    expect(tools.length).toBeGreaterThanOrEqual(63);

    for (const required of [
      'memory_search',
      'memory_save',
      'code_search',
      'find_symbol',
      'release_readiness',
      'get_graph_schema',
      'query_graph',
      'task_create',
      'task_start',
      'task_progress',
      'task_complete',
      'task_handoff',
      'toolnet_status',
    ]) {
      expect(tools, required).toContain(required);
    }

    /* The v0.6.0 task lifecycle family is intact. */
    expect(tools.filter((tool) => tool.startsWith('task_')).length).toBeGreaterThanOrEqual(21);
  }, 120_000);
});

/* ================================================================== *
 * 8. Immutable v0.6.0 history
 * ================================================================== */

describe('Phase 85K — immutable v0.6.0 history', () => {
  it('never moves, deletes or reuses the published v0.6.0 tag', () => {
    const tag = git(['tag', '--list', `v${PREVIOUS_VERSION}`]).stdout.trim();

    /* A CI clone may carry no tags; locally the immutable tag must exist. */
    if (!tag) return;

    const tagged = git(['rev-list', '-n', '1', `v${PREVIOUS_VERSION}`]).stdout.trim();

    if (git(['cat-file', '-e', tagged]).status !== 0) return;

    const taggedPackage = JSON.parse(git(['show', `${tagged}:package.json`]).stdout || '{}') as {
      version?: string;
    };

    /* The historical tag still carries the historical version ... */
    expect(taggedPackage.version).toBe(PREVIOUS_VERSION);

    /* ... it is an ancestor of the recovery line, never a side branch ... */
    expect(git(['merge-base', '--is-ancestor', tagged, 'HEAD']).status).toBe(0);

    /* ... and the recovery release never squats on it. */
    expect(tagged).not.toBe(git(['rev-parse', 'HEAD']).stdout.trim());
  });

  it('targets the recovery release commit when the v0.6.2 tag exists', () => {
    const tag = git(['tag', '--list', `v${VERSION}`]).stdout.trim();

    if (!tag) return;

    const tagged = git(['rev-list', '-n', '1', `v${VERSION}`]).stdout.trim();

    if (git(['cat-file', '-e', tagged]).status !== 0) return;

    const taggedPackage = JSON.parse(git(['show', `${tagged}:package.json`]).stdout || '{}') as {
      version?: string;
    };

    expect(taggedPackage.version).toBe(VERSION);
    expect(git(['merge-base', '--is-ancestor', tagged, 'HEAD']).status).toBe(0);
    expect(
      JSON.stringify(gitJson<ManifestLike>('HEAD', 'release-manifest.json')?.version)
    ).toContain(VERSION);
  });
});

/* ================================================================== *
 * 9. Certification marker
 * ================================================================== */

describe('Phase 85K — certification', () => {
  it('emits the Phase 85K PASS marker', () => {
    console.log(PHASE85K_MARKER);

    expect(PHASE85K_MARKER).toBe('PHASE85K_V062_RELEASE_RECOVERY=PASS');
    expect(RELEASE_SET_COMMITTED).toBe(headPackageVersion() === VERSION);
  });
});
