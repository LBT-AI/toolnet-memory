import { existsSync, mkdirSync, readFileSync } from 'node:fs';

import { homedir } from 'node:os';

import { dirname, join } from 'node:path';

import type { ProjectManifest } from '../core/types.js';

import type { StorageProvider } from '../storage/types.js';

import { sha256, writeJsonAtomic } from '../session/utils.js';

import { getStartupBriefForInjection } from './brief-cache.js';

import { memoryAgentStartupGuidance } from './agent-guidance.js';

import { buildCompactContextOffloadGraph } from '../memory/context-offload.js';

import { loadWorkState } from './reducer.js';

import type { WorkState } from './types.js';

interface InjectionMarker {
  digest: string;

  injectedAt: string;
}

function markerFile(
  project: ProjectManifest,

  conversationId: string,

  overrideDirectory?: string
) {
  const base =
    overrideDirectory ?? join(homedir(), '.config', 'toolnet-memory', 'injections', 'agy');

  return join(base, `${project.id}-${conversationId}.json`);
}

function loadMarker(file: string): InjectionMarker | null {
  if (!existsSync(file)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(file, 'utf8')) as InjectionMarker;
  } catch {
    return null;
  }
}

function compactValue(value: string | undefined, maxChars = 280): string {
  const clean = (value ?? '').replace(/\s+/g, ' ').trim();

  if (clean.length <= maxChars) {
    return clean;
  }

  return clean.slice(0, Math.max(0, maxChars - 1)).trimEnd() + '…';
}

function loadLocalWorkState(project: ProjectManifest): WorkState | null {
  const file = join(project.rootPath, '.toolnet', 'work', 'current.json');

  if (!existsSync(file)) {
    return null;
  }

  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as WorkState;

    if (parsed.version === 1 && parsed.projectId === project.id) {
      return parsed;
    }
  } catch {
    // Optional local fast-path.
  }

  return null;
}

function renderCompactAgyHandoff(project: ProjectManifest, state: WorkState): string {
  const completed = state.tasks
    .filter((item) => item.status === 'completed')
    .slice(-3)
    .map((item) => compactValue(item.title, 220));

  const todo = Array.from(
    new Set(
      [
        ...(state.currentTask ? [state.currentTask.title] : []),

        ...state.tasks
          .filter(
            (item) =>
              item.status === 'in_progress' ||
              item.status === 'blocked' ||
              item.status === 'pending'
          )
          .slice(0, 4)
          .map((item) => item.title),
      ]
        .map((item) => compactValue(item, 220))
        .filter(Boolean)
    )
  );

  const currentFile = state.filesTouched.at(-1);

  const lines = ['[TOOLNET CONTINUITY HANDOFF]', `Project: ${project.name}`];

  if (state.currentTask?.title) {
    lines.push(`Task: ${compactValue(state.currentTask.title)}`);
  } else if (state.currentPhase?.title) {
    lines.push(`Task: ${compactValue(state.currentPhase.title)}`);
  } else if (state.goal) {
    lines.push(`Task: ${compactValue(state.goal)}`);
  }

  if (completed.length) {
    lines.push(`Completed: ${completed.join('; ')}`);
  }

  if (currentFile) {
    lines.push(`Current file: ${compactValue(currentFile, 260)}`);
  }

  if (todo.length) {
    lines.push(`TODO: ${todo.join('; ')}`);
  }

  if (state.nextActions.length) {
    lines.push(`Next action: ${compactValue(state.nextActions[0])}`);
  }

  if (state.blockers.length) {
    lines.push(`Blocker: ${compactValue(state.blockers[0])}`);
  }

  lines.push(
    '',
    'CONTINUATION CONTRACT:',
    '- Continue from this compact handoff; do not reconstruct the prior session.',
    '- NEVER inspect .toolnet/sessions/** (legacy) or .toolnet/runtime/sources/**, state.json, events.jsonl, or raw transcripts.',
    '- If this handoff is insufficient, invoke memory_agent_ask directly.',
    '- Do not search for memory_agent_ask implementation/schema.',
    '- Inspect git/source only to validate current code after continuity is resolved.'
  );

  return lines.join('\n');
}

export async function buildAgyContinuityContext(options: {
  project: ProjectManifest;

  storage: StorageProvider;
}): Promise<string> {
  /*
   * Same-machine fast path.
   * No network required when current work state is already local.
   */
  let state = loadLocalWorkState(options.project);

  /*
   * Cross-machine/VPS fallback.
   * Read compact canonical work state, never raw session history.
   */
  if (!state) {
    try {
      state = await loadWorkState(options.project, options.storage);
    } catch {
      state = null;
    }
  }

  let continuity = state ? renderCompactAgyHandoff(options.project, state) : '';

  /*
   * Older projects may only have Startup Brief.
   */
  if (!continuity) {
    try {
      const cache = await getStartupBriefForInjection(options.project, options.storage, 700);

      continuity = cache?.text ?? '';
    } catch {
      continuity = '';
    }
  }

  /*
   * Guidance is injected even if no saved handoff exists.
   * This prevents the agent from falling back to session replay.
   */
  const offloadGraph = buildCompactContextOffloadGraph(options.project.rootPath, {
    maxAssets: 6,
    maxChars: 900,
  });

  return [continuity, offloadGraph, memoryAgentStartupGuidance()]
    .filter(Boolean)
    .join('\n\n')
    .trim();
}

export async function buildAgyPreInvocationOutput(options: {
  project: ProjectManifest;

  storage: StorageProvider;

  conversationId: string;

  invocationNum?: number;

  markerDirectory?: string;

  now?: number;

  resumeAfterMs?: number;
}): Promise<Record<string, unknown>> {
  const now = options.now ?? Date.now();

  const resumeAfterMs = options.resumeAfterMs ?? 6 * 60 * 60 * 1000;

  const markerPath = markerFile(options.project, options.conversationId, options.markerDirectory);

  const marker = loadMarker(markerPath);

  const markerTime = marker ? Date.parse(marker.injectedAt) : 0;

  const age = markerTime ? now - markerTime : Number.POSITIVE_INFINITY;

  /*
   * Avoid duplicate injection on immediate retry.
   */
  if (marker && age < 60_000) {
    return {};
  }

  const firstInvocation = options.invocationNum === 0;

  const resumedAfterPause = age >= resumeAfterMs;

  if (marker && !firstInvocation && !resumedAfterPause) {
    return {};
  }

  const context = await buildAgyContinuityContext({
    project: options.project,

    storage: options.storage,
  });

  if (!context) {
    return {};
  }

  mkdirSync(dirname(markerPath), {
    recursive: true,
  });

  writeJsonAtomic(markerPath, {
    digest: sha256(context),

    injectedAt: new Date(now).toISOString(),
  });

  return {
    injectSteps: [
      {
        ephemeralMessage: context,
      },
    ],
  };
}

export async function buildCodexSessionStartOutput(options: {
  project: ProjectManifest;

  storage: StorageProvider;
}): Promise<Record<string, unknown>> {
  const cache = await getStartupBriefForInjection(options.project, options.storage, 900);

  const offloadGraph = buildCompactContextOffloadGraph(options.project.rootPath, {
    maxAssets: 6,
    maxChars: 900,
  });

  const context = [cache?.text ?? '', offloadGraph].filter(Boolean).join('\n\n').trim();

  if (!context) {
    return {};
  }

  return {
    hookSpecificOutput: {
      hookEventName: 'SessionStart',

      additionalContext: context,
    },
  };
}
