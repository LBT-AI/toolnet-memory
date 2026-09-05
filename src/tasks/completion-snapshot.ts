import { createHash } from 'node:crypto';
import { sanitizeDurableText } from '../security/durable-sanitizer.js';
import type { NormalizedSessionEvent } from '../session/types.js';
import type {
  TaskCompletionSnapshot,
  TaskCompletionSource,
  TaskCompletionTest,
  TaskRecord,
} from './types.js';

const SUMMARY_MAX = 4_000;
const CHANGE_MAX = 32;
const CHANGE_TEXT_MAX = 1_000;
const DECISION_MAX = 16;
const DECISION_TEXT_MAX = 1_000;
const VERIFICATION_MAX = 32;
const VERIFICATION_TEXT_MAX = 1_000;
const FILE_MAX = 256;
const FILE_TEXT_MAX = 500;
const TEST_MAX = 256;
const TEST_NAME_MAX = 500;
const TEST_DETAIL_MAX = 1_000;
const SHA_PATTERN = /^[0-9a-f]{7,64}$/iu;
const FORBIDDEN_KEYS = new Set([
  'reasoning',
  'chainofthought',
  'chain_of_thought',
  'analysis',
  'thoughts',
  'internalreasoning',
]);

export type TaskCompletionDraft = Omit<TaskCompletionSnapshot, 'capturedAt'>;

export interface BuildTaskCompletionInput {
  projectId: string;
  task: TaskRecord;
  provider: string;
  nativeSessionId: string;
  sourceEventId: string;
  turnId?: string;
  visibleSummary?: string;
  visibleChanges?: string[];
  visibleDecisions?: string[];
  visibleVerification?: string[];
  commitSha?: string;
}

export interface TaskCompletionRecordInput {
  completion: TaskCompletionDraft;
}

