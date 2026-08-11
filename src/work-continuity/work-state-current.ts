import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import { join } from 'node:path';

import type { ProjectManifest } from '../core/types.js';

import type { WorkItem, WorkState } from './types.js';

const BEGIN = '<!-- TOOLNET:STABLE-WORK:BEGIN -->';

const END = '<!-- TOOLNET:STABLE-WORK:END -->';

function status(item: WorkItem): string {
  switch (item.status) {
    case 'completed':
      return '[x]';

    case 'in_progress':
      return '[~]';

    case 'blocked':
      return '[!]';

    case 'cancelled':
      return '[-]';

    default:
      return '[ ]';
  }
}

function section(title: string, values: string[]): string[] {
  if (!values.length) {
    return [];
  }

  return ['', `${title}:`, ...values.map((value) => `- ${value}`)];
}

function renderItems(title: string, items: WorkItem[]): string[] {
  if (!items.length) {
    return [];
  }

  return ['', `${title}:`, ...items.map((item) => `- ${status(item)} ${item.title}`)];
}

export function renderStableWorkState(state: WorkState): string {
  const lines: string[] = [BEGIN, '# ToolNet Stable Work State', '', `Updated: ${state.updatedAt}`];

  if (state.lastSession) {
    lines.push(
      `Last agent: ${state.lastSession.agent}`,
      `Last session: ${state.lastSession.nativeSessionId}`
    );
  }

  if (state.goal) {
    lines.push('', 'Goal:', state.goal);
  }

  if (state.plan) {
    lines.push('', 'Plan:', state.plan);
  }

  if (state.currentPhase) {
    lines.push('', 'Current phase:', `${status(state.currentPhase)} ${state.currentPhase.title}`);
  }

  if (state.currentTask) {
    lines.push('', 'Current task:', `${status(state.currentTask)} ${state.currentTask.title}`);
  }

  lines.push(...renderItems('Phases', state.phases));

  lines.push(...renderItems('TODO / Tasks', state.tasks));

  lines.push(...section('Next actions', state.nextActions));

  lines.push(...section('Blockers', state.blockers));

  lines.push(...section('Important decisions', state.decisions));

  lines.push(...section('Files touched', state.filesTouched));

  lines.push(
    '',
    'Progress:',
    `- Phases: ${state.progress.phasesCompleted}/${state.progress.phasesTotal}`,
    `- Tasks: ${state.progress.tasksCompleted}/${state.progress.tasksTotal}`,
    `- Blocked: ${state.progress.blocked}`,
    '',
    'Continuation:',
    '- Resume current unfinished task.',
    '- Never redo completed TODO/Phase unless explicitly requested.',
    '- Ask ToolNet Memory for deeper history only when necessary.',
    END
  );

  return lines.join('\n');
}

export function writeStableWorkStateToCurrent(project: ProjectManifest, state: WorkState): void {
  const file = join(project.rootPath, '.toolnet', 'current.md');

  let existing = '';

  if (existsSync(file)) {
    try {
      existing = readFileSync(file, 'utf8');
    } catch {
      existing = '';
    }
  }

  /*
   * Remove C3.2 temporary auto-current block.
   * C3.3 stable state supersedes it.
   */
  existing = existing.replace(
    /<!-- TOOLNET:AUTO-CURRENT:BEGIN -->[\s\S]*?<!-- TOOLNET:AUTO-CURRENT:END -->/gu,
    ''
  );

  const rendered = renderStableWorkState(state);

  const start = existing.indexOf(BEGIN);

  const end = existing.indexOf(END);

  let next: string;

  if (start >= 0 && end >= start) {
    next = [
      existing.slice(0, start).trimEnd(),

      rendered,

      existing.slice(end + END.length).trimStart(),
    ]
      .filter(Boolean)
      .join('\n\n');
  } else {
    next = existing.trim() ? `${existing.trim()}\n\n${rendered}` : rendered;
  }

  writeFileSync(file, `${next.trim()}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });
}
