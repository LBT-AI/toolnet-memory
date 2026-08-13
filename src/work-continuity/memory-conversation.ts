import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';

import { join } from 'node:path';

import type { ProjectManifest } from '../core/types.js';

import { detectMemoryQueryIntent, type MemoryQueryIntent } from './memory-query.js';

import {
  retrieveMemoryContext,
  type MemoryFactKind,
  type MemoryFactSource,
} from './memory-retrieval.js';

export interface MemoryConversationFact {
  kind: MemoryFactKind;

  value: string;

  source: MemoryFactSource;
}

export interface MemoryConversationStateV1 {
  schema: 'toolnet.memory-conversation.v1';

  version: 1;

  projectId: string;

  updatedAt: string;

  lastIntent: MemoryQueryIntent;

  focus: MemoryConversationFact[];
}

export interface PreparedMemoryConversation {
  question: string;

  originalQuestion: string;

  usedPriorFocus: boolean;

  previousIntent?: MemoryQueryIntent;

  currentIntent: MemoryQueryIntent;

  priorFocus: MemoryConversationFact[];

  focusCount: number;
}

const DEFAULT_MAX_AGE_MS = 12 * 60 * 60 * 1000;

function conversationFile(project: ProjectManifest): string {
  return join(project.rootPath, '.toolnet', 'context', 'memory-agent-conversation.json');
}

function normalize(value: string): string {
  return value.normalize('NFKC').toLowerCase().replace(/\s+/gu, ' ').trim();
}

function isExplicitFreshQuery(question: string): boolean {
  const text = normalize(question);

  return [
    /\btiếp tục\b/u,
    /\btiếp tục task\b/u,
    /\blúc nãy\b/u,
    /\btrước đó\b/u,
    /\btask trước\b/u,
    /\bprevious (?:task|session|work)\b/u,
    /\bcontinue\b/u,
    /\bresume\b/u,
    /\bcurrent task\b/u,
    /\bđang làm gì\b/u,
  ].some((pattern) => pattern.test(text));
}

function looksLikeFollowUp(question: string): boolean {
  if (isExplicitFreshQuery(question)) {
    return false;
  }

  const text = normalize(question);

  const words = text.split(/\s+/u).filter(Boolean);

  if (
    [
      /^(?:tại sao|vì sao|sao vậy)\b/u,
      /^(?:why|why so|why that)\b/u,
      /^(?:còn|thế|vậy|rồi sao|sau đó)\b/u,
      /^(?:what about|and what|then what)\b/u,
      /^(?:cái đó|việc đó|nó|phần đó)\b/u,
    ].some((pattern) => pattern.test(text))
  ) {
    return true;
  }

  /*
   * Very short pronoun-style questions are likely
   * conversational follow-ups.
   */
  return words.length <= 5 && /\b(?:nó|đó|vậy|thế|that|it|this)\b/u.test(text);
}