export interface NativeVisibleCompletionResult {
  projectId: string;
  provider: string;
  agentId: string;
  nativeSessionId: string;
  planId?: string;
  sourceEventId: string;
  sourceKey?: string;
  turnId?: string;
  observedAt: string;
  summary?: string;
  changes: string[];
  decisions: string[];
  verification: string[];
  commitSha?: string;
  digest: string;
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
    .join(',')}}`;
}

function text(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = sanitizeDurableText(value).normalize('NFKC').replace(/\s+/gu, ' ').trim();
  return normalized ? normalized.slice(0, max) : undefined;
}

function list(values: unknown[] | undefined, maxEntries: number, maxText: number): string[] {
  if (!Array.isArray(values)) {
    return [];
  }
  const output: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const item = text(value, maxText);
    if (!item || seen.has(item.toLowerCase())) {
      continue;
    }
    seen.add(item.toLowerCase());
    output.push(item);
    if (output.length >= maxEntries) {
      break;
    }
  }
  return output;
}

function files(values: string[]): string[] {
  return list(values, FILE_MAX, FILE_TEXT_MAX).sort((left, right) => left.localeCompare(right));
}

function tests(values: TaskRecord['tests']): TaskCompletionTest[] {
  const output: TaskCompletionTest[] = [];
  const seen = new Set<string>();
  for (const item of values.slice(0, TEST_MAX)) {
    const name = text(item.name, TEST_NAME_MAX);
    if (!name || seen.has(name.toLowerCase())) {
      continue;
    }
    seen.add(name.toLowerCase());
    const detail = text(item.detail, TEST_DETAIL_MAX);
    output.push({
      name,
      outcome: item.outcome,
      ...(detail ? { detail } : {}),
    });
  }
  return output;
}

function validCommitSha(value: unknown): string | undefined {
  const candidate = text(value, 64)?.toLowerCase();
  return candidate && SHA_PATTERN.test(candidate) ? candidate : undefined;
}

function source(input: BuildTaskCompletionInput): TaskCompletionSource {
  const provider = text(input.provider, 100) ?? 'agent';
  const nativeSessionId = text(input.nativeSessionId, 300) ?? 'unknown-session';
  const sourceEventId = text(input.sourceEventId, 300) ?? 'unknown-event';
  const turnId = text(input.turnId, 300);
  return {
    provider,
    nativeSessionId,
    sourceEventId,
    ...(turnId ? { turnId } : {}),
  };
}

function completionId(projectId: string, taskId: string, value: TaskCompletionSource): string {
  return `completion-${sha256(
    [projectId, taskId, value.provider, value.nativeSessionId, value.sourceEventId].join('\u0000')
  ).slice(0, 40)}`;
}

function completionContent(
  input: BuildTaskCompletionInput
): Omit<TaskCompletionDraft, 'id' | 'digest'> {
  const completionSource = source(input);
  const changes = list(input.visibleChanges, CHANGE_MAX, CHANGE_TEXT_MAX);
  const decisions = list(input.visibleDecisions, DECISION_MAX, DECISION_TEXT_MAX);
  const verification = list(input.visibleVerification, VERIFICATION_MAX, VERIFICATION_TEXT_MAX);
  const taskTests = tests(input.task.tests);
  const taskFiles = files(input.task.filesTouched);
  const commitSha = validCommitSha(
    input.commitSha ?? input.task.evidence.find((item) => item.kind === 'commit' && item.ref)?.ref
  );
  const summary = text(input.visibleSummary, SUMMARY_MAX);
  const fallbackLines = [
    `Completed: ${text(input.task.title, CHANGE_TEXT_MAX) ?? 'Task'}`,
    taskFiles.length > 0 ? `Files changed: ${taskFiles.length}` : undefined,
    taskTests.length > 0
      ? `Tests: ${taskTests.filter((item) => item.outcome === 'pass').length} PASS, ${taskTests.filter((item) => item.outcome === 'fail').length} FAIL, ${taskTests.filter((item) => item.outcome === 'skip').length} SKIP`
      : undefined,
    commitSha ? `Commit: ${commitSha}` : undefined,
  ].filter((line): line is string => Boolean(line));
  return {
    summary: summary ?? fallbackLines.join('\n'),
    changes,
    decisions,
    verification,
    files: taskFiles,
    tests: taskTests,
    ...(commitSha ? { commitSha } : {}),
    source: completionSource,
  };
}

type CompletionDigestInput = Omit<TaskCompletionDraft, 'digest'>;

export function completionDigest(value: CompletionDigestInput): string {
  return sha256(
    stableJson({
      id: value.id,
      summary: value.summary,
      changes: value.changes,
      decisions: value.decisions,
      verification: value.verification,
      files: value.files,
      tests: value.tests,
      commitSha: value.commitSha ?? null,
      source: value.source,
    })
  );
}

export function buildTaskCompletionDraft(input: BuildTaskCompletionInput): TaskCompletionDraft {
  const content = completionContent(input);
  const id = completionId(input.projectId, input.task.id, content.source);
  const withoutDigest: CompletionDigestInput = {
    id,
    ...content,
  };
  return {
    ...withoutDigest,
    digest: completionDigest(withoutDigest),
  };
}

function forbiddenKey(key: string): boolean {
  const normalized = key
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9_]/gu, '');
  return FORBIDDEN_KEYS.has(normalized);
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function visibleText(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return text(value, SUMMARY_MAX);
  }
  if (!Array.isArray(value)) {
    return undefined;
  }
  const parts: string[] = [];
  for (const item of value) {
    const object = objectValue(item);
    if (!object || Object.keys(object).some(forbiddenKey)) {
      continue;
    }
    const part = text(object.text ?? object.value, SUMMARY_MAX);
    if (part) {
      parts.push(part);
    }
  }
  return parts.join(' ').slice(0, SUMMARY_MAX) || undefined;
}

function explicitResultObject(event: NormalizedSessionEvent): Record<string, unknown> | undefined {
  if (
    event.type !== 'assistant_message' &&
    event.type !== 'message' &&
    event.type !== 'message_part'
  ) {
    return undefined;
  }
  if (
    event.type !== 'message' &&
    event.type !== 'assistant_message' &&
    event.role !== 'assistant'
  ) {
    return undefined;
  }
  const data = objectValue(event.data);
  if (!data || Object.keys(data).some(forbiddenKey)) {
    return undefined;
  }
  const completion = objectValue(data.completion);
  if (completion) {
    return completion;
  }
  const result = objectValue(data.result);
  if (result) {
    return result;
  }
  const hasExplicitMarker = data.completion === true || data.result === true;
  return hasExplicitMarker ? data : undefined;
}

function explicitStringArray(value: unknown, maxEntries: number, maxText: number): string[] {
  return Array.isArray(value) ? list(value, maxEntries, maxText) : [];
}

function visibleResultDigest(result: Omit<NativeVisibleCompletionResult, 'digest'>): string {
  return sha256(
    stableJson({
      projectId: result.projectId,
      provider: result.provider,
      agentId: result.agentId,
      nativeSessionId: result.nativeSessionId,
      planId: result.planId ?? null,
      sourceEventId: result.sourceEventId,
      sourceKey: result.sourceKey ?? null,
      turnId: result.turnId ?? null,
      summary: result.summary ?? null,
      changes: result.changes,
      decisions: result.decisions,
      verification: result.verification,
      commitSha: result.commitSha ?? null,
    })
  );
}

function defaultPlanId(agent: string): string | undefined {
  if (agent === 'codex') {
    return 'codex:update_plan';
  }
  if (agent === 'opencode') {
    return 'opencode:todowrite';
  }
  return undefined;
}

export function extractNativeVisibleCompletionResults(
  events: NormalizedSessionEvent[]
): NativeVisibleCompletionResult[] {
  const results: NativeVisibleCompletionResult[] = [];
  for (const event of events) {
    const object = explicitResultObject(event);
    if (!object) {
      continue;
    }
    const summary = visibleText(object.summary ?? object.content ?? object.message ?? object.text);
    const changes = explicitStringArray(object.changes, CHANGE_MAX, CHANGE_TEXT_MAX);
    const decisions = explicitStringArray(object.decisions, DECISION_MAX, DECISION_TEXT_MAX);
    const verification = explicitStringArray(
      object.verification,
      VERIFICATION_MAX,
      VERIFICATION_TEXT_MAX
    );
    if (!summary && changes.length === 0 && decisions.length === 0 && verification.length === 0) {
      continue;
    }
    const agent = String(event.agent);
    const sourceKey = text(
      object.sourceKey ?? object.taskSourceKey ?? object.nativeTaskSourceKey,
      300
    );
    const planId = text(object.planId, 300) ?? defaultPlanId(agent);
    const commitSha = validCommitSha(object.commitSha ?? event.provenance.commitSha);
    const base: Omit<NativeVisibleCompletionResult, 'digest'> = {
      projectId: event.projectId,
      provider: agent,
      agentId: agent,
      nativeSessionId: event.nativeSessionId,
      ...(planId ? { planId } : {}),
      sourceEventId: event.sourceEventId ?? event.id,
      ...(sourceKey ? { sourceKey } : {}),
      ...(event.turnId ? { turnId: event.turnId } : {}),
      observedAt: event.timestamp,
      ...(summary ? { summary } : {}),
      changes,
      decisions,
      verification,
      ...(commitSha ? { commitSha } : {}),
    };
    results.push({ ...base, digest: visibleResultDigest(base) });
  }
  return results;
}
