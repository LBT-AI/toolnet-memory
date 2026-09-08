import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';
import {
  planCompositeRetrieval,
  type CompositeRetrievalResult,
} from '../../src/work-continuity/composite-retrieval.js';
import {
  readRetrievalTelemetry,
  recordRetrievalTelemetry,
  recordRetrievalTelemetryError,
  RETRIEVAL_TELEMETRY_FORBIDDEN_KEYS,
  retrievalTelemetryPath,
  summarizeRetrievalTelemetry,
} from '../../src/work-continuity/retrieval-telemetry.js';

const roots: string[] = [];
const originalTelemetry = process.env.TOOLNET_RETRIEVAL_TELEMETRY;

function project(): ProjectManifest {
  const root = mkdtempSync(join(tmpdir(), 'toolnet-phase63-'));
  roots.push(root);
  mkdirSync(join(root, '.toolnet'), { recursive: true });
  return {
    id: `phase63-${roots.length}`,
    name: 'phase63-test',
    rootPath: root,
    createdAt: '2026-09-08T00:00:00.000Z',
    updatedAt: '2026-09-08T00:00:00.000Z',
    graphVersion: 1,
    memoryVersion: 1,
  };
}

function result(
  question: string,
  options: {
    source?: 'composite' | 'persistent-tasks' | 'none';
    answer?: string;
    attemptedSources?: string[];
  } = {}
): CompositeRetrievalResult {
  const plan = planCompositeRetrieval(question);
  const source = options.source ?? (plan.mode === 'composite' ? 'composite' : 'persistent-tasks');
  const answer = options.answer ?? 'SAFE ANSWER';
  return {
    question,
    mode: plan.mode,
    plan,
    route: plan.primaryRoute,
    answer,
    source,
    attemptedSources: (options.attemptedSources ??
      plan.sources) as CompositeRetrievalResult['attemptedSources'],
    fragments:
      source === 'none'
        ? []
        : plan.steps.map((step, index) => ({
            index,
            intent: step.intent,
            source: step.source,
            authority: step.authority,
            label: step.label,
            answer: 'SAFE FRAGMENT',
            resultCount: 1,
          })),
    conflicts: [],
    stats: {
      attempted: plan.sources.length,
      successfulSource: source,
      resultCount: source === 'none' ? 0 : 1,
    },
  };
}

afterEach(() => {
  if (originalTelemetry === undefined) {
    delete process.env.TOOLNET_RETRIEVAL_TELEMETRY;
  } else {
    process.env.TOOLNET_RETRIEVAL_TELEMETRY = originalTelemetry;
  }
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('Phase 63 retrieval telemetry', () => {
  it('stores structural metrics without question or answer content', () => {
    const manifest = project();
    const secretQuestion = 'SECRET_QUESTION_847261';
    const secretAnswer = 'SECRET_ANSWER_938272';
    recordRetrievalTelemetry(manifest, result(secretQuestion, { answer: secretAnswer }), {
      surface: 'cli',
      durationMs: 42.25,
      occurredAt: '2026-09-08T10:00:00.000Z',
    });
    const file = retrievalTelemetryPath(manifest);
    const raw = readFileSync(file, 'utf8');
    expect(raw).not.toContain(secretQuestion);
    expect(raw).not.toContain(secretAnswer);
    for (const forbidden of RETRIEVAL_TELEMETRY_FORBIDDEN_KEYS) {
      expect(raw).not.toContain(`"${forbidden}"`);
    }
    const events = readRetrievalTelemetry(manifest);
    expect(events).toHaveLength(1);
    expect(events[0]?.surface).toBe('cli');
    expect(events[0]?.durationMs).toBe(42.25);
    expect(events[0]?.answerChars).toBe(secretAnswer.length);
  });

  it('records only safe error codes and never raw error messages', () => {
    const manifest = project();
    const plan = planCompositeRetrieval('task hiện tại là gì?');
    recordRetrievalTelemetryError(manifest, plan, {
      surface: 'mcp',
      durationMs: 15,
      error: new Error('secret_password=abc TASK_STORAGE_FAILURE /private/path'),
    });
    const raw = readFileSync(retrievalTelemetryPath(manifest), 'utf8');
    expect(raw).not.toContain('secret_password');
    expect(raw).not.toContain('/private/path');
    const events = readRetrievalTelemetry(manifest);
    expect(events[0]?.outcome).toBe('error');
    expect(events[0]?.errorCode).toBe('TASK_STORAGE_FAILURE');
  });

  it('summarizes CLI and MCP real-world usage without raw content', () => {
    const manifest = project();
    recordRetrievalTelemetry(manifest, result('task hiện tại là gì?'), {
      surface: 'cli',
      durationMs: 20,
      occurredAt: '2026-09-08T10:00:00.000Z',
    });
    recordRetrievalTelemetry(
      manifest,
      result('task hiện tại là gì và deploy production verified chưa?'),
      {
        surface: 'mcp',
        durationMs: 80,
        occurredAt: '2026-09-08T11:00:00.000Z',
      }
    );
    const summary = summarizeRetrievalTelemetry(manifest, {
      now: Date.parse('2026-09-08T12:00:00.000Z'),
      windowHours: 24,
    });
    expect(summary.eventsInWindow).toBe(2);
    expect(summary.success).toBe(2);
    expect(summary.averageDurationMs).toBe(50);
    expect(summary.bySurface.cli).toBe(1);
    expect(summary.bySurface.mcp).toBe(1);
    expect(summary.sourceBudgetViolations).toBe(0);
  });

  it('can be disabled without changing retrieval behavior', () => {
    const manifest = project();
    process.env.TOOLNET_RETRIEVAL_TELEMETRY = '0';
    const written = recordRetrievalTelemetry(manifest, result('task hiện tại là gì?'), {
      surface: 'cli',
      durationMs: 10,
    });
    expect(written).toBe(false);
    expect(existsSync(retrievalTelemetryPath(manifest))).toBe(false);
  });

  it('bounds telemetry growth through local compaction', () => {
    const manifest = project();
    for (let index = 0; index < 40; index += 1) {
      recordRetrievalTelemetry(manifest, result('task hiện tại là gì?'), {
        surface: 'cli',
        durationMs: index,
        maxBytes: 1_024,
        maxEvents: 10,
      });
    }
    const events = readRetrievalTelemetry(manifest);
    expect(events.length).toBeLessThanOrEqual(10);
    expect(events.length).toBeGreaterThan(0);
  });
});
