import type { MemoryRecord } from '../core/types.js';
import { deriveMemoryFreshness } from '../memory/scope-freshness.js';
import type {
  DurableCheckpointFact,
  DurableMemoryCheckpoint,
} from '../session/durable-checkpoint.js';
import { estimateTokens, truncateByTokens } from './token-budget.js';
import type { CurrentWorkProjectionV2 } from './current-work-projection.js';

const DAY_MS = 86_400_000;
const SESSION_FALLBACK_MAX_AGE_MS = 14 * DAY_MS;
const PERSISTENT_CURRENT_MAX_AGE_MS = 30 * DAY_MS;
const RECENT_MEMORY_MAX_AGE_MS = 30 * DAY_MS;

export interface StartupMemorySelection {
  rules: string[];
  observations: string[];
}

export interface RankedContextSection {
  title: string;
  content: string;
  priority: number;
  maxTokens?: number;
}

function objectRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function clean(value: string, max = 400): string {
  const normalized = value.normalize('NFKC').replace(/\s+/gu, ' ').trim();
  if (normalized.length <= max) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function timestamp(value: unknown): number | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function isRecentTimestamp(
  value: string | undefined,
  maxAgeDays: number,
  now = Date.now()
): boolean {
  const parsed = timestamp(value);
  if (parsed === undefined) {
    return false;
  }
  const age = now - parsed;
  /*
   * Small clock skew is fine.
   * Large future timestamps are not trusted as freshness evidence.
   */
  if (age < -DAY_MS) {
    return false;
  }
  return age <= maxAgeDays * DAY_MS;
}

function memoryConfidence(memory: MemoryRecord): number {
  const metadata = objectRecord(memory.metadata);
  const raw =
    typeof memory.confidence === 'number'
      ? memory.confidence
      : typeof metadata.confidence === 'number'
        ? metadata.confidence
        : 0;
  if (!Number.isFinite(raw)) {
    return 0;
  }
  return Math.max(0, Math.min(1, raw));
}

function memoryScope(memory: MemoryRecord): string {
  if (memory.scope) {
    return memory.scope;
  }
  const metadata = objectRecord(memory.metadata);
  return typeof metadata.memoryScope === 'string' ? metadata.memoryScope : 'history';
}

function memoryObservedAt(memory: MemoryRecord): string {
  const metadata = objectRecord(memory.metadata);
  if (memory.observedAt) {
    return memory.observedAt;
  }
  if (typeof metadata.observedAt === 'string') {
    return metadata.observedAt;
  }
  return memory.createdAt;
}

function memoryVerified(memory: MemoryRecord): boolean {
  const metadata = objectRecord(memory.metadata);
  const evidence = objectRecord(metadata.evidence);
  return Boolean(
    memory.verifiedAt ||
    (typeof metadata.verifiedAt === 'string' && metadata.verifiedAt) ||
    evidence.userExplicit === true ||
    evidence.sourceVerified === true ||
    evidence.testVerified === true
  );
}

function uniqueContent(values: string[], limit: number): string[] {
  const output: string[] = [];
  const seen = new Set<string>();
  for (const raw of values) {
    const value = clean(raw);
    if (!value) {
      continue;
    }
    const key = value.toLocaleLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(value);
    if (output.length >= limit) {
      break;
    }
  }
  return output;
}

/**
 * Phase 56 canonical Memory startup filter.
 *
 * IMPORTANT:
 * This is a read-only filter.
 *
 * It never deletes, expires, archives, updates or rewrites Memory.
 * `toolnet-memory ask` therefore retains access to full history.
 */
export function selectCanonicalStartupMemories(
  memories: MemoryRecord[],
  now = Date.now()
): StartupMemorySelection {
  const rules = memories
    .filter((memory) => {
      if (memoryScope(memory) !== 'rule') {
        return false;
      }
      if (deriveMemoryFreshness(memory, now) !== 'fresh') {
        return false;
      }
      /*
       * Long-term rules require explicit/source/test verification.
       * High confidence alone is not enough to call a rule verified.
       */
      return memoryVerified(memory);
    })
    .sort(
      (left, right) =>
        memoryConfidence(right) - memoryConfidence(left) ||
        right.updatedAt.localeCompare(left.updatedAt) ||
        left.id.localeCompare(right.id)
    )
    .map((memory) => memory.content);

  const observations = memories
    .filter((memory) => {
      const scope = memoryScope(memory);
      if (!['decision', 'fact', 'observation'].includes(scope)) {
        return false;
      }
      if (deriveMemoryFreshness(memory, now) !== 'fresh') {
        return false;
      }
      if (memoryConfidence(memory) < 0.8) {
        return false;
      }
      return isRecentTimestamp(memoryObservedAt(memory), RECENT_MEMORY_MAX_AGE_MS / DAY_MS, now);
    })
    .sort((left, right) => {
      const confidence = memoryConfidence(right) - memoryConfidence(left);
      if (confidence !== 0) {
        return confidence;
      }
      const rightTime = timestamp(memoryObservedAt(right)) ?? 0;
      const leftTime = timestamp(memoryObservedAt(left)) ?? 0;
      return rightTime - leftTime || left.id.localeCompare(right.id);
    })
    .map((memory) => memory.content);

  return {
    rules: uniqueContent(rules, 8),
    observations: uniqueContent(observations, 5),
  };
}

function lifetimeMaxAgeDays(fact: DurableCheckpointFact): number {
  switch (fact.knowledgeClass) {
    case 'transient':
      return 1;
    case 'session':
      return 14;
    case 'task':
      return 30;
    /*
     * A non-rule permanent fact still should not become
     * eternal startup noise.
     */
    case 'permanent':
      return 30;
    default:
      return 14;
  }
}

/**
 * Local-only equivalent for fast startup context.
 *
 * Canonical Memory may live remotely, so Fast Context uses
 * the crash-safe durable checkpoint without network access.
 */
export function selectDurableCheckpointFacts(
  checkpoint: DurableMemoryCheckpoint | null,
  now = Date.now()
): StartupMemorySelection {
  if (!checkpoint) {
    return {
      rules: [],
      observations: [],
    };
  }
  const rules = checkpoint.durableFacts
    .filter(
      (fact) =>
        fact.kind === 'rule' && fact.knowledgeClass === 'permanent' && fact.confidence >= 0.95
    )
    .sort(
      (left, right) =>
        right.confidence - left.confidence ||
        right.importanceScore - left.importanceScore ||
        right.createdAt.localeCompare(left.createdAt)
    )
    .map((fact) => fact.content);

  const observations = checkpoint.durableFacts
    .filter((fact) => {
      if (fact.kind === 'rule') {
        return false;
      }
      if (fact.confidence < 0.85) {
        return false;
      }
      return isRecentTimestamp(fact.createdAt, lifetimeMaxAgeDays(fact), now);
    })
    .sort(
      (left, right) =>
        right.confidence - left.confidence ||
        right.importanceScore - left.importanceScore ||
        right.createdAt.localeCompare(left.createdAt)
    )
    .map((fact) => fact.content);

  return {
    rules: uniqueContent(rules, 6),
    observations: uniqueContent(observations, 4),
  };
}

export function currentWorkFreshForStartup(
  projection: CurrentWorkProjectionV2,
  now = Date.now()
): boolean {
  if (projection.source === 'empty') {
    return false;
  }
  if (projection.source === 'persistent-task' && projection.task?.leaseAgentId) {
    return true;
  }
  if (!projection.lastActivityAt) {
    return false;
  }
  const maxAge =
    projection.source === 'persistent-task'
      ? PERSISTENT_CURRENT_MAX_AGE_MS
      : SESSION_FALLBACK_MAX_AGE_MS;
  const parsed = timestamp(projection.lastActivityAt);
  if (parsed === undefined) {
    return false;
  }
  const age = now - parsed;
  if (age < -DAY_MS) {
    return false;
  }
  return age <= maxAge;
}

function bulletSection(title: string, values: string[], limit: number): string[] {
  const selected = uniqueContent(values, limit);
  if (selected.length === 0) {
    return [];
  }
  return ['', `${title}:`, ...selected.map((value) => `- ${value}`)];
}

function hardClip(value: string, maxChars: number): string {
  if (value.length <= maxChars) {
    return value;
  }
  const marker = '\n[ToolNet context section truncated]';
  return value.slice(0, Math.max(0, maxChars - marker.length)) + marker;
}

/**
 * Compact current Task rendering.
 *
 * Only data belonging to the selected current Task is emitted.
 * Historical Task lists are never copied here.
 */
export function renderCompactCurrentWork(
  projection: CurrentWorkProjectionV2,
  options: {
    now?: number;
    maxChars?: number;
  } = {}
): string {
  const now = options.now ?? Date.now();
  const maxChars = Math.max(500, Math.min(4_000, options.maxChars ?? 3_000));

  if (projection.source === 'empty') {
    if (projection.authority === 'persistent-tasks') {
      return [
        'Current task: none fresh',
        'Persistent Task history exists, but no fresh current Task was selected.',
        'Do not revive stale/completed Task history automatically.',
        'Use task:list or memory ask only when deeper history is needed.',
      ].join('\n');
    }
    return '';
  }

  if (!currentWorkFreshForStartup(projection, now)) {
    return '';
  }
  if (!projection.task) {
    return '';
  }

  const task = projection.task;
  const lines = [
    `Task: ${clean(task.title, 320)}`,
    `Task ID: ${clean(task.id, 180)}`,
    `Status: ${task.status}`,
  ];
  if (task.priority) {
    lines.push(`Priority: ${task.priority}`);
  }
  if (task.progressPercent !== undefined) {
    lines.push(`Progress: ${task.progressPercent}%`);
  }
  if (task.leaseAgentId) {
    lines.push(`Lease owner: ${clean(task.leaseAgentId, 160)}`);
  }
  lines.push(
    ...bulletSection('Done', projection.completed, 5),
    ...bulletSection('Remaining', projection.remaining, 6),
    ...bulletSection('Open blockers', projection.blockers, 5),
    ...bulletSection('Files touched', projection.filesTouched, 8),
    ...bulletSection('Important artifacts', projection.artifacts, 6),
    ...bulletSection('Verification', projection.verification, 5)
  );
  if (projection.nextAction) {
    lines.push('', 'Next action:', `- ${clean(projection.nextAction, 360)}`);
  }
  if (projection.lastActivityAt) {
    lines.push('', `Last activity: ${projection.lastActivityAt}`);
  }
  return hardClip(lines.join('\n'), maxChars);
}

/**
 * Ranking + per-section budgets.
 *
 * One oversized section can no longer consume all context and
 * hide the Current Work section behind historical notes.
 */
export function renderRankedContextSections(
  sections: RankedContextSection[],
  maxTokens: number
): string {
  const budget = Math.max(64, Math.floor(maxTokens));
  const ordered = sections
    .map((section, index) => ({
      ...section,
      index,
      content: section.content.trim(),
    }))
    .filter((section) => Boolean(section.content))
    .sort((left, right) => right.priority - left.priority || left.index - right.index);

  const output: string[] = [];
  let used = 0;
  let trimmed = false;

  for (const section of ordered) {
    const header = `## ${section.title}\n`;
    const headerTokens = estimateTokens(header);
    const remaining = budget - used;
    if (remaining <= headerTokens + 8) {
      trimmed = true;
      continue;
    }
    const sectionLimit = Math.max(
      8,
      Math.min(section.maxTokens ?? remaining, remaining - headerTokens)
    );
    const content = truncateByTokens(section.content, sectionLimit).trim();
    if (!content) {
      continue;
    }
    if (estimateTokens(section.content) > estimateTokens(content)) {
      trimmed = true;
    }
    const rendered = `${header}${content}`;
    const tokens = estimateTokens(rendered);
    if (used + tokens > budget) {
      trimmed = true;
      continue;
    }
    output.push(rendered);
    used += tokens;
  }

  const marker =
    '[Older/lower-confidence context omitted from startup. Use memory ask for history.]';
  if (trimmed && used + estimateTokens(marker) <= budget) {
    output.push(marker);
  }
  return output.join('\n\n');
}

export function compactStartupText(content: string, maxLines = 8, maxCharsPerLine = 240): string {
  const output: string[] = [];
  for (const raw of content.split(/\r?\n/u)) {
    const line = clean(raw, maxCharsPerLine);
    if (!line) {
      continue;
    }
    output.push(line);
    if (output.length >= maxLines) {
      break;
    }
  }
  return output.join('\n');
}
