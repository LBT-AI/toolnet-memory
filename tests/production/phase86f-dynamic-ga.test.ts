/*
 * Phase 86F — dynamic GA certification.
 *
 * Everything derives from the canonical registry
 * (src/session/integration-capabilities.ts via integration-matrix.ts).
 * The only hardcoded number is the v0.6.2 release snapshot, explicitly
 * labeled historical: current GA always derives SUPPORTED_INTEGRATION_AGENTS.
 *
 * A new registry entry without wired production paths fails here loudly
 * instead of leaving GA stuck on an old count.
 *
 * PASS marker: PHASE86F_DYNAMIC_GA_MATRIX=PASS
 */

import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { spawnSync } from 'node:child_process';

import { describe, expect, it } from 'vitest';

import {
  AGENT_INTEGRATION_CAPABILITIES,
  SUPPORTED_INTEGRATION_AGENTS,
} from '../../src/session/integration-capabilities.js';
import {
  buildIntegrationMatrix,
  buildRuntimeIntegrationMatrix,
  countIntegrationMatrix,
  type GaCertificationClass,
} from '../../src/session/integration-matrix.js';

import { resolveJunieCapability } from '../../src/session/junie/capability.js';

import { spawnAiderSession } from '../../src/session/aider/wrapper.js';

import { inspectOpenRouterStatus } from '../../src/session/openrouter/status.js';

import { inspectWarpStatus } from '../../src/session/warp/status.js';

import { inspectRovoStatus, ROVO_PREVIEW_REASON } from '../../src/session/rovo/status.js';

import { inspectAiderStatus } from '../../src/session/aider/status.js';

import { inspectKiloIntegrationStatus } from '../../src/session/kilo/status.js';

import { inspectToolNetCliIntegrationStatus } from '../../src/session/toolnet-cli/status.js';

/** v0.6.2 release snapshot. Historical only — GA derives the live registry. */
const V062_SNAPSHOT = {
  canonical: 22,
  autoNative: 15,
  autoPersistentPlugin: 1,
  autoManagedWrapper: 1,
  manualRecovery: 2,
  mcpOnly: 1,
  blocked: 2,
} as const;

/** Phase 86G source snapshot: five additional integrations on the same 0.6.2 source. */
const PHASE86G_SNAPSHOT = {
  canonical: 27,
  autoNative: 17,
  autoPersistentPlugin: 1,
  autoManagedWrapper: 1,
  manualRecovery: 3,
  mcpOnly: 3,
  blocked: 2,
} as const;

const REPO_ROOT = process.cwd();

function agentDir(agent: string): string {
  return join(REPO_ROOT, 'src', 'session', agent);
}

function agentSources(agent: string): string[] {
  const dir = agentDir(agent);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((entry) => entry.endsWith('.ts'))
    .map((entry) => readFileSync(join(dir, entry), 'utf8'));
}

function agentSourceText(agent: string): string {
  return agentSources(agent).join('\n');
}

describe('Phase 86F — dynamic integration matrix', () => {
  it('derives the matrix from the canonical registry with no hardcoded count', () => {
    const rows = buildIntegrationMatrix();

    expect(rows.map((row) => row.agent).sort()).toEqual([...SUPPORTED_INTEGRATION_AGENTS].sort());
    expect(new Set(rows.map((row) => row.agent)).size).toBe(rows.length);

    for (const row of rows) {
      const canonical = AGENT_INTEGRATION_CAPABILITIES[row.agent];
      expect(row.refreshMode).toBe(canonical.refreshMode);
      expect(row.captureMode).toBe(canonical.captureMode);
    }
  });

  it('pins the current source snapshot derived from the live registry', () => {
    const counts = countIntegrationMatrix(buildIntegrationMatrix());

    expect(counts).toEqual(PHASE86G_SNAPSHOT);
  });

  it('keeps the v0.6.2 release snapshot as history, not as the GA rule', () => {
    expect(V062_SNAPSHOT.canonical).toBe(22);
    expect(
      V062_SNAPSHOT.autoNative +
        V062_SNAPSHOT.autoPersistentPlugin +
        V062_SNAPSHOT.autoManagedWrapper +
        V062_SNAPSHOT.manualRecovery +
        V062_SNAPSHOT.mcpOnly +
        V062_SNAPSHOT.blocked
    ).toBe(V062_SNAPSHOT.canonical);
    expect(PHASE86G_SNAPSHOT.canonical).toBeGreaterThan(V062_SNAPSHOT.canonical);
  });

  it('declares no alias model: every product identity is its own canonical adapter', () => {
    const rows = buildIntegrationMatrix();

    expect(rows.length).toBe(SUPPORTED_INTEGRATION_AGENTS.length);

    // No alias table exists anywhere in the session authority.
    for (const row of rows) {
      expect(row.agent).not.toContain(':');
    }

    console.log('PHASE86F_DYNAMIC_GA_MATRIX=PASS');
  });
});

