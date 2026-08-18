import type { ProjectManifest } from '../core/types.js';

import {
  retrieveMemoryContext,
  type MemoryFactKind,
  type RankedMemoryFact,
} from './memory-retrieval.js';

export interface RetrievedLocalMemoryAnswer {
  intent: string;

  answer: string;

  source: 'checkpoint' | 'handoff' | 'session-origin' | 'work-state' | 'none';
}

const LABELS: Record<MemoryFactKind, string> = {
  previous_agent: 'Agent trước',

  request: 'Yêu cầu hiện tại',

  activity: 'Đang làm',

  goal: 'Mục tiêu',

  phase: 'Phase',

  task: 'Task hiện tại',

  file: 'File hiện tại',

  todo: 'TODO',

  next_action: 'Tiếp theo',

  blocker: 'Blocker',

  decision: 'Quyết định',

  rule: 'Quy tắc',

  architecture: 'Kiến trúc',

  fix: 'Đã sửa',

  completed: 'Đã hoàn thành',

  test: 'Test',

  progress: 'Tiến độ',
};

const SUMMARY_ORDER: MemoryFactKind[] = [
  'previous_agent',
  'request',
  'activity',
  'phase',
  'task',
  'file',
  'todo',
  'next_action',
  'blocker',
  'decision',
  'rule',
  'architecture',
  'fix',
  'completed',
  'test',
  'progress',
  'goal',
];

const INTENT_ORDER: Record<string, MemoryFactKind[]> = {
  previous_agent: ['previous_agent'],

  current_task: ['request', 'activity', 'task', 'file', 'next_action'],

  next_action: ['next_action', 'task', 'file', 'todo'],

  last_file: ['file', 'task', 'next_action'],

  blocker: ['blocker'],

  decision: ['decision'],

  completed: ['completed'],

  status: ['progress', 'task', 'next_action', 'blocker'],

  summary: SUMMARY_ORDER,
};

function isExplicitTodoQuestion(question: string): boolean {
  const value = question.normalize('NFKC').toLowerCase().replace(/\s+/gu, ' ').trim();

  return (
    /(?:^|\s)(?:todo|to-do)(?:\s|$)/u.test(value) ||
    /(?:việc|task)\s+(?:còn lại|chưa làm|chưa xong|chưa hoàn thành)/u.test(value)
  );
}

function selectCanonicalFacts(facts: RankedMemoryFact[]): RankedMemoryFact[] {
  /*
   * M2 canonical handoff is authoritative continuity state.
   *
   * If it exists, stale session-origin/work-state facts must
   * never override or pollute the deterministic local answer.
   */
  const handoff = facts.filter((fact) => fact.source === 'handoff');

  if (handoff.length === 0) {
    return facts;
  }

  /*
   * Handoff remains authoritative for current work.
   * Stable rules/architecture/fixes from the durable
   * checkpoint are additive project knowledge.
   */
  const durable = facts.filter(
    (fact) => fact.source === 'checkpoint' && ['rule', 'architecture', 'fix'].includes(fact.kind)
  );

  return [...handoff, ...durable];
}

function uniqueFacts(facts: RankedMemoryFact[]): RankedMemoryFact[] {
  const seen = new Set<string>();

  const output: RankedMemoryFact[] = [];

  for (const fact of facts) {
    const key = `${fact.kind}:${fact.value
      .normalize('NFKC')
      .toLowerCase()
      .replace(/\s+/gu, ' ')
      .trim()}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    output.push(fact);
  }

  return output;
}

function limitForKind(kind: MemoryFactKind): number {
  switch (kind) {
    case 'todo':
    case 'blocker':
    case 'decision':
    case 'completed':
      return 3;

    default:
      return 1;
  }
}

function formatFactsForKinds(facts: RankedMemoryFact[], order: MemoryFactKind[]): string {
  const lines: string[] = [];

  for (const kind of order) {
    const selected = facts.filter((fact) => fact.kind === kind).slice(0, limitForKind(kind));

    for (const fact of selected) {
      lines.push(`${LABELS[kind]}: ${fact.value}`);
    }
  }

  return lines.join('\n');
}

function formatFacts(facts: RankedMemoryFact[], intent: string): string {
  const order = INTENT_ORDER[intent] ?? SUMMARY_ORDER;

  const lines: string[] = [];

  for (const kind of order) {
    const selected = facts.filter((fact) => fact.kind === kind).slice(0, limitForKind(kind));

    for (const fact of selected) {
      lines.push(`${LABELS[kind]}: ${fact.value}`);
    }
  }

  /*
   * "TODO còn lại?" may currently classify as summary.
   * Summary intentionally includes TODO facts.
   */
  return lines.join('\n');
}

export function answerRetrievedMemoryQuestion(
  project: ProjectManifest,
  question: string
): RetrievedLocalMemoryAnswer {
  const retrieval = retrieveMemoryContext(project, question, {
    maxFacts: 32,

    maxChars: 6400,
  });

  const facts = uniqueFacts(selectCanonicalFacts(retrieval.facts));

  const answer = isExplicitTodoQuestion(question)
    ? formatFactsForKinds(facts, ['todo', 'task', 'next_action', 'file'])
    : formatFacts(facts, String(retrieval.intent));

  if (!answer) {
    return {
      intent: String(retrieval.intent),

      answer: 'ToolNet chưa có đủ memory cho câu hỏi này.',

      source: 'none',
    };
  }

  return {
    intent: String(retrieval.intent),

    answer,

    source: facts[0]?.source ?? 'none',
  };
}
