import { existsSync, mkdirSync } from 'node:fs';

import { join } from 'node:path';

import type { ProjectManifest } from '../core/types.js';

import type { StorageProvider } from '../storage/types.js';

import type { SessionIdentity } from '../session/types.js';

import { sha256, writeJsonAtomic } from '../session/utils.js';

import { loadProjectManual } from '../project-manual/manager.js';

import { loadWorkState, reconcileWorkState } from './reducer.js';

import { loadLocalWorkState } from './local-work-state.js';

import type { WorkItem, WorkState } from './types.js';

import { buildHandoffStateV2, type HandoffStateV2 } from './handoff-state.js';

export interface SmartHandoff {
  version: 1;

  id: string;

  projectId: string;
  projectName: string;

  createdAt: string;

  reason: string;

  sourceSession: {
    agent: SessionIdentity['agent'];

    nativeSessionId: string;

    sessionKey: string;

    sequence: number;
  };

  currentRequest?: string;

  currentActivity?: string;

  goal?: string;

  plan?: string;

  progress: WorkState['progress'];

  currentPhase?: WorkItem;

  currentTask?: WorkItem;

  incompletePhases: WorkItem[];

  incompleteTasks: WorkItem[];

  nextActions: string[];

  blockers: string[];

  decisions: string[];

  warnings: string[];

  attention: string[];

  filesTouched: string[];

  activeFiles?: string[];

  modifiedFiles?: string[];

  createdFiles?: string[];

  deletedFiles?: string[];

  tests: string[];

  checks?: WorkState['checks'];

  stateDigest: string;

  /**
   * Canonical compact cross-agent continuation state.
   *
   * Legacy top-level fields remain for backwards compatibility.
   */
  continuity: HandoffStateV2;
}

function substantiveState(state: WorkState) {
  return {
    goal: state.goal,

    plan: state.plan,

    phases: state.phases.map((item) => ({
      id: item.id,

      title: item.title,

      status: item.status,

      order: item.order,
    })),

    tasks: state.tasks.map((item) => ({
      id: item.id,

      title: item.title,

      status: item.status,

      order: item.order,
    })),

    decisions: state.decisions,

    blockers: state.blockers,

    warnings: state.warnings,

    nextActions: state.nextActions,

    filesTouched: state.filesTouched,

    tests: state.tests,
  };
}

function hasSubstantiveState(state: WorkState): boolean {
  return Boolean(
    state.currentRequest ||
    state.currentActivity ||
    state.goal ||
    state.plan ||
    state.phases.length > 0 ||
    state.tasks.length > 0 ||
    state.nextActions.length > 0 ||
    state.blockers.length > 0 ||
    state.decisions.length > 0 ||
    state.filesTouched.length > 0
  );
}

function buildSmartHandoff(
  project: ProjectManifest,
  identity: SessionIdentity,
  state: WorkState,
  reason: string,
  sequence: number
): SmartHandoff | null {
  if (!hasSubstantiveState(state)) {
    return null;
  }

  const manual = loadProjectManual(project, false);

  const enforceRules = manual
    ? manual.rules.filter((rule) => rule.mode === 'enforce').map((rule) => rule.text)
    : [];

  const attention = [...enforceRules, ...state.warnings].slice(0, 20);

  const continuity = buildHandoffStateV2({
    project,

    identity,

    state,

    reason,

    sequence,

    attention,
  });

  const stateDigest = continuity.stateDigest;

  const id = sha256([project.id, identity.sessionKey, stateDigest].join('|')).slice(0, 24);

  return {
    version: 1,

    id,

    projectId: project.id,

    projectName: project.name,

    createdAt: new Date().toISOString(),

    reason,

    sourceSession: {
      agent: identity.agent,

      nativeSessionId: identity.nativeSessionId,

      sessionKey: identity.sessionKey,

      sequence,
    },

    currentRequest: state.currentRequest,

    currentActivity: state.currentActivity,

    goal: state.goal,

    plan: state.plan,

    progress: state.progress,

    currentPhase: state.currentPhase,

    currentTask: state.currentTask,

    incompletePhases: state.phases.filter(
      (item) => item.status !== 'completed' && item.status !== 'cancelled'
    ),

    incompleteTasks: state.tasks.filter(
      (item) => item.status !== 'completed' && item.status !== 'cancelled'
    ),

    nextActions: continuity.remaining.todos.slice(0, 10),

    blockers: state.blockers.slice(-10),

    decisions: state.decisions.slice(-10),

    warnings: state.warnings.slice(-10),

    attention,

    filesTouched: state.filesTouched.slice(-20),

    activeFiles: state.activeFiles?.slice(-10),

    modifiedFiles: state.modifiedFiles?.slice(-20),

    createdFiles: state.createdFiles?.slice(-20),

    deletedFiles: state.deletedFiles?.slice(-20),

    tests: state.tests.slice(-15),

    checks: state.checks?.slice(-10),

    stateDigest,

    continuity,
  };
}

