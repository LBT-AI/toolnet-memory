/**
 * ToolNet session memory recovery / backfill.
 *
 * Repairs ToolNet-owned durable state only: the local session WAL, the
 * immutable learned journal and the canonical MemoryStore. It never reads or
 * imports arbitrary native agent memory.
 *
 * Authority order stays:
 *   session WAL (event durability)
 *     -> learned journal (candidate durability/replay)
 *       -> canonical MemoryStore (durable knowledge)
 *
 * Recovery prefers an existing learned journal over regenerating candidates
 * from the WAL, because extraction logic may evolve across versions.
 */

import type { ProjectManifest } from '../../core/types.js';

import type { StorageProvider } from '../../storage/types.js';

import { join } from 'node:path';

import { readSessionSourceStates } from '../../production/session-capture-health.js';

import { ConvergentMemoryStore } from '../../multi-host/memory-projection.js';

import { createSessionIdentity } from '../identity.js';

import { SessionWal } from '../wal.js';

import { SessionMemoryLearner } from './learner.js';

import { SessionMemoryMaterializer } from './materializer.js';

import { readSessionMemoryBatchesStrict } from './journal.js';

/* ------------------------------------------------------------------ */
/* Errors                                                              */
/* ------------------------------------------------------------------ */

export type RecoveryErrorCode =
  | 'RECOVERY_WAL_CORRUPT'
  | 'RECOVERY_JOURNAL_CORRUPT'
  | 'RECOVERY_MEMORYSTORE_CORRUPT'
  | 'RECOVERY_STORAGE_UNAVAILABLE'
  | 'RECOVERY_LOCK_TIMEOUT'
  | 'RECOVERY_UNSUPPORTED_VERSION';

/** Domain-coded recovery failure. Messages never contain session content. */
export class RecoveryError extends Error {
  readonly code: RecoveryErrorCode;

  readonly detail?: string;

  constructor(code: RecoveryErrorCode, detail?: string) {
    super(detail ? `${code}: ${detail}` : code);

    this.name = 'RecoveryError';

    this.code = code;

    if (detail !== undefined) {
      this.detail = detail;
    }
  }
}

/* ------------------------------------------------------------------ */
/* State machine                                                       */
/* ------------------------------------------------------------------ */

export type RecoveryState =
  | 'empty'
  | 'wal-only'
  | 'journal-pending'
  | 'partially-materialized'
  | 'memorystore-missing'
  | 'current'
  | 'corrupt-journal'
  | 'corrupt-memorystore';

export type RecoveryFinalStatus = 'recovered' | 'already-current' | 'dry-run';

export interface RecoveryInspection {
  project: string;

  state: RecoveryState;

  walSessions: number;

  walPendingSessions: number;

  walPendingBytes: number;

  journalBatches: number;

  journalPending: number;

  memoriesBefore: number;

  malformedJournalKeys: string[];

  /** Read-only summary of the recovery authority order. */
  sourcePriority: string[];
}

export interface RecoveryReport {
  project: string;

  detectedState: RecoveryState;

  dryRun: boolean;

  walPendingSessions: number;

  walPendingBytes: number;

  journalBatchesBefore: number;

  journalPendingBefore: number;

  journalBatchesAdded: number;

  memoriesBefore: number;

  memoriesAdded: number;

  duplicates: number;

  finalStatus: RecoveryFinalStatus;
}

export interface RecoverSessionMemoryOptions {
  project: ProjectManifest;

  storage: StorageProvider;

  dryRun?: boolean;
}

/* ------------------------------------------------------------------ */
/* Inspection (read-only)                                              */
/* ------------------------------------------------------------------ */

interface SourceDescriptor {
  agent: string;

  nativeSessionId: string;

  directory: string;

  pendingBytes: number;
}

const SOURCE_PRIORITY = [
  'learned-journal (existing candidate batches)',
  'session-wal (only for ranges without an existing journal batch)',
  'canonical-memorystore (derived projection, merged last)',
];

/**
 * Recovery only mutates the current runtime layout. The legacy
 * `.toolnet/sessions/**` tree is read-only display state and must never be
 * rewritten, so those sources are intentionally excluded.
 */
