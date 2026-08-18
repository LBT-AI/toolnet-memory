import { existsSync, mkdirSync, readFileSync } from 'node:fs';

import { join } from 'node:path';

import type { ProjectManifest } from '../core/types.js';

import { runMemoryPipelineV2, type MemoryKnowledgeClass } from '../memory/pipeline-v2.js';

import type { NormalizedSessionEvent, SessionAgent, SessionIdentity } from './types.js';

import { sha256, writeJsonAtomic } from './utils.js';

import type { WorkCheck, WorkItem, WorkState } from '../work-continuity/types.js';

export type DurableCheckpointFactKind = 'rule' | 'architecture' | 'decision' | 'fix';

export interface DurableCheckpointFact {
  fingerprint: string;

  kind: DurableCheckpointFactKind;

  content: string;

  knowledgeClass: MemoryKnowledgeClass;

  importanceScore: number;

  confidence: number;

  createdAt: string;

  agent: SessionAgent;

  nativeSessionId: string;
}

export interface DurableMemoryCheckpoint {
  schema: 'toolnet.memory.checkpoint.v1';

  version: 1;

  project: {
    id: string;

    name: string;
  };

  source: {
    agent: SessionAgent;

    nativeSessionId: string;

    sessionKey: string;

    sequence: number;
  };

  capturedAt: string;

  request?: string;

  activity?: string;

  goal?: string;

  current: {
    phase?: WorkItem;

    task?: WorkItem;
  };

  completed: {
    phases: string[];

    tasks: string[];
  };

  remaining: {
    phases: string[];

    tasks: string[];
  };

  files: {
    active: string[];

    modified: string[];

    created: string[];

    deleted: string[];
  };

  checks: WorkCheck[];

  blockers: string[];

  decisions: string[];

  nextActions: string[];

  durableFacts: DurableCheckpointFact[];

  stateDigest: string;
}

function directory(project: ProjectManifest): string {
  return join(project.rootPath, '.toolnet', 'memory', 'checkpoints');
}

export function durableCheckpointLatestFile(project: ProjectManifest): string {
  return join(directory(project), 'latest.json');
}

