/**
 * Canonical memory pipeline status.
 *
 * One read-only model shared by `toolnet-memory status`, `doctor`, MCP status
 * and integration reporting. It separates integration *configuration* from
 * runtime *health* so a configured install is never reported as a working
 * memory pipeline.
 *
 * Every field is derived from durable on-disk state (session WAL state files,
 * the learned journal, the canonical MemoryStore). Nothing here mutates state,
 * reconciles memory or advances a cursor.
 */

import type { ProjectManifest } from '../core/types.js';

import type { StorageProvider } from '../storage/types.js';

import { ConvergentMemoryStore } from '../multi-host/memory-projection.js';

import { loadSessionMemoryBatches } from '../session/learner/journal.js';

import type { LearnedMemoryBatch } from '../session/learner/types.js';

import { materializationErrorCode } from '../session/learner/materialization-error.js';

import { inspectSessionCaptureHealth, readSessionSourceStates } from './session-capture-health.js';

import { detectAgentIntegrations, type AgentDetection } from './integration-detection.js';

/* ------------------------------------------------------------------ */
/* Bounded states                                                      */
/* ------------------------------------------------------------------ */

export type ConfigurationState = 'configured' | 'missing' | 'invalid';

/** How an agent's session events reach ToolNet. */
export type CaptureMode = 'hook' | 'manual-sync' | 'mcp-only' | 'unsupported';

export type CaptureHealth = 'healthy' | 'idle' | 'degraded' | 'unavailable' | 'unknown';

export type WalHealth = 'empty' | 'current' | 'pending' | 'corrupt' | 'unavailable';

export type JournalHealth = 'empty' | 'current' | 'pending' | 'corrupt' | 'unavailable';

export type MemoryStoreState = 'empty' | 'current' | 'stale' | 'corrupt' | 'unavailable';

export type MaterializationHealth =
  'current' | 'pending' | 'failed' | 'empty' | 'unavailable' | 'unknown';

/** Aggregate health. `idle` is a healthy, non-error state for a fresh project. */
export type OverallHealth = 'healthy' | 'idle' | 'warning' | 'error';

/* ------------------------------------------------------------------ */
/* Shape                                                               */
/* ------------------------------------------------------------------ */

export interface AgentPipelineStatus {
  agent: string;

  label: string;

  configured: boolean;

  captureMode: CaptureMode;

  captureStatus: CaptureHealth;

  lastCaptureAt?: string;

  materializationStatus: MaterializationHealth;

  pendingMaterialization: number;
}

export interface MemoryPipelineStatus {
  configuration: ConfigurationState;

  capture: {
    status: CaptureHealth;

    sessions: number;

    agents: string[];

    lastCaptureAt?: string;
  };

  wal: {
    state: WalHealth;

    /**
     * Bytes in the source WAL past the learner offset — pending work for the
     * learner, counted in bytes so status never reads full WAL payloads.
     */
    pendingLearnerBytes: number;

    /** fsync'd events not yet acknowledged by remote storage. */
    pendingRemoteEvents: number;

    /** Highest durable sequence seen across source WALs. */
    totalEvents: number;
  };

  journal: {
    state: JournalHealth;

    batches: number;

    /** Learned candidates not yet reflected in the canonical MemoryStore. */
    pendingCandidates: number;
  };

  memoryStore: {
    state: MemoryStoreState;

    count: number;
  };

  materialization: {
    state: MaterializationHealth;

    canonicalCount: number;

    pending: number;

    /** Coded, content-free reason when a durable read failed. */
    errorCode?: string;
  };

  lastCaptureAt?: string;

  lastMaterializationAt?: string;

  pendingMaterialization: number;

  /** After 86B2-B5 the daemon is not required for memory correctness. */
  requiresDaemon: false;

  integrations: AgentPipelineStatus[];

  overall: OverallHealth;
}

/* ------------------------------------------------------------------ */
/* Findings                                                            */
/* ------------------------------------------------------------------ */

export interface MemoryPipelineFinding {
  severity: 'info' | 'warning' | 'error';

  message: string;
}