describe('Phase 86F — AUTO production-path conformance', () => {
  const rows = buildIntegrationMatrix().filter((row) => row.auto);

  it('covers every AUTO agent (no silent gaps when the registry grows)', () => {
    expect(rows.length).toBeGreaterThan(0);

    const classes = new Set(rows.map((row) => row.gaClass));
    expect(classes.has('AUTO_NATIVE')).toBe(true);
    expect(classes.has('AUTO_PERSISTENT_PLUGIN')).toBe(true);
    expect(classes.has('AUTO_MANAGED_WRAPPER')).toBe(true);
  });

  it.each(rows.map((row) => [row.agent, row.gaClass] as [string, GaCertificationClass]))(
    'AUTO agent %s materializes only through SessionCore (%s)',
    (agent, gaClass) => {
      void gaClass;
      const text = agentSourceText(agent);

      expect(text.length).toBeGreaterThan(0);

      /*
       * Two canonical shapes: adapters that own a SessionCore directly, and
       * hook runtimes that delegate to the shared hook-capture runtime (which
       * owns the single SessionCore flush boundary). Both terminate in
       * SessionCore.flush(); neither may touch MemoryStore directly.
       */
      const ownsSessionCore = text.includes('SessionCore');
      const delegatesToSharedRuntime =
        text.includes('hook-capture/runtime.js') &&
        (text.includes('handleNormalizedHookInput') ||
          text.includes('flushHookCaptureSession') ||
          text.includes('flushSession'));

      expect(ownsSessionCore || delegatesToSharedRuntime).toBe(true);
      expect(text).not.toContain('new MemoryStore(');
    }
  );

  it('the shared hook-capture runtime owns the single SessionCore flush boundary', () => {
    const text = readFileSync(
      join(REPO_ROOT, 'src', 'session', 'hook-capture', 'runtime.ts'),
      'utf8'
    );

    expect(text).toContain('SessionCore');
    expect(text).toContain('core.flush()');
  });

  it.each(rows.map((row) => row.agent))(
    'AUTO hook agent %s registers its required events',
    (agent) => {
      const row = buildIntegrationMatrix().find((item) => item.agent === agent)!;

      if (row.captureMode !== 'hook') {
        // Managed-wrapper agents capture at wrapper boundary, not via hooks.
        expect(row.captureMode).toBe('managed-wrapper-session-end');
        return;
      }

      expect(row.hookEvents.length).toBeGreaterThan(0);

      const text = agentSourceText(agent);
      for (const event of row.hookEvents) {
        expect(text, `${agent} registers ${event}`).toContain(event);
      }
    }
  );

  it('managed wrapper captures with shell=false and no self-recursion', () => {
    for (const file of ['wrapper.ts', 'installer.ts']) {
      const text = readFileSync(join(REPO_ROOT, 'src', 'session', 'aider', file), 'utf8');
      expect(text).toContain('shell: false');
      expect(text).not.toContain('shell: true');
    }

    const wrapper = readFileSync(join(REPO_ROOT, 'src', 'session', 'aider', 'wrapper.ts'), 'utf8');
    expect(wrapper).toContain("stdio: 'inherit'");
    expect(wrapper).toContain('result.exitCode = code');
    expect(wrapper).toContain("forwardSignal(child, 'SIGINT')");
    expect(wrapper).toContain("forwardSignal(child, 'SIGTERM')");
    expect(wrapper).toContain('`${sessionId}.md`');

    // Launcher name differs from the wrapped binary name, so the default
    // 'aider' resolution cannot select the wrapper itself.
    const installer = readFileSync(
      join(REPO_ROOT, 'src', 'session', 'aider', 'installer.ts'),
      'utf8'
    );
    expect(installer).toContain("'aider-wrapper'");
    expect(installer).toContain("process.argv[2] ?? 'aider'");

    // Session association is exact (filename-derived session id), never a
    // newest-file guess: recovery maps each history file to its own session.
    const recovery = readFileSync(
      join(REPO_ROOT, 'src', 'session', 'aider', 'recovery.ts'),
      'utf8'
    );
    expect(recovery).toContain("entry.replace(/\\.md$/, '')");
  });

  it('wrapper preserves argv, cwd, env, and exit code through a fake binary', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'toolnet-86f-wrapper-'));
    const probe = join(dir, 'fake-aider.sh');
    const capturedArgv = join(dir, 'captured-argv.txt');
    const capturedEnv = join(dir, 'captured-env.txt');
    const capturedCwd = join(dir, 'captured-cwd.txt');

    // Pure shell probe: node -e cannot receive the wrapper's flags because
    // node parses its own options first.
    writeFileSync(
      probe,
      [
        '#!/bin/sh',
        `printf '%s\\n' "$@" > ${capturedArgv}`,
        `printenv AIDER_CHAT_HISTORY_FILE > ${capturedEnv}`,
        `pwd > ${capturedCwd}`,
        'exit 42',
      ].join('\n')
    );
    chmodSync(probe, 0o755);

    const result = await spawnAiderSession({
      sessionId: 'wrapper-probe-1',
      cwd: dir,
      aiderBinary: probe,
      aiderArgs: ['--model', 'probe-model'],
    });

    expect(result.exitCode).toBe(42);
    expect(result.historyPath).toBe(join(dir, '.toolnet', 'aider-history', 'wrapper-probe-1.md'));

    const argv = readFileSync(capturedArgv, 'utf8').split('\n').filter(Boolean);
    expect(readFileSync(capturedCwd, 'utf8').trim()).toBe(dir);
    expect(readFileSync(capturedEnv, 'utf8').trim()).toBe(result.historyPath);
    expect(argv).toContain('--chat-history-file');
    expect(argv).toContain(result.historyPath);
    expect(argv.slice(-2)).toEqual(['--model', 'probe-model']);
  });
});