function runtimeSourcesRoot(project: ProjectManifest): string {
  return join(project.rootPath, '.toolnet', 'runtime', 'sources');
}

function sourceDescriptors(project: ProjectManifest): SourceDescriptor[] {
  const root = runtimeSourcesRoot(project);

  return readSessionSourceStates(project)
    .filter((entry) => entry.directory.startsWith(root))
    .map((entry) => {
      const raw = Number(entry.state.sourceCursors['memory.learner.offset'] ?? 0);

      const offset = Number.isFinite(raw) ? Math.max(0, raw) : 0;

      return {
        agent: entry.state.agent,

        nativeSessionId: entry.state.nativeSessionId,

        directory: entry.directory,

        pendingBytes: Math.max(0, entry.eventsFileSize - offset),
      };
    });
}

function fingerprintOf(memory: { metadata?: Record<string, unknown> }): string | undefined {
  const value = memory.metadata?.learningFingerprint;

  return typeof value === 'string' ? value : undefined;
}

async function loadMemories(
  project: ProjectManifest,
  storage: StorageProvider
): Promise<{ count: number; fingerprints: Set<string> }> {
  let memories: Array<{ metadata?: Record<string, unknown> }>;

  try {
    memories = await new ConvergentMemoryStore(storage).load(project.id);
  } catch {
    throw new RecoveryError('RECOVERY_MEMORYSTORE_CORRUPT');
  }

  return {
    count: memories.length,

    fingerprints: new Set(
      memories
        .map((memory) => fingerprintOf(memory))
        .filter((value): value is string => Boolean(value))
    ),
  };
}

function classify(options: {
  walPendingSessions: number;

  journalBatches: number;

  journalPending: number;

  malformedKeys: string[];

  storeCount: number;

  matchedFingerprints: number;
}): RecoveryState {
  if (options.malformedKeys.length > 0) {
    return 'corrupt-journal';
  }

  if (options.journalPending > 0) {
    if (options.storeCount > 0 && options.matchedFingerprints > 0) {
      return 'partially-materialized';
    }

    if (options.storeCount === 0) {
      return 'memorystore-missing';
    }

    return 'journal-pending';
  }

  if (options.walPendingSessions > 0 && options.journalBatches === 0) {
    return 'wal-only';
  }

  if (options.journalBatches > 0 || options.storeCount > 0) {
    return 'current';
  }

  return 'empty';
}

export async function inspectRecovery(
  project: ProjectManifest,
  storage: StorageProvider
): Promise<RecoveryInspection> {
  const sources = sourceDescriptors(project);

  const walPendingSessions = sources.filter((source) => source.pendingBytes > 0).length;

  const walPendingBytes = sources.reduce((sum, source) => sum + source.pendingBytes, 0);

  let read: Awaited<ReturnType<typeof readSessionMemoryBatchesStrict>>;

  try {
    read = await readSessionMemoryBatchesStrict(project, storage);
  } catch {
    throw new RecoveryError('RECOVERY_STORAGE_UNAVAILABLE');
  }

  const malformedKeys = read.malformedKeys;

  const journalBatches = read.batches.length;

  let storeCount = 0;

  let storeFingerprints = new Set<string>();

  let memoryStoreCorrupt = false;

  if (malformedKeys.length === 0) {
    try {
      const store = await loadMemories(project, storage);

      storeCount = store.count;

      storeFingerprints = store.fingerprints;
    } catch (error) {
      if (error instanceof RecoveryError && error.code === 'RECOVERY_MEMORYSTORE_CORRUPT') {
        memoryStoreCorrupt = true;
      } else {
        throw error;
      }
    }
  }

  let journalPending = 0;

  let matchedFingerprints = 0;

  if (!memoryStoreCorrupt && malformedKeys.length === 0) {
    for (const batch of read.batches) {
      for (const candidate of batch.candidates) {
        if (storeFingerprints.has(candidate.fingerprint)) {
          matchedFingerprints += 1;
        } else {
          journalPending += 1;
        }
      }
    }
  }

  const state: RecoveryState = memoryStoreCorrupt
    ? 'corrupt-memorystore'
    : classify({
        walPendingSessions,

        journalBatches,

        journalPending,

        malformedKeys,

        storeCount,

        matchedFingerprints,
      });

  return {
    project: project.name,

    state,

    walSessions: sources.length,

    walPendingSessions,

    walPendingBytes,

    journalBatches,

    journalPending,

    memoriesBefore: storeCount,

    malformedJournalKeys: malformedKeys,

    sourcePriority: [...SOURCE_PRIORITY],
  };
}

