import { existsSync, readFileSync } from 'node:fs';

import { join } from 'node:path';

import type { ProjectManifest } from '../core/types.js';

import type { HandoffStateV2 } from './handoff-state.js';

import { detectMemoryQueryIntent, type MemoryQueryIntent } from './memory-query.js';

import { loadLocalWorkState } from './local-work-state.js';

import { readSessionOrigin } from './session-origin.js';

import { readLatestDurableCheckpoint } from '../session/durable-checkpoint.js';

export type MemoryFactKind =
  | 'previous_agent'
  | 'request'
  | 'activity'
  | 'goal'
  | 'phase'
  | 'task'
  | 'file'
  | 'next_action'
  | 'blocker'
  | 'decision'
  | 'rule'
  | 'architecture'
  | 'fix'
  | 'completed'
  | 'todo'
  | 'test'
  | 'progress';

export type MemoryFactSource = 'checkpoint' | 'handoff' | 'session-origin' | 'work-state';

export interface RankedMemoryFact {
  kind: MemoryFactKind;

  value: string;

  source: MemoryFactSource;

  score: number;
}

export interface MemoryRetrievalResult {
  intent: MemoryQueryIntent;

  facts: RankedMemoryFact[];

  context: {
    project: {
      id: string;

      name: string;
    };

    intent: MemoryQueryIntent;

    selectedFacts: Array<{
      kind: MemoryFactKind;

      value: string;

      source: MemoryFactSource;
    }>;
  };

  stats: {
    candidates: number;

    selected: number;

    chars: number;
  };
}

interface LocalHandoffFile {
  continuity?: HandoffStateV2;
}

const INTENT_WEIGHT: Record<MemoryQueryIntent, Partial<Record<MemoryFactKind, number>>> = {
  previous_agent: {
    previous_agent: 100,
    task: 35,
    phase: 25,
  },

  current_task: {
    task: 100,
    request: 95,
    activity: 90,
    phase: 75,
    file: 65,
    next_action: 55,
    blocker: 45,
  },

  next_action: {
    next_action: 100,
    todo: 80,
    task: 65,
    blocker: 60,
    file: 40,
  },

  last_file: {
    file: 100,
    task: 65,
    next_action: 40,
  },

  blocker: {
    blocker: 100,
    task: 60,
    next_action: 50,
    file: 35,
  },

  decision: {
    decision: 100,
    rule: 85,
    architecture: 80,
    task: 45,
    file: 30,
  },

  completed: {
    completed: 100,
    progress: 70,
    task: 30,
  },

  status: {
    progress: 100,
    task: 85,
    phase: 75,
    blocker: 65,
    next_action: 60,
  },

  summary: {
    task: 100,
    request: 98,
    activity: 96,
    next_action: 95,
    file: 90,
    blocker: 85,
    previous_agent: 80,
    phase: 75,
    completed: 60,
    todo: 60,
    decision: 55,
    rule: 54,
    architecture: 53,
    fix: 52,
    progress: 50,
    test: 45,
    goal: 35,
  },
};

const SOURCE_WEIGHT: Record<MemoryFactSource, number> = {
  checkpoint: 20,

  handoff: 18,

  'session-origin': 14,

  'work-state': 8,
};

function normalize(value: string): string {
  return value.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
}

function addFact(output: RankedMemoryFact[], fact: Omit<RankedMemoryFact, 'score'>): void {
  const value = fact.value.replace(/\s+/g, ' ').trim();

  if (!value) {
    return;
  }

  output.push({
    ...fact,

    value,

    score: 0,
  });
}

function readLocalHandoff(project: ProjectManifest): HandoffStateV2 | null {
  const file = join(project.rootPath, '.toolnet', 'work', 'handoff-latest.json');

  if (!existsSync(file)) {
    return null;
  }

  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as LocalHandoffFile;

    const continuity = parsed.continuity;

    if (continuity?.schema !== 'toolnet.handoff.v2' || continuity.project.id !== project.id) {
      return null;
    }

    return continuity;
  } catch {
    return null;
  }
}

