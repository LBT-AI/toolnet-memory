import { describe, expect, it } from 'vitest';
import { MemoryEngine } from '../../src/core/memory-engine.js';
import type { MemoryRecord, MemoryType } from '../../src/core/types.js';
import {
  ConflictDetector,
  memoryConflictKind,
  memoryLifecycleState,
} from '../../src/memory/conflict-detector.js';
import { isMemoryActive } from '../../src/memory/decay.js';
function record(input: {
  id: string;
  kind: string;
  content: string;
  createdAt?: string;
  type?: MemoryType;
  topic?: string;
  entity?: string;
  userExplicit?: boolean;
  sourceVerified?: boolean;
  testVerified?: boolean;
  assistantDerived?: boolean;
  confidence?: number;
}): MemoryRecord {
  const createdAt = input.createdAt ?? '2026-01-01T00:00:00.000Z';
  const type =
    input.type ??
    (input.kind === 'rule'
      ? 'rule'
      : input.kind === 'decision' || input.kind === 'architecture'
        ? 'decision'
        : input.kind === 'todo' || input.kind === 'next_action'
          ? 'todo'
          : 'code');
  return {
    id: input.id,
    projectId: 'project',
    type,
    content: input.content,
    importance: 'normal',
    importanceScore: 50,
    tags: [`kind:${input.kind}`],
    source: 'test',
    createdAt,
    updatedAt: createdAt,
    metadata: {
      conflictKind: input.kind,
      lifecycleState: 'active',
      topic: input.topic,
      entity: input.entity,
      confidence: input.confidence ?? 0.9,
      evidence: {
        userExplicit: input.userExplicit ?? false,
        sourceVerified: input.sourceVerified ?? false,
        testVerified: input.testVerified ?? false,
        crossSessionConfirmations: 1,
        assistantDerived: input.assistantDerived ?? false,
      },
    },
  };
}
describe('Phase 22 Conflict Engine V2', () => {
  it('keeps explicit user rule authority', () => {
    const detector = new ConflictDetector();
    const old = record({
      id: 'old-rule',
      kind: 'rule',
      topic: 'database',
      content: 'Always use PostgreSQL',
      userExplicit: true,
    });
    const next = record({
      id: 'assistant-rule',
      kind: 'rule',
      topic: 'database',
      content: 'Use MySQL instead',
      assistantDerived: true,
      createdAt: '2026-01-02T00:00:00.000Z',
    });
    const result = detector.resolve(next, [old]);
    expect(result.conflicts.map((item) => item.id)).toEqual(['old-rule']);
    expect(result.superseded).toEqual([]);
  });
  it('supersedes older todo with newer related next action', () => {
    const detector = new ConflictDetector();
    const old = record({
      id: 'todo-1',
      kind: 'todo',
      entity: 'auth-redirect',
      content: 'Need to fix auth redirect',
    });
    const next = record({
      id: 'next-1',
      kind: 'next_action',
      entity: 'auth-redirect',
      content: 'Next step fix auth redirect',
      createdAt: '2026-01-02T00:00:00.000Z',
    });
    const result = detector.resolve(next, [old]);
    expect(result.superseded.map((item) => item.id)).toEqual(['todo-1']);
  });
  it('verified fix completes related todo', () => {
    const detector = new ConflictDetector();
    const todo = record({
      id: 'todo',
      kind: 'todo',
      entity: 'auth-redirect',
      content: 'Fix auth redirect',
    });
    const fix = record({
      id: 'fix',
      kind: 'fix',
      entity: 'auth-redirect',
      content: 'Auth redirect fixed and tests pass',
      testVerified: true,
      sourceVerified: true,
      createdAt: '2026-01-02T00:00:00.000Z',
    });
    const result = detector.resolve(fix, [todo]);
    expect(result.completed.map((item) => item.id)).toEqual(['todo']);
    expect(result.conflicts).toEqual([]);
  });
  it('unverified assistant fix does not silently close task', () => {
    const detector = new ConflictDetector();
    const todo = record({
      id: 'todo',
      kind: 'todo',
      entity: 'deploy',
      content: 'Need to fix deploy',
      userExplicit: true,
    });
    const fix = record({
      id: 'fix',
      kind: 'fix',
      entity: 'deploy',
      content: 'Deploy fixed',
      assistantDerived: true,
      createdAt: '2026-01-02T00:00:00.000Z',
    });
    const result = detector.resolve(fix, [todo]);
    expect(result.completed).toEqual([]);
    expect(result.conflicts.map((item) => item.id)).toEqual(['todo']);
  });
  it('newer equal-authority context supersedes old context', () => {
    const detector = new ConflictDetector();
    const old = record({
      id: 'context-old',
      kind: 'context',
      topic: 'api-port',
      content: 'API runs on port 3000',
    });
    const next = record({
      id: 'context-new',
      kind: 'context',
      topic: 'api-port',
      content: 'API runs on port 4000',
      createdAt: '2026-01-02T00:00:00.000Z',
    });
    expect(detector.resolve(next, [old]).superseded.map((item) => item.id)).toEqual([
      'context-old',
    ]);
  });
  it('verified fix can resolve related context', () => {
    const detector = new ConflictDetector();
    const old = record({
      id: 'ctx',
      kind: 'context',
      topic: 'proxy-error',
      content: 'Proxy connection is failing',
      confidence: 0.8,
    });
    const fix = record({
      id: 'fix',
      kind: 'fix',
      topic: 'proxy-error',
      content: 'Proxy connection issue resolved',
      sourceVerified: true,
      testVerified: true,
      createdAt: '2026-01-02T00:00:00.000Z',
    });
    expect(detector.resolve(fix, [old]).resolved.map((item) => item.id)).toEqual(['ctx']);
  });
  it('handles architecture as its own conflict kind', () => {
    const architecture = record({
      id: 'architecture',
      kind: 'architecture',
      type: 'decision',
      content: 'Use append-only operation log',
    });
    expect(memoryConflictKind(architecture)).toBe('architecture');
  });
  it('completed/conflicting states are not normal active memory', () => {
    const completed = record({
      id: 'completed',
      kind: 'todo',
      content: 'Fix auth',
    });
    completed.metadata = {
      ...completed.metadata,
      lifecycleState: 'completed',
    };
    const conflicting = record({
      id: 'conflicting',
      kind: 'fix',
      content: 'Auth fixed',
    });
    conflicting.metadata = {
      ...conflicting.metadata,
      lifecycleState: 'conflicting',
    };
    expect(isMemoryActive(completed)).toBe(false);
    expect(isMemoryActive(conflicting)).toBe(false);
  });
  it('memory engine transitions todo to completed after verified fix', () => {
    const engine = new MemoryEngine();
    const todo = engine.remember({
      projectId: 'project',
      type: 'todo',
      content: 'Fix authentication redirect',
      tags: ['kind:todo', 'entity:auth-redirect'],
      metadata: {
        conflictKind: 'todo',
        entity: 'auth-redirect',
        evidence: {
          userExplicit: true,
          sourceVerified: false,
          testVerified: false,
          crossSessionConfirmations: 1,
          assistantDerived: false,
        },
      },
    });
    const fix = engine.remember({
      projectId: 'project',
      type: 'code',
      content: 'Authentication redirect fixed and tests pass',
      tags: ['kind:fix', 'entity:auth-redirect'],
      metadata: {
        conflictKind: 'fix',
        entity: 'auth-redirect',
        evidence: {
          userExplicit: false,
          sourceVerified: true,
          testVerified: true,
          crossSessionConfirmations: 1,
          assistantDerived: true,
        },
      },
    });
    const closed = engine.get(todo.id)!;
    expect(memoryLifecycleState(closed)).toBe('completed');
    expect(closed.metadata?.completedBy).toBe(fix.id);
    expect(engine.list('project').some((memory) => memory.id === todo.id)).toBe(false);
  });
  it('resolution is deterministic for fixed records', () => {
    const detector = new ConflictDetector();
    const oldA = record({
      id: 'a',
      kind: 'context',
      topic: 'port',
      content: 'Port is 3000',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    const unrelated = record({
      id: 'b',
      kind: 'context',
      topic: 'database',
      content: 'Database is PostgreSQL',
    });
    const next = record({
      id: 'next',
      kind: 'context',
      topic: 'port',
      content: 'Port is 4000',
      createdAt: '2026-01-02T00:00:00.000Z',
    });
    const first = detector.resolve(next, [oldA, unrelated]);
    const second = detector.resolve(next, [unrelated, oldA]);
    expect(first.superseded.map((item) => item.id).sort()).toEqual(
      second.superseded.map((item) => item.id).sort()
    );
    expect(first.conflicts.map((item) => item.id).sort()).toEqual(
      second.conflicts.map((item) => item.id).sort()
    );
  });
});