function persistLocalHandoff(project: ProjectManifest, handoff: SmartHandoff): void {
  const localDirectory = join(
    project.rootPath,

    '.toolnet',
    'work',
    'handoffs'
  );

  mkdirSync(localDirectory, {
    recursive: true,
  });

  const historical = join(localDirectory, `${handoff.id}.json`);

  /*
   * Same logical state must never produce
   * duplicate historical handoffs.
   */
  if (!existsSync(historical)) {
    writeJsonAtomic(historical, handoff);
  }

  writeJsonAtomic(
    join(
      project.rootPath,

      '.toolnet',
      'work',
      'handoff-latest.json'
    ),
    handoff
  );
}

export function captureLocalSmartHandoff(options: {
  project: ProjectManifest;

  identity: SessionIdentity;

  state: WorkState;

  reason: string;

  sequence: number;
}): SmartHandoff | null {
  const handoff = buildSmartHandoff(
    options.project,
    options.identity,
    options.state,
    options.reason,
    options.sequence
  );

  if (!handoff) {
    return null;
  }

  persistLocalHandoff(options.project, handoff);

  return handoff;
}

export class SmartHandoffManager {
  constructor(
    private readonly options: {
      project: ProjectManifest;

      storage: StorageProvider;

      identity: SessionIdentity;
    }
  ) {}

  async capture(
    reason: string,

    sequence: number
  ): Promise<SmartHandoff | null> {
    /*
     * Prefer current crash-safe LOCAL state.
     *
     * Remote work/current.json may legitimately lag behind
     * while Hugging Face/S3 is slow or temporarily offline.
     */
    let state = loadLocalWorkState(this.options.project);

    if (!state) {
      state = await loadWorkState(
        this.options.project,

        this.options.storage
      );
    }

    if (!state) {
      state = await reconcileWorkState(
        this.options.project,

        this.options.storage
      );
    }

    const handoff = buildSmartHandoff(
      this.options.project,
      this.options.identity,
      state,
      reason,
      sequence
    );

    if (!handoff) {
      return null;
    }

    /*
     * Local pointer first.
     *
     * If remote dies immediately after this line,
     * next local agent still has the handoff.
     */
    persistLocalHandoff(this.options.project, handoff);

    const remoteKey = `projects/${this.options.project.id}/work/handoffs/${handoff.id}.json`;

    if (!(await this.options.storage.exists(remoteKey))) {
      await this.options.storage.put(
        remoteKey,

        JSON.stringify(handoff, null, 2) + '\n',

        'application/json'
      );
    }

    await this.options.storage.put(
      `projects/${this.options.project.id}/work/handoff-latest.json`,

      JSON.stringify(handoff, null, 2) + '\n',

      'application/json'
    );

    return handoff;
  }
}

export async function loadLatestHandoff(
  project: ProjectManifest,

  storage: StorageProvider
): Promise<SmartHandoff | null> {
  const text = await storage.getText(`projects/${project.id}/work/handoff-latest.json`);

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as SmartHandoff;
  } catch {
    return null;
  }
}