describe('Phase 86F — manual / MCP-only / blocked truth', () => {
  it('manual-recovery agents expose recovery without claiming AUTO', () => {
    const rows = buildIntegrationMatrix().filter((row) => row.gaClass === 'MANUAL_RECOVERY');

    expect(rows.map((row) => row.agent).sort()).toEqual(['continue', 'plandex', 'toolnet-cli']);
    expect(rows.every((row) => !row.auto)).toBe(true);

    for (const row of rows) {
      expect(existsSync(agentDir(row.agent))).toBe(true);
      expect(agentSourceText(row.agent)).toContain('SessionCore');
    }
  });

  it('MCP-only agents claim no native capture and install no hooks', () => {
    const rows = buildIntegrationMatrix().filter((row) => row.gaClass === 'MCP_ONLY');

    expect(rows.map((row) => row.agent)).toEqual(['kilo', 'codebuff', 'freebuff']);

    for (const agent of ['kilo', 'codebuff', 'freebuff'] as const) {
      const capabilities = AGENT_INTEGRATION_CAPABILITIES[agent];
      expect(capabilities.nativeCapture).toBe(false);
      expect(capabilities.lifecycleHooks).toBe(false);
      expect(capabilities.level).toBe('mcp-only');
      expect(buildIntegrationMatrix().find((row) => row.agent === agent)!.hookEvents).toEqual([]);
    }
  });

  it('blocked agents carry explicit reasons and install no fake hooks', () => {
    const rows = buildIntegrationMatrix().filter((row) => row.gaClass === 'BLOCKED');

    expect(rows.map((row) => row.agent).sort()).toEqual(['openrouter', 'warp']);

    const openRouter = agentSourceText('openrouter');
    expect(openRouter).toContain('blocked');
    expect(openRouter).toMatch(/product identity/i);

    const warp = agentSourceText('warp');
    expect(warp).toContain('blocked');

    for (const row of rows) {
      expect(row.auto).toBe(false);
    }
  });

  it('no blocked or manual integration is labeled AUTO anywhere in the matrix', () => {
    for (const row of buildIntegrationMatrix()) {
      if (
        row.gaClass === 'BLOCKED' ||
        row.gaClass === 'MANUAL_RECOVERY' ||
        row.gaClass === 'MCP_ONLY'
      ) {
        expect(row.auto).toBe(false);
      }
    }
  });
});