/**
 * Doctor/status findings, most severe first. Content-free: only counts, coded
 * reasons and states — never session content or secrets.
 */
export function memoryPipelineFindings(status: MemoryPipelineStatus): MemoryPipelineFinding[] {
  const findings: MemoryPipelineFinding[] = [];

  if (status.memoryStore.state === 'corrupt') {
    findings.push({
      severity: 'error',

      message: `Canonical MemoryStore is unreadable${status.materialization.errorCode ? ` (${status.materialization.errorCode})` : ''}`,
    });
  }

  if (status.journal.state === 'corrupt') {
    findings.push({
      severity: 'error',

      message: 'Learned journal contains malformed batch files',
    });
  }

  if (status.materialization.state === 'failed' && status.memoryStore.state !== 'corrupt') {
    findings.push({
      severity: 'error',

      message: `Memory materialization failed with ${status.materialization.errorCode ?? 'materialize-failed'}`,
    });
  }

  if (status.pendingMaterialization > 0) {
    findings.push({
      severity: 'warning',

      message: `${status.pendingMaterialization} learned journal candidate(s) pending materialization`,
    });
  }

  if (status.capture.status === 'degraded') {
    findings.push({ severity: 'warning', message: 'Session capture is degraded' });
  }

  if (status.overall === 'idle') {
    findings.push({
      severity: 'info',

      message: 'No captured sessions yet; memory is empty but healthy',
    });
  }

  return findings;
}

/** Warning/error messages only, suitable for a doctor warnings list. */
export function memoryPipelineWarnings(status: MemoryPipelineStatus): string[] {
  return memoryPipelineFindings(status)
    .filter((finding) => finding.severity !== 'info')
    .map((finding) => finding.message);
}

/* ------------------------------------------------------------------ */
/* Agent catalog                                                       */
/* ------------------------------------------------------------------ */

interface AgentSpec {
  agent: string;

  label: string;

  captureMode: CaptureMode;
}

/** Fixed order so human and JSON output stay stable. */
export const PIPELINE_AGENTS: readonly AgentSpec[] = [
  { agent: 'claude', label: 'Claude', captureMode: 'hook' },
  { agent: 'cursor', label: 'Cursor', captureMode: 'hook' },
  { agent: 'copilot', label: 'Copilot', captureMode: 'hook' },
  { agent: 'grok', label: 'Grok', captureMode: 'hook' },
  { agent: 'kiro', label: 'Kiro', captureMode: 'hook' },
  { agent: 'opencode', label: 'OpenCode', captureMode: 'manual-sync' },
  { agent: 'codex', label: 'Codex', captureMode: 'manual-sync' },
  { agent: 'agy', label: 'Agy', captureMode: 'manual-sync' },
  { agent: 'toolnet-cli', label: 'ToolNet CLI', captureMode: 'manual-sync' },
] as const;

/* ------------------------------------------------------------------ */
/* Inspection                                                          */
/* ------------------------------------------------------------------ */

export interface InspectMemoryPipelineOptions {
  project: ProjectManifest;

  storage?: StorageProvider;

  /**
   * Injectable integration detections so callers and tests can avoid spawning
   * command lookups. Production callers omit it.
   */
  detections?: AgentDetection[];
}

interface JournalRead {
  batches: LearnedMemoryBatch[];

  pendingCandidates: number;

  pendingByAgent: Map<string, number>;

  state: JournalHealth;
}

interface StoreRead {
  count: number;

  fingerprints: Set<string>;

  lastMaterializationAt?: string;

  state: MemoryStoreState;

  errorCode?: string;
}

function fingerprintOf(memory: { metadata?: Record<string, unknown> }): string | undefined {
  const value = memory.metadata?.learningFingerprint;

  return typeof value === 'string' ? value : undefined;
}

function latestTimestamp(values: Array<string | undefined>): string | undefined {
  return values
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);
}

async function countJournalFiles(
  project: ProjectManifest,
  storage: StorageProvider
): Promise<number> {
  const objects = await storage.list(`projects/${project.id}/memory/learned/batches/`);

  return objects.filter((object) => object.key.endsWith('.json')).length;
}

