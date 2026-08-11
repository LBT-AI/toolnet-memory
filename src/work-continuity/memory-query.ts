import { existsSync, readFileSync } from 'node:fs';

import { join } from 'node:path';

import type { ProjectManifest } from '../core/types.js';

import { loadLocalWorkState } from './local-work-state.js';

import { readSessionOrigin } from './session-origin.js';

export type MemoryQueryIntent =
  | 'status'
  | 'previous_agent'
  | 'current_task'
  | 'next_action'
  | 'last_file'
  | 'blocker'
  | 'decision'
  | 'completed'
  | 'summary';

export interface MemoryQueryResult {
  intent: MemoryQueryIntent;

  answer: string;

  source: 'session-origin' | 'work-state' | 'handoff' | 'none';
}

function normalize(value: string): string {
  return value.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function detectMemoryQueryIntent(question: string): MemoryQueryIntent {
  const q = normalize(question);

  /*
   * Composite continuity questions need a summary.
   *
   * Example:
   * "agent trước đang làm gì và dừng ở đâu?"
   *
   * must return:
   * agent + task + file + next action
   *
   * instead of stopping at "previous_agent".
   */
  const asksPreviousAgent = /(?:agent trước|previous agent|ai trước|phiên trước)/u.test(q);

  const asksWorkPosition =
    /(?:đang làm gì|làm tới đâu|dừng ở đâu|dở ở đâu|stopped where|working on|current task|file nào|last touched|làm gì tiếp|next action|next step)/u.test(
      q
    );

  if (asksPreviousAgent && asksWorkPosition) {
    return 'summary';
  }

  if (/(?:agent trước là ai|previous agent|ai trước là ai|phiên trước là ai)/u.test(q)) {
    return 'previous_agent';
  }

  if (
    /(?:task hiện tại|current task|đang làm gì|đang làm task nào|dở ở đâu|dừng ở đâu|stopped where)/u.test(
      q
    )
  ) {
    return 'current_task';
  }

  if (/(?:tiếp theo|next action|next step|làm gì tiếp|phải làm gì tiếp)/u.test(q)) {
    return 'next_action';
  }

  if (/(?:file cuối|last file|file nào|đang sửa file|last touched)/u.test(q)) {
    return 'last_file';
  }

  if (/(?:blocker|vướng|kẹt|lỗi gì|blocked)/u.test(q)) {
    return 'blocker';
  }

  if (/(?:decision|quyết định|đã chốt|important decision)/u.test(q)) {
    return 'decision';
  }

  if (/(?:đã xong|completed|hoàn thành|done|todo nào xong)/u.test(q)) {
    return 'completed';
  }

  if (/(?:status|trạng thái|tiến độ|progress)/u.test(q)) {
    return 'status';
  }

  return 'summary';
}

function readHandoff(project: ProjectManifest): string | null {
  const file = join(project.rootPath, '.toolnet', 'context', 'handoff.md');

  if (!existsSync(file)) {
    return null;
  }

  try {
    const text = readFileSync(file, 'utf8').trim();

    if (!text) {
      return null;
    }

    return text;
  } catch {
    return null;
  }
}

function compactList(values: string[], limit = 5): string {
  return values
    .slice(0, limit)
    .map((value) => `- ${value}`)
    .join('\n');
}

export function answerMemoryQuestion(
  project: ProjectManifest,
  question: string
): MemoryQueryResult {
  const intent = detectMemoryQueryIntent(question);

  const origin = readSessionOrigin(project);

  const state = loadLocalWorkState(project);

  switch (intent) {
    case 'previous_agent': {
      if (origin) {
        return {
          intent,
          answer: `Agent trước là ${origin.agent}. Session: ${origin.nativeSessionId}.`,
          source: 'session-origin',
        };
      }

      break;
    }

    case 'current_task': {
      if (origin?.currentTask) {
        const parts = [`Task hiện tại: ${origin.currentTask}.`];

        if (origin.lastTouchedFile) {
          parts.push(`File gần nhất: ${origin.lastTouchedFile}.`);
        }

        if (origin.latestNextAction) {
          parts.push(`Tiếp theo: ${origin.latestNextAction}.`);
        }

        return {
          intent,
          answer: parts.join(' '),
          source: 'session-origin',
        };
      }

      if (state?.currentTask) {
        return {
          intent,
          answer: `Task hiện tại: ${state.currentTask.title} (${state.currentTask.status}).`,
          source: 'work-state',
        };
      }

      break;
    }

    case 'next_action': {
      const next = origin?.latestNextAction ?? state?.nextActions?.[0];

      if (next) {
        return {
          intent,
          answer: `Việc nên làm tiếp: ${next}.`,
          source: origin?.latestNextAction ? 'session-origin' : 'work-state',
        };
      }

      break;
    }

    case 'last_file': {
      const file = origin?.lastTouchedFile ?? state?.filesTouched?.at(-1);

      if (file) {
        return {
          intent,
          answer: `File gần nhất được nhắc hoặc sửa: ${file}.`,
          source: origin?.lastTouchedFile ? 'session-origin' : 'work-state',
        };
      }

      break;
    }

    case 'blocker': {
      const blocker = origin?.latestBlocker ?? state?.blockers?.at(-1);

      if (blocker) {
        return {
          intent,
          answer: `Blocker hiện tại: ${blocker}.`,
          source: origin?.latestBlocker ? 'session-origin' : 'work-state',
        };
      }

      return {
        intent,
        answer: 'Hiện ToolNet chưa ghi nhận blocker nào.',
        source: state ? 'work-state' : 'none',
      };
    }

    case 'decision': {
      const decision = origin?.latestDecision ?? state?.decisions?.at(-1);

      if (decision) {
        return {
          intent,
          answer: `Quyết định gần nhất: ${decision}.`,
          source: origin?.latestDecision ? 'session-origin' : 'work-state',
        };
      }

      break;
    }

    case 'completed': {
      const completed =
        state?.tasks?.filter((item) => item.status === 'completed').map((item) => item.title) ?? [];

      if (completed.length) {
        return {
          intent,
          answer: `Các task đã hoàn thành:\n${compactList(completed, 8)}`,
          source: 'work-state',
        };
      }

      break;
    }

    case 'status': {
      if (state) {
        const parts = [
          `Progress: ${state.progress.tasksCompleted}/${state.progress.tasksTotal} task hoàn thành.`,
        ];

        if (state.currentTask) {
          parts.push(`Đang làm: ${state.currentTask.title}.`);
        }

        if (state.progress.blocked > 0) {
          parts.push(`Blocked: ${state.progress.blocked}.`);
        }

        return {
          intent,
          answer: parts.join(' '),
          source: 'work-state',
        };
      }

      break;
    }

    case 'summary': {
      if (origin || state) {
        const lines: string[] = [];

        if (origin) {
          lines.push(`Agent trước: ${origin.agent}.`);
        }

        /*
         * Prefer latest session-origin metadata.
         * WorkState is the fallback.
         */
        const currentTask = origin?.currentTask ?? state?.currentTask?.title;

        if (currentTask) {
          lines.push(`Task hiện tại: ${currentTask}.`);
        }

        const lastFile = origin?.lastTouchedFile ?? state?.filesTouched?.at(-1);

        if (lastFile) {
          lines.push(`File gần nhất: ${lastFile}.`);
        }

        const nextAction = origin?.latestNextAction ?? state?.nextActions?.[0];

        if (nextAction) {
          lines.push(`Tiếp theo: ${nextAction}.`);
        }

        const blocker = origin?.latestBlocker ?? state?.blockers?.at(-1);

        if (blocker) {
          lines.push(`Blocker: ${blocker}.`);
        }

        const decision = origin?.latestDecision ?? state?.decisions?.at(-1);

        if (decision) {
          lines.push(`Quyết định gần nhất: ${decision}.`);
        }

        return {
          intent,

          answer: lines.join(' '),

          source: origin ? 'session-origin' : 'work-state',
        };
      }

      break;
    }
  }

  const handoff = readHandoff(project);

  if (handoff) {
    const compact = handoff.length > 900 ? `${handoff.slice(0, 900)}\n[truncated]` : handoff;

    return {
      intent,
      answer: compact,
      source: 'handoff',
    };
  }

  return {
    intent,
    answer: 'ToolNet chưa có đủ memory cho câu hỏi này.',
    source: 'none',
  };
}
