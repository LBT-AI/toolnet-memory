import { existsSync, readFileSync } from 'node:fs';

import { join } from 'node:path';

import type { ProjectManifest } from '../core/types.js';

import { readFastHandoff, writeFastHandoff } from './fast-handoff.js';

export interface HandoffRefreshResult {
  updated: boolean;

  reason: 'updated' | 'unchanged' | 'missing-current' | 'empty-current';

  chars: number;
}

function readLocalCurrent(project: ProjectManifest): string | null {
  const file = join(project.rootPath, '.toolnet', 'current.md');

  if (!existsSync(file)) {
    return null;
  }

  try {
    return readFileSync(file, 'utf8').trim();
  } catch {
    return null;
  }
}

function compactCurrentForHandoff(project: ProjectManifest, current: string): string {
  const normalized = current.replace(/\r\n/g, '\n').trim();

  /*
   * handoff.md is intentionally compact.
   *
   * It is NOT a transcript and NOT a session dump.
   * current.md already contains curated project work state.
   */
  const maxChars = 2400;

  const body =
    normalized.length > maxChars
      ? `${normalized.slice(0, maxChars)}\n\n[Current work truncated for fast handoff]`
      : normalized;

  return [
    '# ToolNet Fast Handoff',
    '',
    `Project: ${project.name}`,
    '',
    body,
    '',
    '---',
    '',
    'Continuation rule:',
    '- Continue unfinished work; do not redo completed steps.',
    '- Query ToolNet Memory only when deeper history is needed.',
  ].join('\n');
}

export function refreshFastHandoffFromCurrent(project: ProjectManifest): HandoffRefreshResult {
  const current = readLocalCurrent(project);

  if (current === null) {
    return {
      updated: false,
      reason: 'missing-current',
      chars: 0,
    };
  }

  if (!current.trim()) {
    return {
      updated: false,
      reason: 'empty-current',
      chars: 0,
    };
  }

  const next = compactCurrentForHandoff(project, current);

  const existing = readFastHandoff(project);

  if (existing?.text.trim() === next.trim()) {
    return {
      updated: false,
      reason: 'unchanged',
      chars: next.length,
    };
  }

  writeFastHandoff(project, next);

  return {
    updated: true,
    reason: 'updated',
    chars: next.length,
  };
}
