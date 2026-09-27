/*
 * Phase 85B — deterministic MCP startup timing helpers.
 *
 * The original fast-startup assertion raced `client.connect()` against a single
 * 3000ms wall clock. That one budget conflated three different costs:
 *
 *   A. child process spawn + tsx transpilation (dev tooling, host-dependent)
 *   B. MCP transport bring-up
 *   C. the MCP `initialize` round trip
 *
 * Cold tsx transpilation under full-suite CPU contention dominated A (measured
 * ~2.1–2.5s even in isolation), so the test flaked near the 3000ms edge even
 * though the product never blocked on S3.
 *
 * The timing model here separates the concerns:
 *
 *   - A generous but strictly bounded PROCESS bootstrap budget guards against a
 *     true hang or deadlock, including an `initialize` that waits for
 *     unreachable storage.
 *   - The MCP startup latency is read from the server's own runtime metric
 *     (`toolnet_status` → `runtime.metrics.startupMs`), which the child measures
 *     AFTER module load and transport connect and BEFORE hydration. It therefore
 *     excludes process spawn and tsx transpilation (measured ~50–70ms vs ~2.2s),
 *     so host CPU contention cannot turn a healthy initialize into a false
 *     failure — while a real regression that blocks initialize on storage still
 *     blows the tight budget.
 */

import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

/** Transport shape accepted by `Client.connect` (avoids a deep SDK import path). */
type ClientTransport = Parameters<Client['connect']>[0];

/** Outer process/bootstrap safety budget. Generous, but strictly bounded. */
export const PROCESS_BOOTSTRAP_BUDGET_MS = 30_000;

/** Tight MCP startup-latency budget (server-reported, spawn-independent). */
export const MCP_STARTUP_LATENCY_BUDGET_MS = 3_000;

export class BootstrapBudgetExceededError extends Error {
  readonly budgetMs: number;

  constructor(label: string, budgetMs: number) {
    super(`${label} exceeded the ${budgetMs}ms bounded budget`);
    this.name = 'BootstrapBudgetExceededError';
    this.budgetMs = budgetMs;
  }
}

/**
 * Race a promise against a positive, finite timeout.
 *
 * There is no retry and no unbounded wait: an over-budget operation rejects with
 * `BootstrapBudgetExceededError`. The loser of the race stays observed by
 * `Promise.race`, so a late rejection never becomes an unhandled rejection.
 */
export function withBoundedTimeout<T>(
  promise: Promise<T>,
  budgetMs: number,
  label: string
): Promise<T> {
  if (!Number.isFinite(budgetMs) || budgetMs <= 0) {
    throw new Error(
      `withBoundedTimeout requires a positive finite budget (got ${String(budgetMs)})`
    );
  }

  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new BootstrapBudgetExceededError(label, budgetMs));
    }, budgetMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  });
}

export interface BootstrapResult {
  /** Wall clock for spawn + transpile + transport + initialize (diagnostic only). */
  bootstrapMs: number;
}

/**
 * Connect the MCP client under the bounded process budget.
 *
 * `client.connect(transport)` calls `transport.start()` (spawns the child) and
 * then performs the MCP initialize handshake, so a resolved promise is the
 * deterministic readiness signal: the server has answered `initialize`.
 */
export async function connectWithBoundedBootstrap(
  client: Client,
  transport: ClientTransport,
  budgetMs: number = PROCESS_BOOTSTRAP_BUDGET_MS
): Promise<BootstrapResult> {
  const startedAt = Date.now();

  await withBoundedTimeout(client.connect(transport), budgetMs, 'MCP process bootstrap');

  return { bootstrapMs: Date.now() - startedAt };
}

export interface StartupLatencyVerdict {
  ok: boolean;
  reason?: string;
}

/**
 * Pure evaluation of the server-reported startup latency against the tight
 * budget. Kept pure so the certification suite can prove an over-budget
 * initialize is rejected without depending on host timing.
 */
export function evaluateStartupLatency(
  startupMs: number,
  budgetMs: number = MCP_STARTUP_LATENCY_BUDGET_MS
): StartupLatencyVerdict {
  if (!Number.isFinite(startupMs) || startupMs < 0) {
    return { ok: false, reason: `invalid MCP startup metric: ${String(startupMs)}` };
  }

  if (startupMs >= budgetMs) {
    return {
      ok: false,
      reason: `MCP startup latency ${startupMs}ms exceeded ${budgetMs}ms budget`,
    };
  }

  return { ok: true };
}

/** Extract the first text payload from an MCP tool result. */
function firstTextContent(result: { content?: Array<{ type: string; text?: string }> }): string {
  const entry = result.content?.find(
    (part) => part.type === 'text' && typeof part.text === 'string'
  );

  if (entry?.text === undefined) {
    throw new Error('MCP tool result had no text content');
  }

  return entry.text;
}

export interface ServerStartupReport {
  /** Server-reported startup latency, measured in-process before hydration. */
  startupMs: number;
  /** Runtime phase observed immediately after the handshake. */
  phase: string;
}

/**
 * Read the server-reported startup latency through the existing `toolnet_status`
 * tool. This is the deterministic, spawn-independent readiness/latency signal.
 */
export async function readServerStartup(client: Client): Promise<ServerStartupReport> {
  const result = (await client.callTool({ name: 'toolnet_status', arguments: {} })) as {
    content?: Array<{ type: string; text?: string }>;
  };

  const parsed = JSON.parse(firstTextContent(result)) as {
    runtime?: { phase?: unknown; metrics?: { startupMs?: unknown } };
  };

  const startupMs = parsed.runtime?.metrics?.startupMs;
  const phase = parsed.runtime?.phase;

  if (typeof startupMs !== 'number' || typeof phase !== 'string') {
    throw new Error('toolnet_status did not report runtime metrics');
  }

  return { startupMs, phase };
}

/**
 * Environment for the fast-startup scenario: storage points at a deliberately
 * unreachable endpoint so a bootstrap that waits for hydration cannot complete.
 */
export function buildUnreachableStorageEnv(
  projectRoot: string,
  emptyGlobalEnvFile: string
): Record<string, string> {
  const env: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      env[key] = value;
    }
  }

  env.TOOLNET_GLOBAL_ENV = emptyGlobalEnvFile;

  env.MEMORY_STORAGE_PROVIDER = 's3';
  env.S3_ENDPOINT = 'http://10.255.255.1:9';
  env.S3_REGION = 'us-east-1';
  env.S3_BUCKET = 'toolnet-fast-startup-test';
  env.S3_ACCESS_KEY_ID = 'test';
  env.S3_SECRET_ACCESS_KEY = 'test';
  env.S3_FORCE_PATH_STYLE = 'true';

  env.AWS_EC2_METADATA_DISABLED = 'true';

  return env;
}