function readPrevious(project: ProjectManifest): DurableMemoryCheckpoint | null {
  const file = durableCheckpointLatestFile(project);

  if (!existsSync(file)) {
    return null;
  }

  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as DurableMemoryCheckpoint;

    if (parsed.schema !== 'toolnet.memory.checkpoint.v1' || parsed.project.id !== project.id) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function durableKind(value: string): value is DurableCheckpointFactKind {
  return ['rule', 'architecture', 'decision', 'fix'].includes(value);
}

function selectedFacts(
  identity: SessionIdentity,
  events: NormalizedSessionEvent[]
): DurableCheckpointFact[] {
  if (events.length === 0) {
    return [];
  }

  const pipeline = runMemoryPipelineV2(identity, events);

  return pipeline.candidates
    .filter(
      (candidate) =>
        durableKind(candidate.kind) &&
        candidate.knowledgeClass !== 'transient' &&
        candidate.importanceScore >= 0.65
    )
    .map((candidate) => ({
      fingerprint: candidate.fingerprint,

      kind: candidate.kind as DurableCheckpointFactKind,

      content: candidate.content,

      knowledgeClass: candidate.knowledgeClass,

      importanceScore: candidate.importanceScore,

      confidence: candidate.confidence,

      createdAt: candidate.createdAt,

      agent: identity.agent,

      nativeSessionId: identity.nativeSessionId,
    }));
}

function mergeFacts(
  previous: DurableCheckpointFact[],
  incoming: DurableCheckpointFact[]
): DurableCheckpointFact[] {
  const byFingerprint = new Map<string, DurableCheckpointFact>();

  for (const fact of [...previous, ...incoming]) {
    const existing = byFingerprint.get(fact.fingerprint);

    if (!existing || fact.importanceScore > existing.importanceScore) {
      byFingerprint.set(fact.fingerprint, fact);
    }
  }

  return Array.from(byFingerprint.values())
    .sort(
      (left, right) =>
        right.importanceScore - left.importanceScore ||
        right.createdAt.localeCompare(left.createdAt)
    )
    .slice(0, 80);
}

function compactState(state: WorkState) {
  return {
    request: state.currentRequest,

    activity: state.currentActivity,

    goal: state.goal,

    phase: state.currentPhase
      ? {
          title: state.currentPhase.title,

          status: state.currentPhase.status,
        }
      : undefined,

    task: state.currentTask
      ? {
          title: state.currentTask.title,

          status: state.currentTask.status,
        }
      : undefined,

    phases: state.phases.map((item) => ({
      title: item.title,

      status: item.status,
    })),

    tasks: state.tasks.map((item) => ({
      title: item.title,

      status: item.status,
    })),

    activeFiles: state.activeFiles ?? [],

    modifiedFiles: state.modifiedFiles ?? [],

    createdFiles: state.createdFiles ?? [],

    deletedFiles: state.deletedFiles ?? [],

    checks: state.checks ?? [],

    blockers: state.blockers,

    decisions: state.decisions,

    nextActions: state.nextActions,
  };
}

export function writeDurableMemoryCheckpoint(
  project: ProjectManifest,
  identity: SessionIdentity,
  events: NormalizedSessionEvent[],
  state: WorkState
): DurableMemoryCheckpoint {
  const previous = readPrevious(project);

  const facts = mergeFacts(previous?.durableFacts ?? [], selectedFacts(identity, events));

  const sequence = events.at(-1)?.sequence ?? previous?.source.sequence ?? 0;

  const completedPhases = state.phases
    .filter((item) => item.status === 'completed')
    .map((item) => item.title);

  const completedTasks = state.tasks
    .filter((item) => item.status === 'completed')
    .map((item) => item.title);

  const remainingPhases = state.phases
    .filter((item) => item.status !== 'completed' && item.status !== 'cancelled')
    .map((item) => item.title);

  const remainingTasks = state.tasks
    .filter((item) => item.status !== 'completed' && item.status !== 'cancelled')
    .map((item) => item.title);

  const digestPayload = {
    work: compactState(state),

    durableFacts: facts.map((fact) => fact.fingerprint).sort(),
  };

  const stateDigest = sha256(JSON.stringify(digestPayload)).slice(0, 32);

  const checkpoint: DurableMemoryCheckpoint = {
    schema: 'toolnet.memory.checkpoint.v1',

    version: 1,

    project: {
      id: project.id,

      name: project.name,
    },

    source: {
      agent: identity.agent,

      nativeSessionId: identity.nativeSessionId,

      sessionKey: identity.sessionKey,

      sequence,
    },

    capturedAt: new Date().toISOString(),

    request: state.currentRequest,

    activity: state.currentActivity,

    goal: state.goal,

    current: {
      phase: state.currentPhase,

      task: state.currentTask,
    },

    completed: {
      phases: completedPhases,

      tasks: completedTasks,
    },

    remaining: {
      phases: remainingPhases,

      tasks: remainingTasks,
    },

    files: {
      active: state.activeFiles ?? [],

      modified: state.modifiedFiles ?? [],

      created: state.createdFiles ?? [],

      deleted: state.deletedFiles ?? [],
    },

    checks: state.checks ?? [],

    blockers: state.blockers.slice(-10),

    decisions: state.decisions.slice(-15),

    nextActions: state.nextActions.slice(0, 10),

    durableFacts: facts,

    stateDigest,
  };

  const root = directory(project);

  mkdirSync(root, {
    recursive: true,

    mode: 0o700,
  });

  /*
   * Historical checkpoints are immutable.
   * Same state => same digest => no duplicate file.
   */
  const historical = join(root, `${stateDigest}.json`);

  if (!existsSync(historical)) {
    writeJsonAtomic(historical, checkpoint);
  }

  /*
   * Mutable fast pointer used on next startup.
   */
  writeJsonAtomic(durableCheckpointLatestFile(project), checkpoint);

  return checkpoint;
}

export function readLatestDurableCheckpoint(
  project: ProjectManifest
): DurableMemoryCheckpoint | null {
  return readPrevious(project);
}
