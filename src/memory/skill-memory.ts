import { createHash } from 'node:crypto';

import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';

import { join } from 'node:path';

import type { ProjectManifest } from '../core/types.js';

import type { MemoryPipelineState } from './pipeline-v2.js';

import type { NormalizedSessionEvent, SessionIdentity } from '../session/types.js';

export const SKILL_MEMORY_SCHEMA = 'toolnet.skill-memory.v1';

const MAX_SKILLS_PER_SESSION = 5;

const MAX_STEPS = 16;

const MAX_FILES = 24;

const MAX_SOURCE_REFS = 32;

export interface SkillMemorySource {
  agent: string;

  nativeSessionId: string;

  sessionKey: string;

  firstSequence: number;

  lastSequence: number;

  eventIds: string[];
}

export interface SkillMemoryAssetV1 {
  schema: typeof SKILL_MEMORY_SCHEMA;

  version: 1;

  id: string;

  fingerprint: string;

  projectId: string;

  title: string;

  task: string;

  summary: string;

  steps: string[];

  verification: string[];

  files: string[];

  source: SkillMemorySource;

  createdAt: string;
}

export interface SkillMemoryPersistResult {
  written: number;

  deduped: number;

  files: string[];
}

export interface SkillMemorySearchMatch {
  id: string;

  title: string;

  task: string;

  summary: string;

  steps: string[];

  verification: string[];

  files: string[];

  source: SkillMemorySource;

  createdAt: string;

  score: number;
}

function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function unique(values: string[], limit = Number.MAX_SAFE_INTEGER): string[] {
  const seen = new Set<string>();

  const result: string[] = [];

  for (const raw of values) {
    const value = raw.replace(/\s+/gu, ' ').trim();

    if (!value) {
      continue;
    }

    const key = value.normalize('NFKC').toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    result.push(value);

    if (result.length >= limit) {
      break;
    }
  }

  return result;
}

function compact(value: string, maxChars = 360): string {
  const normalized = value.replace(/\s+/gu, ' ').trim();

  if (normalized.length <= maxChars) {
    return normalized;
  }

  return normalized.slice(0, Math.max(0, maxChars - 1)).trimEnd() + '…';
}

function redactSecrets(value: string): string {
  return value
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/giu, 'Bearer [REDACTED]')
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/gu, '[REDACTED]')
    .replace(
      /\b(api[_-]?key|token|password|passwd|secret)\b(\s*[:=]\s*)(["']?)[^\s"'`]+/giu,
      '$1$2[REDACTED]'
    );
}

function safeText(value: string | undefined, maxChars = 360): string | undefined {
  if (!value) {
    return undefined;
  }

  const text = compact(redactSecrets(value), maxChars);

  return text || undefined;
}

function firstString(data: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = data[key];

    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  return undefined;
}

function firstNumber(data: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = data[key];

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }

  return undefined;
}

function firstBoolean(data: Record<string, unknown>, keys: string[]): boolean | undefined {
  for (const key of keys) {
    const value = data[key];

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();

      if (['true', 'yes', 'pass', 'passed', 'success', 'succeeded', 'ok'].includes(normalized)) {
        return true;
      }

      if (['false', 'no', 'fail', 'failed', 'error'].includes(normalized)) {
        return false;
      }
    }
  }

  return undefined;
}

function eventFailed(event: NormalizedSessionEvent): boolean {
  const data = event.data ?? {};

  const booleanResult = firstBoolean(data, ['passed', 'pass', 'success', 'succeeded', 'ok']);

  if (booleanResult === false) {
    return true;
  }

  const exitCode = firstNumber(data, ['exitCode', 'exit_code', 'code', 'statusCode']);

  if (exitCode !== undefined && exitCode !== 0) {
    return true;
  }

  const status = firstString(data, ['status', 'result', 'outcome']);

  return Boolean(status && /\b(fail(?:ed)?|error|broken|cancelled)\b/iu.test(status));
}

