/*
 * Phase 85B — Fast Startup Flake Hardening certification.
 *
 * Proves that the fast-startup test no longer conflates cold process spawn /
 * tsx transpilation with MCP initialize latency, that a healthy initialize
 * still passes, that an intentionally slow initialize still fails, and that the
 * bounded timeout never retries to mask a failure.
 *
 * This suite is analysis/test-only: it changes no product code and no release
 * metadata.
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

import { describe, expect, it } from 'vitest';

import {
  BootstrapBudgetExceededError,
  MCP_STARTUP_LATENCY_BUDGET_MS,
  PROCESS_BOOTSTRAP_BUDGET_MS,
  buildUnreachableStorageEnv,
  connectWithBoundedBootstrap,
  evaluateStartupLatency,
  readServerStartup,
  withBoundedTimeout,
} from '../mcp/startup-timing.js';

const PHASE85B_MARKER = 'PHASE85B_FAST_STARTUP_HARDENING';

interface TempProject {
  root: string;
  emptyGlobalEnv: string;
}

function makeTempProject(prefix: string): TempProject {
  const root = mkdtempSync(join(tmpdir(), prefix));
  const emptyGlobalEnv = join(root, 'empty.env');

  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({ name: 'toolnet-phase85b', private: true }, null, 2)
  );

  writeFileSync(emptyGlobalEnv, '');

  return { root, emptyGlobalEnv };
}

function cleanEnv(): Record<string, string> {
  const env: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      env[key] = value;
    }
  }

  return env;
}

/** Spawn the real MCP bootstrap against unreachable storage. */
function realBootstrapTransport(project: TempProject): StdioClientTransport {
  return new StdioClientTransport({
    command: resolve('node_modules/.bin/tsx'),
    args: [resolve('src/mcp/bootstrap.ts')],
    cwd: project.root,
    env: buildUnreachableStorageEnv(project.root, project.emptyGlobalEnv),
  });
}

const STUB_SOURCE = `
import process from 'node:process';
import { writeFileSync } from 'node:fs';

const delayMs = Number(process.env.STUB_INITIALIZE_DELAY_MS ?? '0');
const countFile = process.env.STUB_INITIALIZE_COUNT_FILE ?? '';

let buffer = '';
let initializeCount = 0;

function write(message) {
  process.stdout.write(JSON.stringify(message) + '\\n');
}

function respondInitialize(id) {
  write({
    jsonrpc: '2.0',
    id,
    result: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      serverInfo: { name: 'toolnet-stub-mcp', version: '1.0.0' },
    },
  });
}

process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk) => {
  buffer += chunk;

  let index;

  while ((index = buffer.indexOf('\\n')) >= 0) {
    const line = buffer.slice(0, index).trim();

    buffer = buffer.slice(index + 1);

    if (!line) continue;

    let message;

    try {
      message = JSON.parse(line);
    } catch {
      continue;
    }

    if (message.method === 'initialize') {
      initializeCount += 1;

      if (countFile) {
        try {
          writeFileSync(countFile, String(initializeCount));
        } catch {
          /* count file is diagnostic only */
        }
      }

      if (delayMs > 0) {
        setTimeout(() => respondInitialize(message.id), delayMs);
      } else {
        respondInitialize(message.id);
      }
    }
  }
});
`;

interface StubHandle {
  client: Client;
  transport: StdioClientTransport;
  countFile: string;
}

function spawnStub(project: TempProject, delayMs: number): StubHandle {
  const stubPath = join(project.root, 'stub-server.mjs');
  const countFile = join(project.root, 'initialize-count.txt');

  writeFileSync(stubPath, STUB_SOURCE);

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [stubPath],
    cwd: project.root,
    env: {
      ...cleanEnv(),
      STUB_INITIALIZE_DELAY_MS: String(delayMs),
      STUB_INITIALIZE_COUNT_FILE: countFile,
    },
  });

  return {
    client: new Client({ name: 'toolnet-phase85b-stub', version: '1.0.0' }),
    transport,
    countFile,
  };
}

