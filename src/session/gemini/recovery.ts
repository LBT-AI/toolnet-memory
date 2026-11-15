import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';

import { basename, join } from 'node:path';

import type { ProjectManifest } from '../../core/types.js';

import type { StorageProvider } from '../../storage/types.js';

import { syncGeminiSession, type GeminiSyncResult } from './adapter.js';

import { geminiTranscriptsRoot } from './config-paths.js';

const MAX_SCAN_DEPTH = 4;

function projectOfTranscript(path: string): string | undefined {
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as {
      cwd?: unknown;
      projectPath?: unknown;
      workspaceDirectory?: unknown;
    };

    for (const value of [parsed.projectPath, parsed.workspaceDirectory, parsed.cwd]) {
      if (typeof value === 'string' && value) {
        return value;
      }
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function collectTranscripts(root: string, depth = 0): string[] {
  if (depth > MAX_SCAN_DEPTH || !existsSync(root)) {
    return [];
  }

  const result: string[] = [];

  let entries: string[];

  try {
    entries = readdirSync(root);
  } catch {
    return [];
  }

  for (const entry of entries) {
    const path = join(root, entry);

    let isDirectory = false;

    try {
      isDirectory = statSync(path).isDirectory();
    } catch {
      continue;
    }

    if (isDirectory) {
      result.push(...collectTranscripts(path, depth + 1));
      continue;
    }

    if (entry.endsWith('.json') && entry.startsWith('session-')) {
      result.push(path);
    }
  }

  return result;
}

/**
 * Recover Gemini sessions whose transcript records an explicit project path
 * matching this project. Transcripts without project evidence are skipped:
 * recovery never guesses which project a conversation belongs to.
 */
export async function recoverGeminiProject(
  project: ProjectManifest,
  storage: StorageProvider,
  limit = 20
): Promise<GeminiSyncResult[]> {
  const root = process.env.TOOLNET_GEMINI_TRANSCRIPTS_DIR ?? geminiTranscriptsRoot();

  const candidates = collectTranscripts(root)
    .map((path) => ({ path, projectPath: projectOfTranscript(path) }))
    .filter((item) => item.projectPath === project.rootPath)
    .slice(0, limit);

  const results: GeminiSyncResult[] = [];

  for (const candidate of candidates) {
    const parsed = JSON.parse(readFileSync(candidate.path, 'utf8')) as { sessionId?: unknown };

    const sessionId =
      typeof parsed.sessionId === 'string' && parsed.sessionId
        ? parsed.sessionId
        : basename(candidate.path, '.json');

    results.push(
      await syncGeminiSession({
        project,
        storage,
        sessionId,
        cwd: project.rootPath,
        transcriptPath: candidate.path,
        hookEvent: 'SessionEnd',
      })
    );
  }

  return results;
}
