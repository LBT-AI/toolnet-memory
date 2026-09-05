import {
  appendFileSync,
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import type { ProjectManifest } from '../core/types.js';
import { normalizeTaskMirrorSnapshot, taskMirrorSnapshotDigest } from './mirror-identity.js';
import type { AgentPlanItem, AgentPlanItemStatus, AgentPlanSnapshot } from './mirror-types.js';
import type {
  TaskMirrorBindingCorrelationResult,
  TaskMirrorBindingDiagnostic,
  TaskMirrorBindingEvent,
  TaskMirrorBindingProjection,
  TaskMirrorBindingRecord,
  TaskMirrorBindingScopeProjection,
  TaskMirrorBindingSnapshotItem,
} from './mirror-binding-types.js';

const LOCK_STALE_MS = 30_000;
const LOCK_RETRY_MS = 20;
const LOCK_ATTEMPTS = 250;

type BindingProject = Pick<ProjectManifest, 'id' | 'rootPath'>;

type BindingReadProject = Pick<ProjectManifest, 'rootPath'>;

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function processAlive(pid: number): boolean {
  if (!Number.isSafeInteger(pid) || pid < 1) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return code === 'ESRCH' ? false : true;
  }
}

function bindingDirectory(project: BindingReadProject): string {
  return join(project.rootPath, '.toolnet', 'tasks', 'mirror-bindings');
}

export function mirrorBindingLogPath(project: BindingReadProject): string {
  return join(bindingDirectory(project), 'events.jsonl');
}

export function mirrorBindingProjectionPath(project: BindingReadProject): string {
  return join(bindingDirectory(project), 'state.json');
}

function bindingLockPath(project: BindingReadProject): string {
  return join(project.rootPath, '.toolnet', 'runtime', 'locks', 'task-mirror-bindings.lock');
}

function lockRecoverable(file: string): boolean {
  let stat;
  try {
    stat = statSync(file);
  } catch {
    return true;
  }
  if (Date.now() - stat.mtimeMs < LOCK_STALE_MS) {
    return false;
  }
  try {
    const value = JSON.parse(readFileSync(file, 'utf8')) as { pid?: number };
    return typeof value.pid !== 'number' || !processAlive(value.pid);
  } catch {
    return true;
  }
}

async function acquireBindingLock(project: BindingReadProject): Promise<string> {
  const file = bindingLockPath(project);
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  for (let attempt = 0; attempt < LOCK_ATTEMPTS; attempt += 1) {
    const token = randomUUID();
    try {
      const fd = openSync(file, 'wx', 0o600);
      try {
        writeFileSync(
          fd,
          `${JSON.stringify({ version: 1, token, pid: process.pid, createdAt: new Date().toISOString() })}\n`
        );
        fsyncSync(fd);
      } finally {
        closeSync(fd);
      }
      return token;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
      if (lockRecoverable(file)) {
        try {
          unlinkSync(file);
        } catch {
          // Another process may have recovered first.
        }
        continue;
      }
      await sleep(LOCK_RETRY_MS);
    }
  }
  throw new Error('TASK_MIRROR_BINDING_LOCK_TIMEOUT');
}

function releaseBindingLock(project: BindingReadProject, token: string): void {
  const file = bindingLockPath(project);
  if (!existsSync(file)) {
    return;
  }
  try {
    const current = JSON.parse(readFileSync(file, 'utf8')) as { token?: string };
    if (current.token === token) {
      unlinkSync(file);
    }
  } catch {
    // Never delete an unverified lock.
  }
}

