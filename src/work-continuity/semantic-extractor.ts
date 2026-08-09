import type { NormalizedSessionEvent, SessionIdentity } from '../session/types.js';

import { sha256 } from '../session/utils.js';

import type { SemanticFieldKind, SemanticObservation } from './semantic-types.js';

const TEXT_KEYS = new Set([
  'content',
  'text',
  'message',
  'prompt',
  'summary',
  'description',
  'title',
  'reason',
  'last_assistant_message',
  'lastAssistantMessage',
]);

type Scope = {
  type: 'project' | 'phase' | 'task';

  key?: string;

  order?: number;

  title?: string;
};

type ListMode = 'acceptance_criterion' | 'dependency' | 'open_question' | 'constraint' | null;

function normalize(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .replace(/^[\s>*#•-]+/u, '')
    .trim();
}

function collectStrings(
  value: unknown,

  output: string[],

  depth = 0
): void {
  if (depth > 6) {
    return;
  }

  if (typeof value === 'string') {
    output.push(value);

    return;
  }

  if (Array.isArray(value)) {
    for (const item of value.slice(0, 50)) {
      collectStrings(item, output, depth + 1);
    }

    return;
  }

  if (!value || typeof value !== 'object') {
    return;
  }

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (TEXT_KEYS.has(key) || ['data', 'payload', 'parts', 'messages'].includes(key)) {
      collectStrings(child, output, depth + 1);
    }
  }
}

function observation(
  identity: SessionIdentity,

  event: NormalizedSessionEvent,

  kind: SemanticFieldKind,

  value: string,

  scope: Scope,

  confidence = 0.95
): SemanticObservation {
  const clean = normalize(value);

  const id = sha256(
    [identity.projectId, kind, scope.type, scope.key ?? '', clean.toLowerCase(), event.id].join('|')
  ).slice(0, 32);

  return {
    version: 1,

    id,

    projectId: identity.projectId,

    kind,

    value: clean,

    scope: scope.type,

    scopeKey: scope.key,

    scopeOrder: scope.order,

    confidence,

    evidence: {
      agent: identity.agent,

      nativeSessionId: identity.nativeSessionId,

      sessionKey: identity.sessionKey,

      eventId: event.id,

      sourceEventId: event.sourceEventId,

      sequence: event.sequence,

      occurredAt: event.timestamp,
    },
  };
}

function fieldValue(
  line: string,

  labels: string[]
): string | null {
  const lower = line.toLowerCase();

  for (const label of labels) {
    const normalizedLabel = label.toLowerCase();

    if (
      lower.startsWith(`${normalizedLabel}:`) ||
      lower.startsWith(`${normalizedLabel} -`) ||
      lower.startsWith(`${normalizedLabel} —`)
    ) {
      return normalize(line.slice(label.length + 1));
    }
  }

  return null;
}

function isBullet(raw: string): boolean {
  const line = raw.trimStart();

  return line.startsWith('- ') || line.startsWith('* ') || /^\d+[.)]\s+/u.test(line);
}

function bulletValue(raw: string): string {
  return normalize(
    raw
      .trim()
      .replace(/^[-*]\s+/u, '')
      .replace(/^\d+[.)]\s+/u, '')
  );
}