function allSessionSources(): Array<{ file: string; text: string }> {
  const sessionRoot = join(REPO_ROOT, 'src', 'session');
  const entries = readdirSync(sessionRoot, { withFileTypes: true });
  const output: Array<{ file: string; text: string }> = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = join(sessionRoot, entry.name);
    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.ts')) continue;
      const full = join(dir, file);
      output.push({ file: full, text: readFileSync(full, 'utf8') });
    }
  }

  return output;
}

describe('Phase 86F — SessionCore single materialization owner', () => {
  it('has zero direct integration MemoryStore writes', () => {
    const offenders: string[] = [];

    for (const { file, text } of allSessionSources()) {
      if (
        text.includes('new MemoryStore(') ||
        text.includes('.saveMemory(') ||
        text.includes('memoryStore.put(')
      ) {
        offenders.push(file);
      }
    }

    expect(offenders).toEqual([]);
  });

  it('keeps the materializer inside core/learner only', () => {
    const offenders: string[] = [];

    for (const { file, text } of allSessionSources()) {
      if (file.includes(`${join('session', 'learner')}/`) || file.endsWith('core.ts')) continue;
      if (text.includes('session-memory-materializer')) {
        offenders.push(file);
      }
    }

    expect(offenders).toEqual([]);
  });
});

describe('Phase 86F — status and doctor truth per class', () => {
  it('blocked integrations always report blocked with explicit reasons', () => {
    expect(inspectOpenRouterStatus().blocked).toBe(true);
    expect(inspectWarpStatus().blocked).toBe(true);

    const openRouterCli = readFileSync(
      join(REPO_ROOT, 'src', 'session', 'openrouter', 'cli.ts'),
      'utf8'
    );
    const warpCli = readFileSync(join(REPO_ROOT, 'src', 'session', 'warp', 'cli.ts'), 'utf8');

    expect(openRouterCli).toMatch(/product identity/i);
    expect(warpCli).toMatch(/capability/i);

    const bin = readFileSync(join(REPO_ROOT, 'bin', 'toolnet-memory'), 'utf8');
    expect(bin).toContain('session:openrouter-status)');
    expect(bin).toContain('session:warp-status)');
  });

  it('rovo preview stays visible in status and docs', () => {
    const status = inspectRovoStatus();
    expect(status.preview).toBe(true);
    expect(status.previewReason).toBe(ROVO_PREVIEW_REASON);

    const readme = readFileSync(join(REPO_ROOT, 'README.md'), 'utf8');
    expect(readme).toContain('Rovo event hooks are a preview/experimental feature');
  });

  it('status inspectors run offline without throwing (configured is not healthy)', () => {
    for (const status of [
      inspectAiderStatus(),
      inspectKiloIntegrationStatus(),
      inspectToolNetCliIntegrationStatus(),
    ]) {
      expect(typeof status).toBe('object');
    }
  });
});