function eventSucceeded(event: NormalizedSessionEvent): boolean {
  const data = event.data ?? {};

  if (eventFailed(event)) {
    return false;
  }

  const booleanResult = firstBoolean(data, ['passed', 'pass', 'success', 'succeeded', 'ok']);

  if (booleanResult === true) {
    return true;
  }

  const exitCode = firstNumber(data, ['exitCode', 'exit_code', 'code', 'statusCode']);

  if (exitCode === 0) {
    return true;
  }

  const status = firstString(data, ['status', 'result', 'outcome']);

  if (
    status &&
    /\b(pass(?:ed)?|success(?:ful)?|succeeded|ok|green|complete(?:d)?)\b/iu.test(status)
  ) {
    return true;
  }

  /*
   * A normalized commit/deploy event means the action was observed.
   * Explicit failure still wins above.
   */
  return event.type === 'commit' || event.type === 'deploy';
}

function eventFile(event: NormalizedSessionEvent): string | undefined {
  const data = event.data ?? {};

  const direct = firstString(data, ['path', 'file', 'filePath', 'filename', 'target']);

  if (direct) {
    return safeText(direct, 260);
  }

  const provenance = event.provenance?.files;

  return safeText(provenance?.[0], 260);
}

function eventCommand(event: NormalizedSessionEvent): string | undefined {
  return safeText(firstString(event.data ?? {}, ['command', 'cmd', 'script']), 420);
}

function eventLabel(event: NormalizedSessionEvent): string | undefined {
  return safeText(
    firstString(event.data ?? {}, [
      'name',
      'test',
      'suite',
      'title',
      'message',
      'text',
      'result',
      'status',
    ]),
    300
  );
}

function verificationSignals(events: NormalizedSessionEvent[]): string[] {
  const result: string[] = [];

  for (const event of [...events].sort((a, b) => a.sequence - b.sequence)) {
    if (!eventSucceeded(event)) {
      continue;
    }

    if (event.type === 'test') {
      const label = eventLabel(event) ?? eventCommand(event) ?? 'Tests passed';

      result.push(`Test passed: ${label}`);

      continue;
    }

    if (event.type === 'commit') {
      const label = eventLabel(event);

      result.push(label ? `Commit: ${label}` : 'Commit completed');

      continue;
    }

    if (event.type === 'deploy') {
      const label = eventLabel(event);

      result.push(label ? `Deploy: ${label}` : 'Deployment completed');
    }
  }

  return unique(result, 10);
}

function procedureSteps(events: NormalizedSessionEvent[], state: MemoryPipelineState): string[] {
  const steps: string[] = [];

  for (const event of [...events].sort((a, b) => a.sequence - b.sequence)) {
    switch (event.type) {
      case 'file_write':
      case 'file_edit': {
        const file = eventFile(event);

        if (file) {
          steps.push(`Update ${file}`);
        }

        break;
      }

      case 'command': {
        if (eventFailed(event)) {
          break;
        }

        const command = eventCommand(event);

        if (command) {
          steps.push(`Run: ${command}`);
        }

        break;
      }

      case 'test': {
        if (!eventSucceeded(event)) {
          break;
        }

        const label = eventLabel(event) ?? eventCommand(event) ?? 'project tests';

        steps.push(`Verify: ${label}`);

        break;
      }

      case 'commit': {
        if (!eventSucceeded(event)) {
          break;
        }

        const label = eventLabel(event);

        steps.push(label ? `Commit: ${label}` : 'Commit verified changes');

        break;
      }

      case 'deploy': {
        if (!eventSucceeded(event)) {
          break;
        }

        const label = eventLabel(event);

        steps.push(label ? `Deploy: ${label}` : 'Deploy verified build');

        break;
      }

      default:
        break;
    }
  }

  /*
   * If normalized events do not contain explicit write/edit events,
   * preserve the compact file sequence from MemoryPipeline state.
   */
  if (steps.length === 0) {
    for (const file of state.files.slice(0, 8)) {
      const safe = safeText(file, 260);

      if (safe) {
        steps.push(`Update ${safe}`);
      }
    }
  }

  return unique(steps, MAX_STEPS);
}

function sourceFiles(events: NormalizedSessionEvent[], state: MemoryPipelineState): string[] {
  const files: string[] = [...state.files];

  for (const event of events) {
    const file = eventFile(event);

    if (file) {
      files.push(file);
    }

    for (const provenanceFile of event.provenance?.files ?? []) {
      const safe = safeText(provenanceFile, 260);

      if (safe) {
        files.push(safe);
      }
    }
  }

  return unique(files, MAX_FILES);
}