function atomicWrite(target: string, value: unknown): void {
  mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
  const temporary = `${target}.tmp-${process.pid}-${randomUUID()}`;
  const fd = openSync(temporary, 'w', 0o600);
  try {
    writeFileSync(fd, `${JSON.stringify(value, null, 2)}\n`);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(temporary, target);
}

function rewriteRecoveredLog(file: string, events: TaskMirrorBindingEvent[]): void {
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  const temporary = `${file}.recovery-${process.pid}-${randomUUID()}`;
  const fd = openSync(temporary, 'w', 0o600);
  try {
    const text =
      events.length === 0 ? '' : `${events.map((event) => JSON.stringify(event)).join('\n')}\n`;
    writeFileSync(fd, text);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(temporary, file);
}

function readBindingEvents(file: string, repairCorruptTail: boolean): TaskMirrorBindingEvent[] {
  if (!existsSync(file)) {
    return [];
  }
  const text = readFileSync(file, 'utf8');
  if (!text) {
    return [];
  }
  const lines = text.split('\n');
  const events: TaskMirrorBindingEvent[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line) {
      continue;
    }
    try {
      const parsed = JSON.parse(line) as TaskMirrorBindingEvent;
      if (parsed.version !== 1 || !parsed.eventId || !parsed.projectId || !parsed.scopeKey) {
        throw new Error('TASK_MIRROR_BINDING_EVENT_INVALID');
      }
      events.push(parsed);
    } catch (error) {
      const laterNonEmpty = lines.slice(index + 1).some((candidate) => Boolean(candidate.trim()));
      if (!repairCorruptTail || laterNonEmpty) {
        throw new Error(`TASK_MIRROR_BINDING_LOG_CORRUPT line=${index + 1} cause=${String(error)}`);
      }
      rewriteRecoveredLog(file, events);
      return events;
    }
  }
  return events;
}

function appendBindingEvent(file: string, event: TaskMirrorBindingEvent): void {
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  let prefix = '';
  if (
    existsSync(file) &&
    readFileSync(file, 'utf8') &&
    !readFileSync(file, 'utf8').endsWith('\n')
  ) {
    prefix = '\n';
  }
  const fd = openSync(file, 'a', 0o600);
  try {
    appendFileSync(fd, `${prefix}${JSON.stringify(event)}\n`);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

export function projectMirrorBindingEvents(
  projectId: string,
  events: TaskMirrorBindingEvent[]
): TaskMirrorBindingProjection {
  const scopes: Record<string, TaskMirrorBindingScopeProjection> = {};
  let count = 0;
  for (const event of events) {
    if (event.projectId !== projectId) {
      continue;
    }
    count += 1;
    scopes[event.scopeKey] = {
      scopeKey: event.scopeKey,
      lastEventId: event.eventId,
      lastSourceEventId: event.sourceEventId,
      ...(event.sourceSequence !== undefined ? { lastSourceSequence: event.sourceSequence } : {}),
      lastObservedAt: event.observedAt,
      snapshotDigest: event.snapshotDigest,
      snapshotItems: event.snapshotItems,
      ...(event.currentCanonicalSourceKey
        ? { currentCanonicalSourceKey: event.currentCanonicalSourceKey }
        : {}),
      bindings: event.bindings,
      ...(event.visibleResult ? { visibleResult: event.visibleResult } : {}),
      ...(event.eventKind ? { eventKind: event.eventKind } : {}),
    };
  }
  return {
    version: 1,
    projectId,
    eventCount: count,
    generatedAt: new Date().toISOString(),
    scopes,
  };
}

export function taskMirrorBindingScopeKey(snapshot: AgentPlanSnapshot): string {
  return sha256(
    [snapshot.projectId, snapshot.provider, snapshot.nativeSessionId, snapshot.planId ?? ''].join(
      '\u0000'
    )
  ).slice(0, 40);
}

function newBindingIdentity(
  scopeKey: string,
  rawSourceKey: string
): {
  bindingId: string;
  canonicalSourceKey: string;
} {
  const bindingId = sha256([scopeKey, rawSourceKey].join('\u0000')).slice(0, 40);
  return { bindingId, canonicalSourceKey: `binding:${bindingId}` };
}

function diagnostic(
  snapshot: AgentPlanSnapshot,
  code: string,
  message: string
): TaskMirrorBindingDiagnostic {
  return {
    provider: snapshot.provider,
    sourceEventId: snapshot.sourceEventId,
    code,
    message,
  };
}

function numericSequence(value: string | number | undefined): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : undefined;
}

/** Only active/blocked lifecycle continuity is strong enough for rename correlation. */
function safeRenameLifecycle(previous: AgentPlanItemStatus, next: AgentPlanItemStatus): boolean {
  if (previous === 'in_progress') {
    return ['in_progress', 'completed', 'cancelled', 'blocked'].includes(next);
  }
  if (previous === 'blocked') {
    return ['blocked', 'in_progress', 'completed', 'cancelled'].includes(next);
  }
  return false;
}

function cloneBinding(binding: TaskMirrorBindingRecord): TaskMirrorBindingRecord {
  return {
    ...binding,
    rawSourceKeys: [...binding.rawSourceKeys],
    ...(binding.visibleResult
      ? {
          visibleResult: {
            ...binding.visibleResult,
            changes: [...binding.visibleResult.changes],
            decisions: [...binding.visibleResult.decisions],
            verification: [...binding.visibleResult.verification],
          },
        }
      : {}),
  };
}

function updatedBinding(
  existing: TaskMirrorBindingRecord,
  item: AgentPlanItem,
  snapshot: AgentPlanSnapshot
): TaskMirrorBindingRecord {
  const aliases = new Set(existing.rawSourceKeys);
  aliases.add(item.sourceKey);
  return {
    ...existing,
    agentId: snapshot.agentId,
    rawSourceKeys: [...aliases].sort(),
    title: item.title,
    order: item.order,
    status: item.status,
    lastSeenAt: snapshot.observedAt,
    lastSourceEventId: snapshot.sourceEventId,
    seenCount: existing.seenCount + 1,
  };
}

function createdBinding(
  snapshot: AgentPlanSnapshot,
  scopeKey: string,
  item: AgentPlanItem
): TaskMirrorBindingRecord {
  const identity = newBindingIdentity(scopeKey, item.sourceKey);
  return {
    version: 1,
    bindingId: identity.bindingId,
    projectId: snapshot.projectId,
    scopeKey,
    provider: snapshot.provider,
    agentId: snapshot.agentId,
    nativeSessionId: snapshot.nativeSessionId,
    ...(snapshot.planId ? { planId: snapshot.planId } : {}),
    canonicalSourceKey: identity.canonicalSourceKey,
    rawSourceKeys: [item.sourceKey],
    title: item.title,
    order: item.order,
    status: item.status,
    firstSeenAt: snapshot.observedAt,
    lastSeenAt: snapshot.observedAt,
    firstSourceEventId: snapshot.sourceEventId,
    lastSourceEventId: snapshot.sourceEventId,
    seenCount: 1,
  };
}

function resolvedSnapshot(
  snapshot: AgentPlanSnapshot,
  mapping: Map<string, TaskMirrorBindingRecord>
): AgentPlanSnapshot {
  const items = snapshot.items.map((item) => {
    const binding = mapping.get(item.sourceKey);
    if (!binding) {
      throw new Error(`TASK_MIRROR_BINDING_RESOLUTION_MISSING sourceKey=${item.sourceKey}`);
    }
    return { ...item, sourceKey: binding.canonicalSourceKey };
  });
  const current = snapshot.currentSourceKey ? mapping.get(snapshot.currentSourceKey) : undefined;
  return {
    ...snapshot,
    items,
    ...(current
      ? { currentSourceKey: current.canonicalSourceKey }
      : { currentSourceKey: undefined }),
  };
}

function resolvedReplaySnapshot(
  snapshot: AgentPlanSnapshot,
  event: TaskMirrorBindingEvent
): AgentPlanSnapshot | undefined {
  const byRaw = new Map(
    event.snapshotItems.map((item) => [item.rawSourceKey, item.canonicalSourceKey])
  );
  const items: AgentPlanItem[] = [];
  for (const item of snapshot.items) {
    const canonical = byRaw.get(item.sourceKey);
    if (!canonical) {
      return undefined;
    }
    items.push({ ...item, sourceKey: canonical });
  }
  return {
    ...snapshot,
    items,
    ...(event.currentCanonicalSourceKey
      ? { currentSourceKey: event.currentCanonicalSourceKey }
      : { currentSourceKey: undefined }),
  };
}

function bindingAliasMap(
  bindings: TaskMirrorBindingRecord[]
): Map<string, TaskMirrorBindingRecord> {
  const aliases = new Map<string, TaskMirrorBindingRecord>();
  for (const binding of bindings) {
    for (const alias of binding.rawSourceKeys) {
      const previous = aliases.get(alias);
      if (previous && previous.bindingId !== binding.bindingId) {
        throw new Error(`TASK_MIRROR_BINDING_ALIAS_COLLISION sourceKey=${alias}`);
      }
      aliases.set(alias, binding);
    }
  }
  return aliases;
}

function latestScopeEvent(
  events: TaskMirrorBindingEvent[],
  scopeKey: string,
  eventKind?: 'plan' | 'visible_result'
): TaskMirrorBindingEvent | undefined {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (
      event?.scopeKey === scopeKey &&
      (eventKind === undefined || (event.eventKind ?? 'plan') === eventKind)
    ) {
      return event;
    }
  }
  return undefined;
}

export class TaskMirrorBindingStore {
  constructor(private readonly project: BindingProject) {}

  projection(): TaskMirrorBindingProjection {
    return projectMirrorBindingEvents(
      this.project.id,
      readBindingEvents(mirrorBindingLogPath(this.project), false)
    );
  }

  async correlate(input: AgentPlanSnapshot): Promise<TaskMirrorBindingCorrelationResult> {
    const snapshot = normalizeTaskMirrorSnapshot(input);
    if (snapshot.projectId !== this.project.id) {
      throw new Error(
        `TASK_MIRROR_BINDING_PROJECT_MISMATCH expected=${this.project.id} actual=${snapshot.projectId}`
      );
    }
    const scopeKey = taskMirrorBindingScopeKey(snapshot);
    const token = await acquireBindingLock(this.project);
    try {
      const file = mirrorBindingLogPath(this.project);
      const events = readBindingEvents(file, true);
      const digest = taskMirrorSnapshotDigest(snapshot);
      const previousSameSource = events.find(
        (event) => event.scopeKey === scopeKey && event.sourceEventId === snapshot.sourceEventId
      );
      if (previousSameSource) {
        if (previousSameSource.snapshotDigest !== digest) {
          return {
            diagnostics: [
              diagnostic(
                snapshot,
                'TASK_MIRROR_BINDING_SOURCE_EVENT_COLLISION',
                'The same native sourceEventId was observed with different plan content'
              ),
            ],
            replay: false,
            persisted: false,
            ignored: true,
            scopeKey,
          };
        }
        const replaySnapshot = resolvedReplaySnapshot(snapshot, previousSameSource);
        if (!replaySnapshot) {
          return {
            diagnostics: [
              diagnostic(
                snapshot,
                'TASK_MIRROR_BINDING_REPLAY_MAPPING_INVALID',
                'Persisted replay mapping does not match the native snapshot'
              ),
            ],
            replay: true,
            persisted: false,
            ignored: true,
            scopeKey,
          };
        }
        return {
          snapshot: replaySnapshot,
          diagnostics: [],
          replay: true,
          persisted: false,
          ignored: false,
          scopeKey,
          bindings: previousSameSource.bindings,
        };
      }

      const previousEvent = latestScopeEvent(events, scopeKey, 'plan');
      const pendingResultEvent = latestScopeEvent(events, scopeKey, 'visible_result');
      const previousSequence = numericSequence(previousEvent?.sourceSequence);
      const nextSequence = numericSequence(snapshot.sourceSequence);
      if (previousSequence !== undefined && nextSequence !== undefined) {
        if (nextSequence < previousSequence) {
          return {
            diagnostics: [
              diagnostic(
                snapshot,
                'TASK_MIRROR_BINDING_STALE_SOURCE_SEQUENCE',
                `Native source sequence regressed from ${previousSequence} to ${nextSequence}`
              ),
            ],
            replay: false,
            persisted: false,
            ignored: true,
            scopeKey,
          };
        }
        if (nextSequence === previousSequence) {
          return {
            diagnostics: [
              diagnostic(
                snapshot,
                'TASK_MIRROR_BINDING_SOURCE_SEQUENCE_COLLISION',
                `Different native events reported the same source sequence ${nextSequence}`
              ),
            ],
            replay: false,
            persisted: false,
            ignored: true,
            scopeKey,
          };
        }
      }

      const priorBindings = new Map<string, TaskMirrorBindingRecord>();
      for (const binding of previousEvent?.bindings ?? []) {
        priorBindings.set(binding.bindingId, cloneBinding(binding));
      }
      const aliases = bindingAliasMap([...priorBindings.values()]);
      const assignments = new Map<string, TaskMirrorBindingRecord>();
      const usedBindings = new Set<string>();

      for (const item of snapshot.items) {
        const direct = aliases.get(item.sourceKey);
        if (!direct) {
          continue;
        }
        assignments.set(item.sourceKey, direct);
        usedBindings.add(direct.bindingId);
      }

      const previousVisibleIds = new Set(
        previousEvent?.snapshotItems.map((item) => item.bindingId) ?? []
      );
      if (snapshot.currentSourceKey && !assignments.has(snapshot.currentSourceKey)) {
        const previousCurrent = [...priorBindings.values()].find(
          (binding) => binding.canonicalSourceKey === previousEvent?.currentCanonicalSourceKey
        );
        const currentItem = snapshot.items.find(
          (item) => item.sourceKey === snapshot.currentSourceKey
        );
        if (
          previousCurrent &&
          currentItem &&
          previousVisibleIds.has(previousCurrent.bindingId) &&
          !usedBindings.has(previousCurrent.bindingId) &&
          safeRenameLifecycle(previousCurrent.status, currentItem.status)
        ) {
          assignments.set(currentItem.sourceKey, previousCurrent);
          usedBindings.add(previousCurrent.bindingId);
        }
      }

      const unmatchedItems = snapshot.items.filter((item) => !assignments.has(item.sourceKey));
      const unmatchedPrevious = [...priorBindings.values()].filter(
        (binding) =>
          previousVisibleIds.has(binding.bindingId) && !usedBindings.has(binding.bindingId)
      );
      const diagnostics: TaskMirrorBindingDiagnostic[] = [];
      if (unmatchedItems.length === 1 && unmatchedPrevious.length === 1) {
        const item = unmatchedItems[0]!;
        const previous = unmatchedPrevious[0]!;
        if (safeRenameLifecycle(previous.status, item.status)) {
          assignments.set(item.sourceKey, previous);
          usedBindings.add(previous.bindingId);
        }
      } else if (unmatchedItems.length > 0 && unmatchedPrevious.length > 0) {
        const renameRelevant = unmatchedPrevious.some(
          (binding) => binding.status === 'in_progress' || binding.status === 'blocked'
        );
        if (renameRelevant) {
          diagnostics.push(
            diagnostic(
              snapshot,
              'TASK_MIRROR_BINDING_RENAME_AMBIGUOUS',
              'Multiple unmatched native items prevent safe rename correlation; new bindings will be created'
            )
          );
        }
      }

      for (const item of snapshot.items) {
        if (!assignments.has(item.sourceKey)) {
          const created = createdBinding(snapshot, scopeKey, item);
          assignments.set(item.sourceKey, created);
          priorBindings.set(created.bindingId, created);
        }
      }

      for (const item of snapshot.items) {
        const assigned = assignments.get(item.sourceKey)!;
        const existed = priorBindings.get(assigned.bindingId);
        const updated =
          existed && existed.firstSourceEventId !== snapshot.sourceEventId
            ? updatedBinding(existed, item, snapshot)
            : assigned;
        priorBindings.set(updated.bindingId, updated);
        assignments.set(item.sourceKey, updated);
      }

      const snapshotItems: TaskMirrorBindingSnapshotItem[] = snapshot.items.map((item) => {
        const binding = assignments.get(item.sourceKey)!;
        return {
          rawSourceKey: item.sourceKey,
          canonicalSourceKey: binding.canonicalSourceKey,
          bindingId: binding.bindingId,
        };
      });
      const currentBinding = snapshot.currentSourceKey
        ? assignments.get(snapshot.currentSourceKey)
        : undefined;
      const pendingResult = pendingResultEvent?.visibleResult;
      if (pendingResult?.sourceKey) {
        const pendingBinding = [...priorBindings.values()].find((binding) =>
          binding.rawSourceKeys.includes(pendingResult.sourceKey!)
        );
        if (pendingBinding && !pendingBinding.visibleResult) {
          priorBindings.set(pendingBinding.bindingId, {
            ...pendingBinding,
            visibleResult: pendingResult,
          });
        }
      }
      const bindings = [...priorBindings.values()].sort((left, right) =>
        left.bindingId.localeCompare(right.bindingId)
      );
      const eventId = sha256(
        [snapshot.projectId, scopeKey, snapshot.sourceEventId, digest].join('\u0000')
      );
      const event: TaskMirrorBindingEvent = {
        version: 1,
        eventId,
        projectId: snapshot.projectId,
        scopeKey,
        provider: snapshot.provider,
        agentId: snapshot.agentId,
        nativeSessionId: snapshot.nativeSessionId,
        ...(snapshot.planId ? { planId: snapshot.planId } : {}),
        sourceEventId: snapshot.sourceEventId,
        ...(snapshot.sourceSequence !== undefined
          ? { sourceSequence: snapshot.sourceSequence }
          : {}),
        observedAt: snapshot.observedAt,
        snapshotDigest: digest,
        snapshotItems,
        ...(currentBinding ? { currentCanonicalSourceKey: currentBinding.canonicalSourceKey } : {}),
        bindings,
        eventKind: 'plan',
      };
      appendBindingEvent(file, event);
      const nextEvents = [...events, event];
      atomicWrite(
        mirrorBindingProjectionPath(this.project),
        projectMirrorBindingEvents(this.project.id, nextEvents)
      );
      return {
        snapshot: resolvedSnapshot(snapshot, assignments),
        diagnostics,
        replay: false,
        persisted: true,
        ignored: false,
        scopeKey,
        bindings,
      };
    } finally {
      releaseBindingLock(this.project, token);
    }
  }

  async correlateVisibleResult(
    result: import('./completion-snapshot.js').NativeVisibleCompletionResult
  ): Promise<import('./mirror-binding-types.js').TaskMirrorVisibleResultCorrelationResult> {
    if (result.projectId !== this.project.id) {
      throw new Error(
        `TASK_MIRROR_BINDING_PROJECT_MISMATCH expected=${this.project.id} actual=${result.projectId}`
      );
    }
    const scopeKey = sha256(
      [result.projectId, result.provider, result.nativeSessionId, result.planId ?? ''].join(
        '\u0000'
      )
    ).slice(0, 40);
    const token = await acquireBindingLock(this.project);
    try {
      const file = mirrorBindingLogPath(this.project);
      const events = readBindingEvents(file, true);
      const previousEvent = latestScopeEvent(events, scopeKey, 'plan');
      const diagnostics: TaskMirrorBindingDiagnostic[] = [];
      if (!previousEvent) {
        if (!result.sourceKey) {
          diagnostics.push({
            provider: result.provider,
            sourceEventId: result.sourceEventId,
            code: 'TASK_MIRROR_VISIBLE_RESULT_AMBIGUOUS',
            message:
              'Visible result has no explicit native source key before a plan binding exists',
          });
          return { diagnostics, persisted: false, ignored: true, scopeKey };
        }
        const existingPending = latestScopeEvent(events, scopeKey, 'visible_result');
        if (existingPending?.visibleResult?.digest === result.digest) {
          return {
            result: existingPending.visibleResult,
            diagnostics,
            persisted: false,
            ignored: false,
            scopeKey,
          };
        }
        const event: TaskMirrorBindingEvent = {
          version: 1,
          eventId: sha256(
            [result.projectId, scopeKey, result.sourceEventId, result.digest].join('\\u0000')
          ),
          projectId: result.projectId,
          scopeKey,
          provider: result.provider,
          agentId: result.agentId,
          nativeSessionId: result.nativeSessionId,
          ...(result.planId ? { planId: result.planId } : {}),
          sourceEventId: result.sourceEventId,
          observedAt: result.observedAt,
          snapshotDigest: result.digest,
          snapshotItems: [],
          bindings: [],
          visibleResult: result,
          eventKind: 'visible_result',
        };
        appendBindingEvent(file, event);
        atomicWrite(
          mirrorBindingProjectionPath(this.project),
          projectMirrorBindingEvents(this.project.id, [...events, event])
        );
        return { result, diagnostics, persisted: true, ignored: false, scopeKey };
      }
      const aliases = bindingAliasMap(previousEvent.bindings);
      const explicitBinding = result.sourceKey
        ? (aliases.get(result.sourceKey) ??
          previousEvent.bindings.find((item) => item.canonicalSourceKey === result.sourceKey))
        : undefined;
      const candidates = previousEvent.bindings.filter(
        (item) => item.status === 'completed' || item.status === 'in_progress'
      );
      const binding = explicitBinding ?? (candidates.length === 1 ? candidates[0] : undefined);
      if (!binding) {
        diagnostics.push({
          provider: result.provider,
          sourceEventId: result.sourceEventId,
          code: 'TASK_MIRROR_VISIBLE_RESULT_AMBIGUOUS',
          message: 'Visible result does not carry an unambiguous bound native source key',
        });
        return { diagnostics, persisted: false, ignored: true, scopeKey };
      }
      const existing = binding.visibleResult;
      if (existing && existing.digest === result.digest) {
        return {
          canonicalSourceKey: binding.canonicalSourceKey,
          binding,
          result: existing,
          diagnostics,
          persisted: false,
          ignored: false,
          scopeKey,
          bindings: previousEvent.bindings,
        };
      }
      if (existing && result.observedAt <= existing.observedAt) {
        diagnostics.push({
          provider: result.provider,
          sourceEventId: result.sourceEventId,
          code: 'TASK_MIRROR_VISIBLE_RESULT_STALE',
          message: 'Older visible result cannot replace a newer correlated result',
        });
        return { diagnostics, persisted: false, ignored: true, scopeKey };
      }
      const bindings = previousEvent.bindings.map((item) => {
        if (item.bindingId !== binding.bindingId) {
          return cloneBinding(item);
        }
        return {
          ...cloneBinding(item),
          visibleResult: result,
        };
      });
      const event: TaskMirrorBindingEvent = {
        version: 1,
        eventId: sha256(
          [result.projectId, scopeKey, result.sourceEventId, result.digest].join('\\u0000')
        ),
        projectId: result.projectId,
        scopeKey,
        provider: result.provider,
        agentId: result.agentId,
        nativeSessionId: result.nativeSessionId,
        ...(result.planId ? { planId: result.planId } : {}),
        sourceEventId: result.sourceEventId,
        observedAt: result.observedAt,
        snapshotDigest: previousEvent.snapshotDigest,
        snapshotItems: previousEvent.snapshotItems,
        ...(previousEvent.currentCanonicalSourceKey
          ? { currentCanonicalSourceKey: previousEvent.currentCanonicalSourceKey }
          : {}),
        bindings,
        visibleResult: result,
        eventKind: 'visible_result',
      };
      appendBindingEvent(file, event);
      atomicWrite(
        mirrorBindingProjectionPath(this.project),
        projectMirrorBindingEvents(this.project.id, [...events, event])
      );
      return {
        canonicalSourceKey: binding.canonicalSourceKey,
        binding,
        result,
        diagnostics,
        persisted: true,
        ignored: false,
        scopeKey,
        bindings,
      };
    } finally {
      releaseBindingLock(this.project, token);
    }
  }

  rebuildProjection(): TaskMirrorBindingProjection {
    const projection = projectMirrorBindingEvents(
      this.project.id,
      readBindingEvents(mirrorBindingLogPath(this.project), true)
    );
    atomicWrite(mirrorBindingProjectionPath(this.project), projection);
    return projection;
  }
}
