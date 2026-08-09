import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

import { dirname, join } from 'node:path';

import type { ProjectManifest } from '../core/types.js';

import type { StorageProvider } from '../storage/types.js';

import { sha256, writeJsonAtomic } from '../session/utils.js';

import { buildStartupBrief } from './brief.js';

import { estimateTokens, truncateByTokens } from './token-budget.js';

export interface StartupBriefCache {
  version: 1;

  projectId: string;

  projectName: string;

  text: string;

  digest: string;

  estimatedTokens: number;

  generatedAt: string;
}

export function startupBriefFile(project: ProjectManifest): string {
  return join(project.rootPath, '.toolnet', 'context', 'startup.md');
}

function startupMetaFile(project: ProjectManifest): string {
  return join(project.rootPath, '.toolnet', 'context', 'startup.json');
}

function persistLocal(
  project: ProjectManifest,

  cache: StartupBriefCache
) {
  const file = startupBriefFile(project);

  mkdirSync(dirname(file), {
    recursive: true,
  });

  writeFileSync(file, cache.text.endsWith('\n') ? cache.text : cache.text + '\n', {
    encoding: 'utf8',

    mode: 0o600,
  });

  writeJsonAtomic(startupMetaFile(project), cache);
}

export async function refreshStartupBriefCache(
  project: ProjectManifest,

  storage: StorageProvider,

  maxTokens = 800
): Promise<StartupBriefCache> {
  const brief = await buildStartupBrief({
    project,
    storage,
    maxTokens,
  });

  // Enforce token budget with truncation
  let text = brief.text;
  const tokens = estimateTokens(text);

  if (tokens > maxTokens) {
    text = truncateByTokens(text, maxTokens);
    text += '\n\n[Context trimmed by ToolNet Memory token budget]\n';
  }

  const cache: StartupBriefCache = {
    version: 1,

    projectId: project.id,

    projectName: project.name,

    text,

    digest: sha256(text),

    estimatedTokens: estimateTokens(text),

    generatedAt: new Date().toISOString(),
  };

  persistLocal(project, cache);

  await storage.put(
    `projects/${project.id}/context/startup.md`,
    cache.text + '\n',
    'text/markdown'
  );

  await storage.put(
    `projects/${project.id}/context/startup.json`,
    JSON.stringify(cache, null, 2) + '\n',
    'application/json'
  );

  return cache;
}

/*
 * Startup injection always prefers remote.
 *
 * Reason:
 * OpenCode may have worked on VPS A,
 * then Agy/Codex may start immediately on VPS B.
 *
 * One small remote GET at session start is much safer than
 * trusting a potentially stale local cache.
 */
export async function getStartupBriefForInjection(
  project: ProjectManifest,

  storage: StorageProvider,

  maxTokens = 900
): Promise<StartupBriefCache | null> {
  try {
    const remote = await storage.getText(`projects/${project.id}/context/startup.md`);

    if (remote && remote.trim()) {
      const text = remote.trim();

      const cache: StartupBriefCache = {
        version: 1,

        projectId: project.id,

        projectName: project.name,

        text,

        digest: sha256(text),

        estimatedTokens: Math.ceil(text.length / 3.5),

        generatedAt: new Date().toISOString(),
      };

      persistLocal(project, cache);

      return cache;
    }
  } catch {
    // Network unavailable -> local fallback.
  }

  const local = startupBriefFile(project);

  if (existsSync(local)) {
    try {
      const text = readFileSync(local, 'utf8').trim();

      if (text) {
        return {
          version: 1,

          projectId: project.id,

          projectName: project.name,

          text,

          digest: sha256(text),

          estimatedTokens: Math.ceil(text.length / 3.5),

          generatedAt: new Date().toISOString(),
        };
      }
    } catch {
      // Fall through.
    }
  }

  try {
    return await refreshStartupBriefCache(project, storage, maxTokens);
  } catch {
    return null;
  }
}