function sourceEventIds(events: NormalizedSessionEvent[]): string[] {
  return unique(
    events
      .filter((event) =>
        ['file_write', 'file_edit', 'command', 'test', 'commit', 'deploy'].includes(event.type)
      )
      .map((event) => event.id),
    MAX_SOURCE_REFS
  );
}

function latestTimestamp(events: NormalizedSessionEvent[]): string {
  const timestamps = events
    .map((event) => event.timestamp)
    .filter(Boolean)
    .sort();

  return timestamps.at(-1) ?? new Date(0).toISOString();
}

/**
 * Deterministically promotes successful work into reusable SOP assets.
 *
 * Raw user/assistant transcript events are intentionally ignored.
 * Only compact task state and selected execution evidence are retained.
 */
export function buildSkillMemoryAssets(
  identity: SessionIdentity,
  events: NormalizedSessionEvent[],
  state: MemoryPipelineState
): SkillMemoryAssetV1[] {
  if (events.length === 0) {
    return [];
  }

  const verification = verificationSignals(events);

  const completedTasks = unique(
    state.completed.map((value) => safeText(value, 280) ?? ''),
    MAX_SKILLS_PER_SESSION
  );

  const hasStrongSuccess =
    completedTasks.length > 0 ||
    events.some(
      (event) => ['test', 'commit', 'deploy'].includes(event.type) && eventSucceeded(event)
    );

  if (!hasStrongSuccess) {
    return [];
  }

  const fallbackTask = safeText(state.task, 280) ?? safeText(state.nextActions[0], 280);

  const tasks = completedTasks.length > 0 ? completedTasks : fallbackTask ? [fallbackTask] : [];

  if (tasks.length === 0) {
    return [];
  }

  const steps = procedureSteps(events, state);

  if (steps.length === 0) {
    return [];
  }

  const files = sourceFiles(events, state);

  const eventIds = sourceEventIds(events);

  const firstSequence = Math.min(...events.map((event) => event.sequence));

  const lastSequence = Math.max(...events.map((event) => event.sequence));

  const createdAt = latestTimestamp(events);

  return tasks.slice(0, MAX_SKILLS_PER_SESSION).map((task) => {
    const summaryParts = [
      `Reusable procedure learned from successful task: ${task}.`,
      files.length > 0 ? `Files: ${files.slice(0, 6).join(', ')}.` : '',
      verification.length > 0 ? `Verification: ${verification.slice(0, 4).join('; ')}.` : '',
    ].filter(Boolean);

    const canonical = JSON.stringify({
      projectId: identity.projectId,
      task,
      steps,
      verification,
      files,
    });

    const fingerprint = digest(canonical);

    return {
      schema: SKILL_MEMORY_SCHEMA,

      version: 1,

      id: `skill-${fingerprint.slice(0, 24)}`,

      fingerprint,

      projectId: identity.projectId,

      title: compact(`SOP: ${task}`, 180),

      task,

      summary: compact(summaryParts.join(' '), 900),

      steps,

      verification,

      files,

      source: {
        agent: identity.agent,

        nativeSessionId: identity.nativeSessionId,

        sessionKey: identity.sessionKey,

        firstSequence,

        lastSequence,

        eventIds,
      },

      createdAt,
    };
  });
}

function skillDirectory(project: ProjectManifest): string {
  return join(project.rootPath, '.toolnet', 'memory', 'skills');
}

function ensureSkillDirectory(project: ProjectManifest): string {
  const directory = skillDirectory(project);

  mkdirSync(directory, {
    recursive: true,

    mode: 0o700,
  });

  chmodSync(directory, 0o700);

  return directory;
}

/**
 * Skill assets are content-addressed and immutable.
 *
 * If an identical successful procedure is learned again,
 * the existing asset wins and no duplicate is created.
 *
 * Throws on persistence failure so learner cursor cannot advance.
 */
