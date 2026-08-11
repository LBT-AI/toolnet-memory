import { existsSync, mkdirSync, readFileSync } from 'node:fs';

import { homedir } from 'node:os';

import { dirname, join } from 'node:path';

import type { ProjectManifest } from '../core/types.js';

import type { StorageProvider } from '../storage/types.js';

import { writeJsonAtomic } from '../session/utils.js';

import { getStartupBriefForInjection } from './brief-cache.js';

import { memoryAgentStartupGuidance } from './agent-guidance.js';

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

  const cache = await getStartupBriefForInjection(options.project, options.storage, 900);

  if (!cache?.text) {
    return {};
  }

  mkdirSync(dirname(markerPath), {
    recursive: true,
  });

  writeJsonAtomic(markerPath, {
    digest: cache.digest,

    injectedAt: new Date(now).toISOString(),
  });

  return {
    injectSteps: [
      {
        userMessage: `${cache.text}\n\n${memoryAgentStartupGuidance()}`,
      },
    ],
  };
}

export async function buildCodexSessionStartOutput(options: {
  project: ProjectManifest;

  storage: StorageProvider;
}): Promise<Record<string, unknown>> {
  const cache = await getStartupBriefForInjection(options.project, options.storage, 900);

  if (!cache?.text) {
    return {};
  }

  return {
    hookSpecificOutput: {
      hookEventName: 'SessionStart',

      additionalContext: cache.text,
    },
  };
}
