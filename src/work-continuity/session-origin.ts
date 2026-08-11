import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';

import { dirname, join } from 'node:path';

import type { ProjectManifest } from '../core/types.js';

import type { WorkObservation, WorkState } from './types.js';

export interface SessionOrigin {
  version: 1;

  projectId: string;

  agent: string;

  nativeSessionId: string;

  updatedAt: string;

  currentTask?: string;

  currentPhase?: string;

  lastTouchedFile?: string;

  latestNextAction?: string;

  latestBlocker?: string;

  latestDecision?: string;
}

export function sessionOriginFile(project: ProjectManifest): string {
  return join(project.rootPath, '.toolnet', 'context', 'session-origin.json');
}

function atomicWriteJson(file: string, value: unknown): void {
  mkdirSync(dirname(file), {
    recursive: true,
  });

  const temp = `${file}.tmp-${process.pid}-${Date.now()}`;

  writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });

  renameSync(temp, file);
}

function latest(
  observations: WorkObservation[],
  kind: WorkObservation['kind']
): WorkObservation | undefined {
  return [...observations]
    .filter((item) => item.kind === kind)
    .sort((left, right) => {
      const time = left.occurredAt.localeCompare(right.occurredAt);

      if (time !== 0) {
        return time;
      }

      return left.sequence - right.sequence;
    })
    .at(-1);
}

export function writeSessionOrigin(
  project: ProjectManifest,
  options: {
    agent: string;

    nativeSessionId: string;

    observations: WorkObservation[];

    workState: WorkState;
  }
): SessionOrigin {
  const file = latest(options.observations, 'file');

  const next = latest(options.observations, 'next_action');

  const blocker = latest(options.observations, 'blocker');

  const decision = latest(options.observations, 'decision');

  const origin: SessionOrigin = {
    version: 1,

    projectId: project.id,

    agent: options.agent,

    nativeSessionId: options.nativeSessionId,

    updatedAt: options.workState.updatedAt,

    currentTask: options.workState.currentTask?.title,

    currentPhase: options.workState.currentPhase?.title,

    lastTouchedFile: file?.text ?? options.workState.filesTouched.at(-1),

    latestNextAction: next?.text ?? options.workState.nextActions.at(-1),

    latestBlocker: blocker?.text ?? options.workState.blockers.at(-1),

    latestDecision: decision?.text ?? options.workState.decisions.at(-1),
  };

  atomicWriteJson(sessionOriginFile(project), origin);

  return origin;
}

export function readSessionOrigin(project: ProjectManifest): SessionOrigin | null {
  const file = sessionOriginFile(project);

  if (!existsSync(file)) {
    return null;
  }

  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as SessionOrigin;

    if (parsed.version !== 1 || parsed.projectId !== project.id) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function formatSessionOrigin(project: ProjectManifest): string | null {
  const origin = readSessionOrigin(project);

  if (!origin) {
    return null;
  }

  const lines = [
    'Previous session:',
    `- Agent: ${origin.agent}`,
    `- Session: ${origin.nativeSessionId}`,
  ];

  if (origin.currentPhase) {
    lines.push(`- Current phase: ${origin.currentPhase}`);
  }

  if (origin.currentTask) {
    lines.push(`- Current task: ${origin.currentTask}`);
  }

  if (origin.lastTouchedFile) {
    lines.push(`- Last touched file: ${origin.lastTouchedFile}`);
  }

  if (origin.latestBlocker) {
    lines.push(`- Blocker: ${origin.latestBlocker}`);
  }

  if (origin.latestNextAction) {
    lines.push(`- Next action: ${origin.latestNextAction}`);
  }

  if (origin.latestDecision) {
    lines.push(`- Important decision: ${origin.latestDecision}`);
  }

  return lines.join('\n');
}
