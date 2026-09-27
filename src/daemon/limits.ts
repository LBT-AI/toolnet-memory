/*
 * Phase 77 — Local Coordination Daemon limits.
 *
 * Every hard bound lives here so no scattered magic numbers exist. Values are
 * deliberately conservative: the daemon is a local shared runtime, not a server.
 */

export const DAEMON_LIMITS = {
  /** Maximum framed IPC message (bytes) accepted in either direction. */
  maxMessageBytes: 8 * 1024 * 1024,

  /** Maximum concurrent client connections. */
  maxClients: 64,

  /** Maximum in-flight requests per connection. */
  maxOutstandingRequests: 32,

  /** Maximum progress subscriptions per connection. */
  maxSubscriptionsPerClient: 16,

  /** Maximum bytes queued for a slow client before progress events are dropped. */
  maxOutboundQueueBytes: 1024 * 1024,

  /** Client heartbeat cadence (ms). */
  heartbeatIntervalMs: 5_000,

  /** A session with no heartbeat for this long is considered abandoned. */
  heartbeatTimeoutMs: 30_000,

  /** Maximum resident project runtimes before idle eviction kicks in. */
  maxResidentProjects: 8,

  /** An idle project runtime is evicted after this long (ms). */
  idleEvictionMs: 5 * 60_000,

  /** Maximum retained daemon log lines. */
  maxLogLines: 2_000,

  /** Maximum cached Phase 78 evidence bundles (bounded, generation-keyed). */
  maxEvidenceCacheEntries: 128,

  /** Maximum cached Phase 80 change reports (bounded, generation-keyed). */
  maxChangeCacheEntries: 64,

  /** Default project-level watcher debounce (ms). */
  watcherDebounceMs: 250,

  /** Maximum paths reported per watcher batch. */
  maxWatcherBatch: 256,

  /** Bounded time a graceful shutdown waits for transient work (ms). */
  gracefulShutdownMs: 10_000,

  /** Bounded time a forced shutdown waits before exiting (ms). */
  forcedShutdownMs: 2_000,
} as const;

/**
 * Bounds as injectable numbers.
 *
 * Deliberately wider than the literal defaults so tests and operators can
 * tighten a single bound without widening every other one.
 */
export type DaemonLimits = { readonly [K in keyof typeof DAEMON_LIMITS]: number };

/** Allow tests and operators to tighten (never silently loosen) the bounds. */
export function resolveDaemonLimits(overrides: Partial<DaemonLimits> = {}): DaemonLimits {
  return { ...DAEMON_LIMITS, ...overrides };
}