/* ------------------------------------------------------------------ */
/* Recovery (mutating)                                                 */
/* ------------------------------------------------------------------ */

async function learnPendingWal(
  project: ProjectManifest,
  storage: StorageProvider,
  sources: SourceDescriptor[]
): Promise<number> {
  let learned = 0;

  for (const source of sources) {
    if (source.pendingBytes <= 0) {
      continue;
    }
    const identity = createSessionIdentity(project, source.agent, source.nativeSessionId);

    const wal = new SessionWal({ ...identity, localDirectory: source.directory });

    /*
     * Separate the WAL repair/read boundary from journal/storage work so a
     * corrupt WAL is never confused with an unavailable storage provider.
     */
    try {
      wal.loadState();
    } catch {
      throw new RecoveryError('RECOVERY_WAL_CORRUPT', `${source.agent}:${source.nativeSessionId}`);
    }

    try {
      const learner = new SessionMemoryLearner({ project, storage, identity, wal });

      const result = await learner.learnNew({ includeDerivedProjections: false });

      learned += result.journalWritten ? 1 : 0;
    } catch {
      throw new RecoveryError('RECOVERY_STORAGE_UNAVAILABLE');
    }
  }

  return learned;
}

export async function recoverSessionMemory(
  options: RecoverSessionMemoryOptions
): Promise<RecoveryReport> {
  const { project, storage } = options;

  const dryRun = options.dryRun === true;

  const inspection = await inspectRecovery(project, storage);

  if (inspection.state === 'corrupt-journal') {
    throw new RecoveryError('RECOVERY_JOURNAL_CORRUPT', inspection.malformedJournalKeys[0]);
  }

  if (inspection.state === 'corrupt-memorystore') {
    throw new RecoveryError('RECOVERY_MEMORYSTORE_CORRUPT');
  }

  if (dryRun) {
    return {
      project: project.name,

      detectedState: inspection.state,

      dryRun: true,

      walPendingSessions: inspection.walPendingSessions,

      walPendingBytes: inspection.walPendingBytes,

      journalBatchesBefore: inspection.journalBatches,

      journalPendingBefore: inspection.journalPending,

      journalBatchesAdded: 0,

      memoriesBefore: inspection.memoriesBefore,

      memoriesAdded: 0,

      duplicates: 0,

      finalStatus: 'dry-run',
    };
  }

  const sources = sourceDescriptors(project);

  const learned = await learnPendingWal(project, storage, sources);

  const materializer = new SessionMemoryMaterializer(storage);

  const materialization = await materializer.materialize(project);

  if (materialization.status === 'failed') {
    throw new RecoveryError(
      materialization.errorCode === 'memory-store-read-failed'
        ? 'RECOVERY_MEMORYSTORE_CORRUPT'
        : 'RECOVERY_STORAGE_UNAVAILABLE',
      materialization.errorCode
    );
  }

  const after = await loadMemories(project, storage);

  const journalAfter = await readSessionMemoryBatchesStrict(project, storage);

  const wrote = materialization.added > 0 || materialization.evidenceUpdated > 0;

  const recovered = wrote || learned > 0;

  const journalBatchesAdded = Math.max(0, journalAfter.batches.length - inspection.journalBatches);

  return {
    project: project.name,

    detectedState: inspection.state,

    dryRun: false,

    walPendingSessions: inspection.walPendingSessions,

    walPendingBytes: inspection.walPendingBytes,

    journalBatchesBefore: inspection.journalBatches,

    journalPendingBefore: inspection.journalPending,

    journalBatchesAdded,

    memoriesBefore: inspection.memoriesBefore,

    memoriesAdded: Math.max(0, after.count - inspection.memoriesBefore),

    duplicates: materialization.duplicates,

    finalStatus: recovered ? 'recovered' : 'already-current',
  };
}