export function persistSkillMemoryAssets(
  project: ProjectManifest,
  assets: SkillMemoryAssetV1[]
): SkillMemoryPersistResult {
  if (assets.length === 0) {
    return {
      written: 0,

      deduped: 0,

      files: [],
    };
  }

  const directory = ensureSkillDirectory(project);

  let written = 0;

  let deduped = 0;

  const files: string[] = [];

  for (const asset of assets) {
    if (asset.projectId !== project.id) {
      throw new Error(`Skill project mismatch: ${asset.projectId} != ${project.id}`);
    }

    const file = join(directory, `${asset.id}.json`);

    files.push(file);

    if (existsSync(file)) {
      deduped += 1;

      continue;
    }

    const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;

    writeFileSync(temporary, JSON.stringify(asset, null, 2) + '\n', {
      encoding: 'utf8',

      mode: 0o600,
    });

    renameSync(temporary, file);

    chmodSync(file, 0o600);

    written += 1;
  }

  return {
    written,

    deduped,

    files,
  };
}

function isSkillAsset(value: unknown, projectId: string): value is SkillMemoryAssetV1 {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Partial<SkillMemoryAssetV1>;

  return (
    record.schema === SKILL_MEMORY_SCHEMA &&
    record.version === 1 &&
    record.projectId === projectId &&
    typeof record.id === 'string' &&
    typeof record.task === 'string' &&
    Array.isArray(record.steps) &&
    Array.isArray(record.verification) &&
    Array.isArray(record.files)
  );
}

export function listSkillMemoryAssets(project: ProjectManifest): SkillMemoryAssetV1[] {
  const directory = skillDirectory(project);

  if (!existsSync(directory)) {
    return [];
  }

  if (!statSync(directory).isDirectory()) {
    return [];
  }

  const result: SkillMemoryAssetV1[] = [];

  for (const name of readdirSync(directory)) {
    if (!name.endsWith('.json')) {
      continue;
    }

    const file = join(directory, name);

    try {
      const parsed = JSON.parse(readFileSync(file, 'utf8')) as unknown;

      if (isSkillAsset(parsed, project.id)) {
        result.push(parsed);
      }
    } catch {
      /*
       * Corrupt optional derived assets must never break continuity.
       */
    }
  }

  return result.sort((left, right) => {
    const byDate = right.createdAt.localeCompare(left.createdAt);

    if (byDate !== 0) {
      return byDate;
    }

    return left.id.localeCompare(right.id);
  });
}

function searchTerms(value: string): string[] {
  return unique(
    value
      .normalize('NFKC')
      .toLowerCase()
      .split(/[^\p{L}\p{N}_./-]+/gu)
      .filter((term) => term.length >= 2),
    32
  );
}

function skillScore(asset: SkillMemoryAssetV1, query: string): number {
  const normalizedQuery = query.normalize('NFKC').toLowerCase().trim();

  if (!normalizedQuery) {
    return 0;
  }

  if (
    asset.id.toLowerCase() === normalizedQuery ||
    asset.fingerprint.toLowerCase() === normalizedQuery
  ) {
    return 1000;
  }

  const searchable = [
    asset.title,
    asset.task,
    asset.summary,
    ...asset.steps,
    ...asset.verification,
    ...asset.files,
  ]
    .join('\n')
    .normalize('NFKC')
    .toLowerCase();

  let score = 0;

  if (asset.task.normalize('NFKC').toLowerCase().includes(normalizedQuery)) {
    score += 40;
  }

  if (asset.title.normalize('NFKC').toLowerCase().includes(normalizedQuery)) {
    score += 30;
  }

  for (const term of searchTerms(normalizedQuery)) {
    if (searchable.includes(term)) {
      score += 5;
    }

    if (asset.task.normalize('NFKC').toLowerCase().includes(term)) {
      score += 4;
    }

    if (asset.files.some((file) => file.toLowerCase().includes(term))) {
      score += 3;
    }
  }

  return score;
}

export function searchSkillMemory(
  project: ProjectManifest,
  query: string,
  limit = 5
): SkillMemorySearchMatch[] {
  const safeLimit = Math.max(1, Math.min(10, Math.floor(limit)));

  return listSkillMemoryAssets(project)
    .map((asset) => ({
      ...asset,

      score: skillScore(asset, query),
    }))
    .filter((asset) => asset.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return right.createdAt.localeCompare(left.createdAt);
    })
    .slice(0, safeLimit);
}