function checkpointFacts(project: ProjectManifest): RankedMemoryFact[] {
  const checkpoint = readLatestDurableCheckpoint(project);

  if (!checkpoint) {
    return [];
  }

  const facts: RankedMemoryFact[] = [];

  if (checkpoint.request) {
    addFact(facts, {
      kind: 'request',

      value: checkpoint.request,

      source: 'checkpoint',
    });
  }

  if (checkpoint.activity) {
    addFact(facts, {
      kind: 'activity',

      value: checkpoint.activity,

      source: 'checkpoint',
    });
  }

  if (checkpoint.current.phase) {
    addFact(facts, {
      kind: 'phase',

      value: checkpoint.current.phase.title,

      source: 'checkpoint',
    });
  }

  if (checkpoint.current.task) {
    addFact(facts, {
      kind: 'task',

      value: checkpoint.current.task.title,

      source: 'checkpoint',
    });
  }

  const currentFile = checkpoint.files.active.at(-1);

  if (currentFile) {
    addFact(facts, {
      kind: 'file',

      value: currentFile,

      source: 'checkpoint',
    });
  }

  for (const action of checkpoint.nextActions) {
    addFact(facts, {
      kind: 'next_action',

      value: action,

      source: 'checkpoint',
    });
  }

  for (const blocker of checkpoint.blockers) {
    addFact(facts, {
      kind: 'blocker',

      value: blocker,

      source: 'checkpoint',
    });
  }

  for (const item of checkpoint.completed.tasks) {
    addFact(facts, {
      kind: 'completed',

      value: item,

      source: 'checkpoint',
    });
  }

  for (const item of checkpoint.remaining.tasks) {
    addFact(facts, {
      kind: 'todo',

      value: item,

      source: 'checkpoint',
    });
  }

  for (const fact of checkpoint.durableFacts) {
    addFact(facts, {
      kind: fact.kind,

      value: fact.content,

      source: 'checkpoint',
    });
  }

  return facts;
}

function handoffFacts(project: ProjectManifest): RankedMemoryFact[] {
  const handoff = readLocalHandoff(project);

  if (!handoff) {
    return [];
  }

  const facts: RankedMemoryFact[] = [];

  addFact(facts, {
    kind: 'previous_agent',

    value: handoff.source.agent,

    source: 'handoff',
  });

  if (handoff.request) {
    addFact(facts, {
      kind: 'request',

      value: handoff.request,

      source: 'handoff',
    });
  }

  if (handoff.activity) {
    addFact(facts, {
      kind: 'activity',

      value: handoff.activity,

      source: 'handoff',
    });
  }

  if (handoff.goal) {
    addFact(facts, {
      kind: 'goal',

      value: handoff.goal,

      source: 'handoff',
    });
  }

  if (handoff.current.phase) {
    addFact(facts, {
      kind: 'phase',

      value: handoff.current.phase.title,

      source: 'handoff',
    });
  }

  if (handoff.current.task) {
    addFact(facts, {
      kind: 'task',

      value: handoff.current.task.title,

      source: 'handoff',
    });
  }

  if (handoff.files.current) {
    addFact(facts, {
      kind: 'file',

      value: handoff.files.current,

      source: 'handoff',
    });
  }

  if (handoff.nextAction) {
    addFact(facts, {
      kind: 'next_action',

      value: handoff.nextAction,

      source: 'handoff',
    });
  }

  for (const blocker of handoff.blockers) {
    addFact(facts, {
      kind: 'blocker',

      value: blocker,

      source: 'handoff',
    });
  }

  for (const decision of handoff.decisions) {
    addFact(facts, {
      kind: 'decision',

      value: decision,

      source: 'handoff',
    });
  }

  for (const task of handoff.completed.tasks) {
    addFact(facts, {
      kind: 'completed',

      value: task,

      source: 'handoff',
    });
  }

  for (const todo of handoff.remaining.todos) {
    addFact(facts, {
      kind: 'todo',

      value: todo,

      source: 'handoff',
    });
  }

  addFact(facts, {
    kind: 'test',

    value: `Test status: ${handoff.tests.status}`,

    source: 'handoff',
  });

  addFact(facts, {
    kind: 'progress',

    value: `${handoff.progress.tasksCompleted}/${handoff.progress.tasksTotal} tasks completed; ${handoff.progress.blocked} blocked`,

    source: 'handoff',
  });

  return facts;
}

function originFacts(project: ProjectManifest): RankedMemoryFact[] {
  const origin = readSessionOrigin(project);

  if (!origin) {
    return [];
  }

  const facts: RankedMemoryFact[] = [];

  addFact(facts, {
    kind: 'previous_agent',

    value: origin.agent,

    source: 'session-origin',
  });

  if (origin.currentPhase) {
    addFact(facts, {
      kind: 'phase',

      value: origin.currentPhase,

      source: 'session-origin',
    });
  }

  if (origin.currentTask) {
    addFact(facts, {
      kind: 'task',

      value: origin.currentTask,

      source: 'session-origin',
    });
  }

  if (origin.lastTouchedFile) {
    addFact(facts, {
      kind: 'file',

      value: origin.lastTouchedFile,

      source: 'session-origin',
    });
  }

  if (origin.latestNextAction) {
    addFact(facts, {
      kind: 'next_action',

      value: origin.latestNextAction,

      source: 'session-origin',
    });
  }

  if (origin.latestBlocker) {
    addFact(facts, {
      kind: 'blocker',

      value: origin.latestBlocker,

      source: 'session-origin',
    });
  }

  if (origin.latestDecision) {
    addFact(facts, {
      kind: 'decision',

      value: origin.latestDecision,

      source: 'session-origin',
    });
  }

  return facts;
}