export function extractSemanticObservations(
  identity: SessionIdentity,

  events: NormalizedSessionEvent[]
): SemanticObservation[] {
  const output: SemanticObservation[] = [];

  const seen = new Set<string>();

  function push(item: SemanticObservation) {
    if (!item.value || item.value.length < 3 || seen.has(item.id)) {
      return;
    }

    seen.add(item.id);

    output.push(item);
  }

  for (const event of events) {
    const blocks: string[] = [];

    collectStrings(event.data, blocks);

    for (const block of blocks) {
      let scope: Scope = {
        type: 'project',
      };

      let listMode: ListMode = null;

      for (const raw of block.split(/\r?\n/u)) {
        const line = normalize(raw);

        if (!line) {
          listMode = null;

          continue;
        }

        const phase = line.match(
          /^(?:phase|giai đoạn|giai doan|stage)\s*(\d+)\s*(?:[:\-–—]\s*)?(.*)$/iu
        );

        if (phase) {
          const order = Number(phase[1]);

          scope = {
            type: 'phase',

            key: `phase:${order}`,

            order,

            title: normalize(phase[2] ?? ''),
          };

          listMode = null;

          continue;
        }

        const task = line.match(/^(?:todo|task|việc)\s*(\d+)\s*(?:[:\-–—]\s*)?(.*)$/iu);

        if (task) {
          const order = Number(task[1]);

          scope = {
            type: 'task',

            key: `task:${order}`,

            order,

            title: normalize(task[2] ?? ''),
          };

          listMode = null;

          continue;
        }

        const mission = fieldValue(line, [
          'mission',
          'sứ mệnh',
          'mục tiêu tổng thể',
          'mục tiêu project',
          'project goal',
        ]);

        if (mission) {
          push(
            observation(
              identity,
              event,
              'mission',
              mission,
              {
                type: 'project',
              },
              0.99
            )
          );

          listMode = null;

          continue;
        }

        const activeObjective = fieldValue(line, [
          'current objective',
          'active objective',
          'mục tiêu hiện tại',
          'objective',
          'mục tiêu',
          'mục đích',
        ]);

        if (activeObjective) {
          push(
            observation(
              identity,
              event,
              scope.type === 'phase' ? 'phase_objective' : 'objective',

              activeObjective,
              scope,
              0.98
            )
          );

          listMode = null;

          continue;
        }

        const why = fieldValue(line, [
          'why',
          'why this',
          'why this phase',
          'reason',
          'rationale',
          'vì sao',
          'lý do',
          'tại sao',
          'ý nghĩa',
        ]);

        if (why) {
          push(
            observation(
              identity,
              event,
              scope.type === 'phase' ? 'phase_why' : 'why',

              why,
              scope,
              0.98
            )
          );

          listMode = null;

          continue;
        }

        const outcome = fieldValue(line, [
          'desired outcome',
          'final outcome',
          'kết quả cuối',
          'kết quả mong muốn',
          'mục tiêu cuối',
        ]);

        if (outcome) {
          push(
            observation(
              identity,
              event,
              'desired_outcome',
              outcome,
              {
                type: 'project',
              },
              0.98
            )
          );

          listMode = null;

          continue;
        }

        const planRationale = fieldValue(line, [
          'plan rationale',
          'approach rationale',
          'why this approach',
          'tại sao chọn hướng này',
          'lý do chọn hướng này',
          'lý do chọn kiến trúc',
        ]);

        if (planRationale) {
          push(
            observation(
              identity,
              event,
              'plan_rationale',
              planRationale,
              {
                type: 'project',
              },
              0.98
            )
          );

          listMode = null;

          continue;
        }

        const deliverable = fieldValue(line, [
          'deliverable',
          'output',
          'kết quả cần đạt',
          'phải tạo ra',
          'đầu ra',
        ]);

        if (deliverable) {
          push(observation(identity, event, 'phase_deliverable', deliverable, scope, 0.97));

          listMode = null;

          continue;
        }

        const acceptance = fieldValue(line, [
          'acceptance criteria',
          'definition of done',
          'done khi',
          'hoàn thành khi',
          'tiêu chí hoàn thành',
        ]);

        if (acceptance) {
          push(observation(identity, event, 'acceptance_criterion', acceptance, scope, 0.98));

          listMode = 'acceptance_criterion';

          continue;
        }

        const dependency = fieldValue(line, [
          'depends on',
          'dependency',
          'dependencies',
          'phụ thuộc',
          'cần có trước',
        ]);

        if (dependency) {
          push(observation(identity, event, 'dependency', dependency, scope, 0.97));

          listMode = 'dependency';

          continue;
        }

        const openQuestion = fieldValue(line, [
          'open question',
          'open questions',
          'câu hỏi mở',
          'chưa quyết định',
          'chưa rõ',
        ]);

        if (openQuestion) {
          push(observation(identity, event, 'open_question', openQuestion, scope, 0.95));

          listMode = 'open_question';

          continue;
        }

        const constraint = fieldValue(line, ['constraint', 'constraints', 'ràng buộc', 'giới hạn']);

        if (constraint) {
          push(observation(identity, event, 'constraint', constraint, scope, 0.97));

          listMode = 'constraint';

          continue;
        }

        if (
          /^(?:acceptance criteria|definition of done|done khi|tiêu chí hoàn thành)\s*:?\s*$/iu.test(
            line
          )
        ) {
          listMode = 'acceptance_criterion';

          continue;
        }

        if (/^(?:dependencies|dependency|phụ thuộc)\s*:?\s*$/iu.test(line)) {
          listMode = 'dependency';

          continue;
        }

        if (/^(?:open questions|open question|câu hỏi mở)\s*:?\s*$/iu.test(line)) {
          listMode = 'open_question';

          continue;
        }

        if (/^(?:constraints|constraint|ràng buộc)\s*:?\s*$/iu.test(line)) {
          listMode = 'constraint';

          continue;
        }

        if (listMode && isBullet(raw)) {
          push(observation(identity, event, listMode, bulletValue(raw), scope, 0.96));

          continue;
        }

        /*
         * No implicit "why" inference here.
         *
         * If the previous session never recorded WHY,
         * ToolNet deliberately leaves it unknown.
         */
        listMode = null;
      }
    }
  }

  return output;
}