async function readJournal(
  project: ProjectManifest,
  storage: StorageProvider | undefined
): Promise<JournalRead> {
  if (!storage) {
    return { batches: [], pendingCandidates: 0, pendingByAgent: new Map(), state: 'unavailable' };
  }

  let batches: LearnedMemoryBatch[];

  try {
    batches = await loadSessionMemoryBatches(project, storage);
  } catch {
    return { batches: [], pendingCandidates: 0, pendingByAgent: new Map(), state: 'unavailable' };
  }

  if (batches.length === 0) {
    return { batches, pendingCandidates: 0, pendingByAgent: new Map(), state: 'empty' };
  }

  let corrupted = false;

  try {
    corrupted = (await countJournalFiles(project, storage)) > batches.length;
  } catch {
    corrupted = false;
  }

  return {
    batches,

    pendingCandidates: 0,

    pendingByAgent: new Map(),

    state: corrupted ? 'corrupt' : 'current',
  };
}

async function readStore(
  project: ProjectManifest,
  storage: StorageProvider | undefined
): Promise<StoreRead> {
  if (!storage) {
    return { count: 0, fingerprints: new Set(), state: 'unavailable' };
  }

  try {
    const memories = await new ConvergentMemoryStore(storage).load(project.id);

    return {
      count: memories.length,

      fingerprints: new Set(
        memories
          .map((memory) => fingerprintOf(memory))
          .filter((value): value is string => Boolean(value))
      ),

      lastMaterializationAt: latestTimestamp(memories.map((memory) => memory.updatedAt)),

      state: memories.length > 0 ? 'current' : 'empty',
    };
  } catch (error) {
    const code = materializationErrorCode(error);

    return {
      count: 0,

      fingerprints: new Set(),

      state: 'corrupt',

      errorCode: code === 'materialize-failed' ? 'memory-store-read-failed' : code,
    };
  }
}

function applyPending(journal: JournalRead, store: StoreRead): JournalRead {
  const pendingByAgent = new Map<string, number>();

  let pendingCandidates = 0;

  for (const batch of journal.batches) {
    for (const candidate of batch.candidates) {
      if (store.fingerprints.has(candidate.fingerprint)) {
        continue;
      }

      pendingCandidates += 1;

      pendingByAgent.set(batch.agent, (pendingByAgent.get(batch.agent) ?? 0) + 1);
    }
  }

  return {
    ...journal,

    pendingCandidates,

    pendingByAgent,

    state: pendingCandidates > 0 ? 'pending' : journal.state,
  };
}

function captureHealthFor(options: {
  configured: boolean;

  sessions: number;

  degraded: boolean;
}): CaptureHealth {
  if (!options.configured) {
    return 'unavailable';
  }

  if (options.degraded) {
    return 'degraded';
  }

  return options.sessions > 0 ? 'healthy' : 'idle';
}

function materializationState(options: {
  store: StoreRead;

  pending: number;

  batches: number;
}): MaterializationHealth {
  if (options.store.state === 'corrupt') {
    return 'failed';
  }

  if (options.store.state === 'unavailable') {
    return 'unavailable';
  }

  if (options.pending > 0) {
    return 'pending';
  }

  if (options.batches === 0 && options.store.count === 0) {
    return 'empty';
  }

  return 'current';
}

function agentMaterializationState(options: {
  pending: number;

  hasBatches: boolean;
}): MaterializationHealth {
  if (options.pending > 0) {
    return 'pending';
  }

  return options.hasBatches ? 'current' : 'empty';
}

function walState(options: {
  sessions: number;

  pendingLearnerBytes: number;

  pendingRemoteEvents: number;
}): WalHealth {
  if (options.sessions === 0) {
    return 'empty';
  }

  if (options.pendingLearnerBytes > 0 || options.pendingRemoteEvents > 0) {
    return 'pending';
  }

  return 'current';
}