function stateFacts(project: ProjectManifest): RankedMemoryFact[] {
  const state = loadLocalWorkState(project);

  if (!state) {
    return [];
  }

  const facts: RankedMemoryFact[] = [];

  if (state.currentRequest) {
    addFact(facts, {
      kind: 'request',

      value: state.currentRequest,

      source: 'work-state',
    });
  }

  if (state.currentActivity) {
    addFact(facts, {
      kind: 'activity',

      value: state.currentActivity,

      source: 'work-state',
    });
  }

  if (state.goal) {
    addFact(facts, {
      kind: 'goal',

      value: state.goal,

      source: 'work-state',
    });
  }

  if (state.currentPhase) {
    addFact(facts, {
      kind: 'phase',

      value: state.currentPhase.title,

      source: 'work-state',
    });
  }

  if (state.currentTask) {
    addFact(facts, {
      kind: 'task',

      value: state.currentTask.title,

      source: 'work-state',
    });
  }

  const latestFile = state.activeFiles?.at(-1) ?? state.filesTouched.at(-1);

  if (latestFile) {
    addFact(facts, {
      kind: 'file',

      value: latestFile,

      source: 'work-state',
    });
  }

  for (const action of state.nextActions.slice(0, 5)) {
    addFact(facts, {
      kind: 'next_action',

      value: action,

      source: 'work-state',
    });
  }

  for (const blocker of state.blockers.slice(-5)) {
    addFact(facts, {
      kind: 'blocker',

      value: blocker,

      source: 'work-state',
    });
  }

  for (const decision of state.decisions.slice(-5)) {
    addFact(facts, {
      kind: 'decision',

      value: decision,

      source: 'work-state',
    });
  }

  for (const task of state.tasks.filter((item) => item.status === 'completed').slice(-8)) {
    addFact(facts, {
      kind: 'completed',

      value: task.title,

      source: 'work-state',
    });
  }

  for (const task of state.tasks
    .filter((item) => item.status !== 'completed' && item.status !== 'cancelled')
    .slice(0, 8)) {
    addFact(facts, {
      kind: 'todo',

      value: task.title,

      source: 'work-state',
    });
  }

  for (const test of state.tests.slice(-5)) {
    addFact(facts, {
      kind: 'test',

      value: test,

      source: 'work-state',
    });
  }

  addFact(facts, {
    kind: 'progress',

    value: `${state.progress.tasksCompleted}/${state.progress.tasksTotal} tasks completed; ${state.progress.blocked} blocked`,

    source: 'work-state',
  });

  return facts;
}

function scoreFacts(intent: MemoryQueryIntent, facts: RankedMemoryFact[]): RankedMemoryFact[] {
  const weights = INTENT_WEIGHT[intent];

  return facts.map((fact, index) => ({
    ...fact,

    score: (weights[fact.kind] ?? 10) + SOURCE_WEIGHT[fact.source] + Math.max(0, 5 - index * 0.01),
  }));
}

function dedupeFacts(facts: RankedMemoryFact[]): RankedMemoryFact[] {
  const seen = new Map<string, RankedMemoryFact>();

  for (const fact of facts) {
    const key = `${fact.kind}:${normalize(fact.value)}`;

    const existing = seen.get(key);

    if (!existing || fact.score > existing.score) {
      seen.set(key, fact);
    }
  }

  return [...seen.values()];
}

export function retrieveMemoryContext(
  project: ProjectManifest,
  question: string,
  options: {
    maxFacts?: number;

    maxChars?: number;
  } = {}
): MemoryRetrievalResult {
  const intent = detectMemoryQueryIntent(question);

  const candidates = [
    ...checkpointFacts(project),
    ...handoffFacts(project),
    ...originFacts(project),
    ...stateFacts(project),
  ];

  const ranked = dedupeFacts(scoreFacts(intent, candidates)).sort(
    (left, right) => right.score - left.score
  );

  const maxFacts = Math.max(1, options.maxFacts ?? 12);

  const maxChars = Math.max(300, options.maxChars ?? 3200);

  const selected: RankedMemoryFact[] = [];

  let chars = 0;

  for (const fact of ranked) {
    if (selected.length >= maxFacts) {
      break;
    }

    const cost = fact.kind.length + fact.value.length + fact.source.length + 16;

    if (selected.length > 0 && chars + cost > maxChars) {
      continue;
    }

    selected.push(fact);

    chars += cost;
  }

  return {
    intent,

    facts: selected,

    context: {
      project: {
        id: project.id,

        name: project.name,
      },

      intent,

      selectedFacts: selected.map((fact) => ({
        kind: fact.kind,

        value: fact.value,

        source: fact.source,
      })),
    },

    stats: {
      candidates: candidates.length,

      selected: selected.length,

      chars,
    },
  };
}
