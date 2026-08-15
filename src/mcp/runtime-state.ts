export type MCPRuntimePhase = 'starting' | 'hydrating' | 'ready' | 'degraded' | 'failed';

export type MCPDependencyName = 'memory' | 'graph' | 'semantic';

export type MCPDependencyPhase = 'idle' | 'loading' | 'ready' | 'failed';

export interface MCPDependencyRuntime {
  state: MCPDependencyPhase;
  attempts: number;
  readyAfterMs?: number;
  lastError?: string;
}

export interface MCPRuntimeMetrics {
  processStartedAtMs: number;
  mcpConnectedAtMs?: number;
  startupMs?: number;

  hydrationStartedAtMs?: number;
  hydrationFinishedAtMs?: number;
  hydrationMs?: number;

  hydrationRuns: number;
  retryCount: number;
}

export interface MCPRuntimeState {
  phase: MCPRuntimePhase;

  dependencies: Record<MCPDependencyName, MCPDependencyRuntime>;

  metrics: MCPRuntimeMetrics;

  errors: string[];

  dataSource: 'none' | 'embedded' | 'daemon';

  lastUpdatedAt: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function touch(runtime: MCPRuntimeState): void {
  runtime.lastUpdatedAt = nowIso();
}

export function createMCPRuntimeState(processStartedAtMs = Date.now()): MCPRuntimeState {
  return {
    phase: 'starting',

    dependencies: {
      memory: {
        state: 'idle',
        attempts: 0,
      },

      graph: {
        state: 'idle',
        attempts: 0,
      },

      semantic: {
        state: 'idle',
        attempts: 0,
      },
    },

    metrics: {
      processStartedAtMs,
      hydrationRuns: 0,
      retryCount: 0,
    },

    errors: [],

    dataSource: 'none',

    lastUpdatedAt: nowIso(),
  };
}

export function markMCPConnected(runtime: MCPRuntimeState, at = Date.now()): void {
  runtime.metrics.mcpConnectedAtMs = at;

  runtime.metrics.startupMs = at - runtime.metrics.processStartedAtMs;

  runtime.phase = 'hydrating';

  touch(runtime);
}

export function markHydrationStarted(runtime: MCPRuntimeState, at = Date.now()): void {
  runtime.phase = 'hydrating';

  runtime.metrics.hydrationStartedAtMs = at;

  runtime.metrics.hydrationRuns += 1;

  touch(runtime);
}

export function markDependencyLoading(
  runtime: MCPRuntimeState,
  dependency: MCPDependencyName
): void {
  if (runtime.dependencies[dependency].state === 'ready') {
    return;
  }

  runtime.dependencies[dependency].state = 'loading';

  runtime.dependencies[dependency].lastError = undefined;

  touch(runtime);
}

export function recordDependencyAttempt(
  runtime: MCPRuntimeState,
  dependency: MCPDependencyName
): void {
  runtime.dependencies[dependency].attempts += 1;

  touch(runtime);
}

export function recordRuntimeRetry(runtime: MCPRuntimeState): void {
  runtime.metrics.retryCount += 1;

  touch(runtime);
}

export function markDependencyReady(
  runtime: MCPRuntimeState,
  dependency: MCPDependencyName,
  at = Date.now()
): void {
  const state = runtime.dependencies[dependency];

  state.state = 'ready';

  state.lastError = undefined;

  state.readyAfterMs = at - runtime.metrics.processStartedAtMs;

  touch(runtime);
}

export function markDependencyFailed(
  runtime: MCPRuntimeState,
  dependency: MCPDependencyName,
  error: unknown
): void {
  const state = runtime.dependencies[dependency];

  state.state = 'failed';

  state.lastError = error instanceof Error ? error.message : String(error);

  touch(runtime);
}

export function markHydrationCompleted(runtime: MCPRuntimeState, at = Date.now()): void {
  runtime.metrics.hydrationFinishedAtMs = at;

  if (runtime.metrics.hydrationStartedAtMs !== undefined) {
    runtime.metrics.hydrationMs = at - runtime.metrics.hydrationStartedAtMs;
  }

  runtime.errors = (
    Object.entries(runtime.dependencies) as Array<[MCPDependencyName, MCPDependencyRuntime]>
  )
    .filter(([, value]) => value.state === 'failed')
    .map(([name, value]) => `${name}: ${value.lastError ?? 'unknown error'}`);

  const allReady = (Object.values(runtime.dependencies) as MCPDependencyRuntime[]).every(
    (value) => value.state === 'ready'
  );

  runtime.phase = allReady ? 'ready' : 'degraded';

  touch(runtime);
}

export function markRuntimeFailed(runtime: MCPRuntimeState, error: unknown): void {
  runtime.phase = 'failed';

  runtime.errors = [error instanceof Error ? error.message : String(error)];

  touch(runtime);
}

export interface RetryOperationOptions {
  attempts: number;
  delayMs: number;
  onAttempt?: (attempt: number) => void;
  onRetry?: (attempt: number, error: unknown) => void;
}

export async function retryOperation<T>(
  operation: () => Promise<T>,
  options: RetryOperationOptions
): Promise<T> {
  const attempts = Math.max(1, Math.floor(options.attempts));

  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    options.onAttempt?.(attempt);

    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt >= attempts) {
        break;
      }

      options.onRetry?.(attempt, error);

      if (options.delayMs > 0) {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, options.delayMs);
        });
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError ?? 'operation failed'));
}