function overallHealth(options: {
  journal: JournalHealth;

  store: StoreRead;

  materialization: MaterializationHealth;

  pendingMaterialization: number;

  sessions: number;

  batches: number;
}): OverallHealth {
  if (
    options.store.state === 'corrupt' ||
    options.journal === 'corrupt' ||
    options.materialization === 'failed'
  ) {
    return 'error';
  }

  if (options.pendingMaterialization > 0) {
    return 'warning';
  }

  if (options.sessions === 0 && options.batches === 0 && options.store.count === 0) {
    return 'idle';
  }

  return 'healthy';
}

export async function inspectMemoryPipeline(
  options: InspectMemoryPipelineOptions
): Promise<MemoryPipelineStatus> {
  const { project, storage } = options;

  const capture = inspectSessionCaptureHealth(project);

  const sources = readSessionSourceStates(project);

  const detections = options.detections ?? detectAgentIntegrations();

  const configuredAgents = new Set<string>(
    detections.filter((detection) => detection.detected).map((detection) => detection.agent)
  );

  const configuration: ConfigurationState = configuredAgents.size > 0 ? 'configured' : 'missing';

  const store = await readStore(project, storage);

  const journal = applyPending(await readJournal(project, storage), store);

  const pendingLearnerBytes = sources.reduce((sum, entry) => {
    const raw = Number(entry.state.sourceCursors['memory.learner.offset'] ?? 0);

    const offset = Number.isFinite(raw) ? Math.max(0, raw) : 0;

    return sum + Math.max(0, entry.eventsFileSize - offset);
  }, 0);

  const pendingRemoteEvents = sources.reduce(
    (sum, entry) => sum + Math.max(0, entry.state.lastSequence - entry.state.lastRemoteSequence),
    0
  );

  const totalEvents = sources.reduce((max, entry) => Math.max(max, entry.state.lastSequence), 0);

  const materialization = materializationState({
    store,

    pending: journal.pendingCandidates,

    batches: journal.batches.length,
  });

  const captureStatus = captureHealthFor({
    configured: configuration !== 'missing',

    sessions: capture.sessions,

    degraded: capture.syncHealth === 'degraded',
  });

  const integrations = PIPELINE_AGENTS.map((spec) => {
    const agentSources = sources.filter((entry) => entry.state.agent === spec.agent);

    const configured = configuredAgents.has(spec.agent);

    const pending = journal.pendingByAgent.get(spec.agent) ?? 0;

    return {
      agent: spec.agent,

      label: spec.label,

      configured,

      captureMode: spec.captureMode,

      captureStatus: captureHealthFor({
        configured,

        sessions: agentSources.length,

        degraded: spec.agent === 'opencode' && capture.syncHealth === 'degraded',
      }),

      lastCaptureAt: latestTimestamp(
        agentSources.map((entry) => entry.state.lastLocalEventAt ?? entry.state.updatedAt)
      ),

      materializationStatus: agentMaterializationState({
        pending,

        hasBatches: journal.batches.some((batch) => batch.agent === spec.agent),
      }),

      pendingMaterialization: pending,
    };
  });

  const wal = walState({ sessions: sources.length, pendingLearnerBytes, pendingRemoteEvents });

  return {
    configuration,

    capture: {
      status: captureStatus,

      sessions: capture.sessions,

      agents: capture.agents,

      lastCaptureAt: capture.lastCaptureAt,
    },

    wal: {
      state: wal,

      pendingLearnerBytes,

      pendingRemoteEvents,

      totalEvents,
    },

    journal: {
      state: journal.state,

      batches: journal.batches.length,

      pendingCandidates: journal.pendingCandidates,
    },

    memoryStore: {
      state: journal.pendingCandidates > 0 ? 'stale' : store.state,

      count: store.count,
    },

    materialization: {
      state: materialization,

      canonicalCount: store.count,

      pending: journal.pendingCandidates,

      ...(store.errorCode ? { errorCode: store.errorCode } : {}),
    },

    lastCaptureAt: capture.lastCaptureAt,

    lastMaterializationAt: store.lastMaterializationAt,

    pendingMaterialization: journal.pendingCandidates,

    requiresDaemon: false,

    integrations,

    overall: overallHealth({
      journal: journal.state,

      store,

      materialization,

      pendingMaterialization: journal.pendingCandidates,

      sessions: sources.length,

      batches: journal.batches.length,
    }),
  };
}