function readConversation(
  project: ProjectManifest,
  now: number,
  maxAgeMs: number
): MemoryConversationStateV1 | null {
  const file = conversationFile(project);

  if (!existsSync(file)) {
    return null;
  }

  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as MemoryConversationStateV1;

    if (
      parsed.schema !== 'toolnet.memory-conversation.v1' ||
      parsed.version !== 1 ||
      parsed.projectId !== project.id ||
      !Array.isArray(parsed.focus)
    ) {
      return null;
    }

    const updatedAt = Date.parse(parsed.updatedAt);

    if (!Number.isFinite(updatedAt) || now - updatedAt > maxAgeMs) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function uniqueFacts(values: MemoryConversationFact[], limit = 8): MemoryConversationFact[] {
  const seen = new Set<string>();

  const result: MemoryConversationFact[] = [];

  for (const fact of values) {
    const value = fact.value.replace(/\s+/gu, ' ').trim();

    if (!value) {
      continue;
    }

    const key = [fact.kind, normalize(value)].join(':');

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    result.push({
      ...fact,

      value,
    });

    if (result.length >= limit) {
      break;
    }
  }

  return result;
}

function writeConversation(project: ProjectManifest, state: MemoryConversationStateV1): void {
  const file = conversationFile(project);

  const directory = join(project.rootPath, '.toolnet', 'context');

  mkdirSync(directory, {
    recursive: true,

    mode: 0o700,
  });

  const temporary = `${file}.${process.pid}.tmp`;

  try {
    writeFileSync(temporary, JSON.stringify(state, null, 2) + '\n', {
      encoding: 'utf8',

      mode: 0o600,
    });

    renameSync(temporary, file);
  } finally {
    rmSync(temporary, {
      force: true,
    });
  }
}

function renderPriorFocus(state: MemoryConversationStateV1): string {
  return state.focus
    .slice(0, 8)
    .map((fact) => `- ${fact.kind}: ${fact.value}`)
    .join('\n');
}

/**
 * Adds conversational continuity to memory_agent_ask
 * without storing or replaying raw conversation history.
 *
 * Persisted state contains only:
 * - last intent
 * - compact selected memory facts
 */
export interface MemoryConversationFollowUpAnswer {
  answer: string;

  intent: MemoryQueryIntent;

  source: 'conversation-focus';
}

function firstConversationFact(
  conversation: PreparedMemoryConversation,
  kind: MemoryFactKind
): string | undefined {
  return conversation.priorFocus.find((fact) => fact.kind === kind)?.value;
}

/**
 * Resolve short ambiguous follow-ups from compact ToolNet
 * memory focus without replaying raw questions or answers.
 *
 * Explicit/direct intents remain handled by memory-query.ts.
 */
export function answerMemoryConversationFollowUp(
  conversation: PreparedMemoryConversation
): MemoryConversationFollowUpAnswer | null {
  if (
    !conversation.usedPriorFocus ||
    conversation.currentIntent !== 'summary' ||
    conversation.priorFocus.length === 0
  ) {
    return null;
  }

  const question = normalize(conversation.originalQuestion);

  const why = /^(?:tại sao|vì sao|sao vậy|why|why so|why that)\b/u.test(question);

  const then = /^(?:rồi sao|sau đó|tiếp thì sao|thế tiếp theo|then what|what next)\b/u.test(
    question
  );

  const order: MemoryFactKind[] = why
    ? ['decision', 'blocker', 'next_action', 'task', 'file']
    : then
      ? ['next_action', 'todo', 'task', 'blocker', 'file', 'decision']
      : ['task', 'next_action', 'file', 'decision', 'blocker'];

  const labels: Partial<Record<MemoryFactKind, string>> = {
    task: 'Task liên quan',

    next_action: 'Việc tiếp theo',

    file: 'File liên quan',

    decision: 'Quyết định liên quan',

    blocker: 'Blocker',

    todo: 'TODO',
  };

  const parts: string[] = [];

  for (const kind of order) {
    const value = firstConversationFact(conversation, kind);

    if (!value) {
      continue;
    }

    parts.push(`${labels[kind] ?? kind}: ${value}.`);

    /*
     * Why needs a compact explanation, not a memory dump.
     * For normal follow-ups, at most 3 facts are enough.
     */
    if ((why && parts.length >= 2) || (!why && parts.length >= 3)) {
      break;
    }
  }

  if (parts.length === 0) {
    return null;
  }

  return {
    answer: parts.join(' '),

    intent: 'summary',

    source: 'conversation-focus',
  };
}

export function prepareMemoryConversation(
  project: ProjectManifest,
  question: string,
  options: {
    now?: number;

    maxAgeMs?: number;
  } = {}
): PreparedMemoryConversation {
  const now = options.now ?? Date.now();

  const maxAgeMs = options.maxAgeMs ?? DEFAULT_MAX_AGE_MS;

  const previous = readConversation(project, now, maxAgeMs);

  const usePriorFocus = Boolean(
    previous && previous.focus.length > 0 && looksLikeFollowUp(question)
  );

  const resolvedQuestion =
    usePriorFocus && previous
      ? [
          question.trim(),

          '',
          'Previous ToolNet Memory conversation focus:',
          renderPriorFocus(previous),

          '',
          'Use the compact focus only to resolve the current follow-up question.',
          'Do not reconstruct or request raw session transcripts.',
        ].join('\n')
      : question.trim();

  const currentIntent = detectMemoryQueryIntent(question);

  const retrieval = retrieveMemoryContext(project, resolvedQuestion, {
    maxFacts: 8,

    maxChars: 1800,
  });

  const currentFacts = retrieval.facts.map((fact) => ({
    kind: fact.kind,

    value: fact.value,

    source: fact.source,
  }));

  /*
   * A follow-up keeps useful previous focus behind the
   * newly retrieved facts. A fresh/direct question resets
   * focus to the new subject.
   */
  const nextFocus = uniqueFacts(
    usePriorFocus && previous ? [...currentFacts, ...previous.focus] : currentFacts
  );

  writeConversation(project, {
    schema: 'toolnet.memory-conversation.v1',

    version: 1,

    projectId: project.id,

    updatedAt: new Date(now).toISOString(),

    lastIntent: currentIntent,

    focus: nextFocus,
  });

  return {
    question: resolvedQuestion,

    originalQuestion: question,

    usedPriorFocus: usePriorFocus,

    previousIntent: previous?.lastIntent,

    currentIntent,

    priorFocus: previous?.focus ?? [],

    focusCount: nextFocus.length,
  };
}

export function readMemoryConversationState(
  project: ProjectManifest,
  options: {
    now?: number;

    maxAgeMs?: number;
  } = {}
): MemoryConversationStateV1 | null {
  return readConversation(
    project,
    options.now ?? Date.now(),
    options.maxAgeMs ?? DEFAULT_MAX_AGE_MS
  );
}