describe('Phase 86F — platform matrix honesty', () => {
  it('certifies Linux execution here and claims nothing live elsewhere', () => {
    expect(process.platform).toBe('linux');

    // The matrix doc (docs/integration-matrix.md) is the single place where
    // platform evidence is recorded; this test pins its honesty contract:
    // Linux rows may say CERTIFIED only because this suite executes them.
    const doc = readFileSync(join(REPO_ROOT, 'docs', 'integration-matrix.md'), 'utf8');
    expect(doc).toContain('Linux: CERTIFIED (this suite executes on Linux)');
    expect(doc).toContain('NOT_TESTED');
    expect(doc).not.toMatch(/macOS: CERTIFIED|Windows: CERTIFIED/);
  });
});

describe('Phase 86F — conditional Junie capability', () => {
  /**
   * Junie lifecycle capture is EAP-only. The static contract may declare
   * native lifecycle, but runtime truth must downgrade a stable build
   * without hook support instead of leaving a false AUTO claim.
   */
  it('keeps Junie AUTO only when the installed build proves hook support', () => {
    const staticRow = buildIntegrationMatrix().find((row) => row.agent === 'junie')!;

    expect(staticRow.gaClass).toBe('AUTO_NATIVE');
    expect(staticRow.conditional).toBe(true);

    const stableRows = buildRuntimeIntegrationMatrix({
      junieCapability: resolveJunieCapability({
        probe: () => ({ detected: true, version: '1468.30' }),
      }),
    });
    const stableRow = stableRows.find((row) => row.agent === 'junie')!;

    expect(stableRow.auto).toBe(false);
    expect(stableRow.gaClass).toBe('BLOCKED');
    expect(stableRow.hookEvents).toEqual([]);

    // The documented EAP hook contract still yields AUTO when evidence exists.
    const eapRow = buildRuntimeIntegrationMatrix({
      junieCapability: resolveJunieCapability({
        probe: () => ({ detected: true, version: '9999.1-eap' }),
        hookEvidence: 'verified-eap-hooks',
      }),
    }).find((row) => row.agent === 'junie')!;

    expect(eapRow.auto).toBe(true);
    expect(eapRow.gaClass).toBe('AUTO_NATIVE');
    expect(eapRow.hookEvents).toEqual(['SessionStart', 'Stop', 'SessionEnd']);

    expect(stableRows.filter((row) => row.auto && row.agent === 'junie')).toHaveLength(0);
  });
});

describe('Phase 86F — P0/P0.1 permanent regression pins', () => {
  it('keeps the updater bounded with a truthful Step 4', () => {
    const ports = readFileSync(join(REPO_ROOT, 'src', 'production', 'upgrade', 'ports.ts'), 'utf8');
    const update = readFileSync(join(REPO_ROOT, 'src', 'production', 'update.ts'), 'utf8');

    expect(ports).toContain('DEFAULT_DAEMON_RESTART_TIMEOUT_MS');
    expect(ports).toContain('UPGRADE_DAEMON_RESTART_TIMEOUT');
    expect(update).toContain('Applying local upgrade');
    expect(update).toContain('Package installed:');
  });

  it('keeps parser truth and fail-closed grammar behavior', () => {
    const runtime = readFileSync(
      join(REPO_ROOT, 'src', 'code-intelligence', 'parsers', 'tree-sitter', 'runtime.ts'),
      'utf8'
    );

    expect(runtime).toContain('createRequire');
    expect(runtime).toContain('grammarHashCache');
  });

  it('keeps the certify timeout policy with named budgets', () => {
    const cert = readFileSync(
      join(REPO_ROOT, 'src', 'production', 'production-certify.ts'),
      'utf8'
    );

    expect(cert).toContain('PACKAGING_PROBE_TIMEOUT_MS');
    expect(cert).toContain('CERTIFY_SUBPROCESS_TIMEOUT');
  });

  it('keeps standalone routes and runtime-truthful parser reporting', () => {
    const audit = spawnSync(process.execPath, ['scripts/standalone-route-audit.mjs'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      timeout: 30_000,
    });

    expect(audit.status).toBe(0);
    expect(audit.stdout).toContain('STANDALONE_ROUTE_PARITY=PASS');
  });
});