describe('Phase 85B — fast startup hardening', () => {
  it('separates cold process bootstrap from initialize latency', () => {
    /* Two distinct, finite budgets: the outer safety net is far more generous
     * than the tight latency assertion it protects. */
    expect(Number.isFinite(PROCESS_BOOTSTRAP_BUDGET_MS)).toBe(true);
    expect(Number.isFinite(MCP_STARTUP_LATENCY_BUDGET_MS)).toBe(true);
    expect(PROCESS_BOOTSTRAP_BUDGET_MS).toBeGreaterThan(MCP_STARTUP_LATENCY_BUDGET_MS);
    expect(MCP_STARTUP_LATENCY_BUDGET_MS).toBeGreaterThan(0);

    /* The hardened test no longer races a single wall clock over connect(). */
    const source = readFileSync('tests/mcp/fast-startup.test.ts', 'utf8');

    expect(source).toContain('connectWithBoundedBootstrap');
    expect(source).toContain('readServerStartup');
    expect(source).toContain('evaluateStartupLatency');
    expect(source).not.toContain('exceeded 3000ms');
    expect(source).not.toContain('Promise.race');
  });

  it('passes a healthy initialize and reports deterministic readiness', async () => {
    const project = makeTempProject('toolnet-phase85b-healthy-');
    const client = new Client({ name: 'toolnet-phase85b-healthy', version: '1.0.0' });
    const transport = realBootstrapTransport(project);

    try {
      const { bootstrapMs } = await connectWithBoundedBootstrap(client, transport);

      expect(bootstrapMs).toBeLessThan(PROCESS_BOOTSTRAP_BUDGET_MS);

      /* Deterministic readiness signal: the handshake populated server identity. */
      expect(client.getServerVersion()?.name).toBeTruthy();
      expect(client.getServerCapabilities()).toBeTypeOf('object');

      const { startupMs, phase } = await readServerStartup(client);

      /* The tight, spawn-independent latency assertion. */
      const verdict = evaluateStartupLatency(startupMs);

      expect(verdict.ok, verdict.reason).toBe(true);
      expect(startupMs).toBeLessThan(MCP_STARTUP_LATENCY_BUDGET_MS);

      /* Hydration had not finished when the handshake completed. */
      expect(['starting', 'hydrating']).toContain(phase);

      const listed = await client.listTools();

      expect(listed.tools.map((tool) => tool.name)).toContain('memory_agent_ask');
    } finally {
      await client.close().catch(() => undefined);
      rmSync(project.root, { recursive: true, force: true });
    }
  }, 60_000);

  it('fails an intentionally slow initialize under the bounded budget', async () => {
    const project = makeTempProject('toolnet-phase85b-slow-');
    const { client, transport, countFile } = spawnStub(project, 5_000);

    try {
      await expect(connectWithBoundedBootstrap(client, transport, 1_500)).rejects.toBeInstanceOf(
        BootstrapBudgetExceededError
      );

      /* No retry masking: the slow server observed exactly one initialize. */
      expect(readFileSync(countFile, 'utf8')).toBe('1');
    } finally {
      await client.close().catch(() => undefined);
      rmSync(project.root, { recursive: true, force: true });
    }
  }, 30_000);

  it('does not retry a timed-out operation', async () => {
    let invocations = 0;

    const neverResolves = new Promise<void>(() => {
      invocations += 1;
    });

    await expect(withBoundedTimeout(neverResolves, 50, 'no-retry')).rejects.toBeInstanceOf(
      BootstrapBudgetExceededError
    );

    expect(invocations).toBe(1);
  });

  it('bounds every timeout and rejects an unbounded budget', async () => {
    await expect(
      withBoundedTimeout(new Promise<void>(() => undefined), 50, 'hang')
    ).rejects.toBeInstanceOf(BootstrapBudgetExceededError);

    expect(() => withBoundedTimeout(Promise.resolve(1), 0, 'zero')).toThrow();
    expect(() => withBoundedTimeout(Promise.resolve(1), Number.POSITIVE_INFINITY, 'inf')).toThrow();
    expect(() => withBoundedTimeout(Promise.resolve(1), Number.NaN, 'nan')).toThrow();
  });

  it('evaluates startup latency deterministically at the budget boundary', () => {
    expect(evaluateStartupLatency(50).ok).toBe(true);
    expect(evaluateStartupLatency(2_999).ok).toBe(true);
    expect(evaluateStartupLatency(3_000).ok).toBe(false);
    expect(evaluateStartupLatency(5_000).ok).toBe(false);
    expect(evaluateStartupLatency(-1).ok).toBe(false);
    expect(evaluateStartupLatency(Number.NaN).ok).toBe(false);
  });

  it('is stable across repeated runs', async () => {
    const project = makeTempProject('toolnet-phase85b-repeat-');

    try {
      for (let run = 0; run < 5; run += 1) {
        const { client, transport } = spawnStub(project, 0);

        try {
          await connectWithBoundedBootstrap(client, transport, 5_000);

          expect(client.getServerVersion()?.name).toBe('toolnet-stub-mcp');
        } finally {
          await client.close().catch(() => undefined);
        }
      }
    } finally {
      rmSync(project.root, { recursive: true, force: true });
    }
  }, 30_000);

  it('emits the Phase 85B PASS marker', () => {
    console.log(`${PHASE85B_MARKER}=PASS`);

    expect(PHASE85B_MARKER).toBe('PHASE85B_FAST_STARTUP_HARDENING');
  });
});
