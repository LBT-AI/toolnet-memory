import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { ProjectManifest } from '../core/types.js';
import type { HandoffStateV2 } from './handoff-state.js';

import { evaluateHandoffQuality, type HandoffQuality } from './handoff-quality.js';

export type StructuredHandoffDetail = 'compact' | 'normal' | 'benchmark';

export interface StructuredHandoff {
  currentState: string[];
  completed: string[];
  evidence: string[];
  filesTouched: string[];
  blockers: string[];
  nextAction: string[];
}

export interface StructuredHandoffResult {
  detail: StructuredHandoffDetail;

  data: StructuredHandoff;

  quality: HandoffQuality;

  text: string;
}

interface DetailLimits {
  completed: number;
  evidence: number;
  files: number;
  blockers: number;
  maxChars: number;
}

const DETAIL_LIMITS: Record<StructuredHandoffDetail, DetailLimits> = {
  compact: {
    completed: 3,
    evidence: 3,
    files: 5,
    blockers: 2,
    maxChars: 1800,
  },

  normal: {
    completed: 10,
    evidence: 10,
    files: 15,
    blockers: 5,
    maxChars: 4200,
  },

  benchmark: {
    completed: 30,
    evidence: 30,
    files: 40,
    blockers: 10,
    maxChars: 10000,
  },
};

function compact(values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const raw of values) {
    const value = raw?.replace(/\s+/gu, ' ').trim();

    if (!value) {
      continue;
    }

    const key = value.normalize('NFKC').toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push(value);
  }

  return output;
}

function render(values: string[]): string {
  return values.length > 0 ? values.map((value) => `- ${value}`).join('\n') : '- none';
}

function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }

  return [text.slice(0, maxChars).trimEnd(), '', '[Structured handoff truncated]'].join('\n');
}

export function detectStructuredHandoffDetail(
  question: string,
  requested?: StructuredHandoffDetail
): StructuredHandoffDetail {
  if (requested) {
    return requested;
  }

  const value = question.normalize('NFKC').toLowerCase().replace(/\s+/gu, ' ').trim();

  if (
    /\bbenchmark\b/u.test(value) ||
    /\bdeep handoff\b/u.test(value) ||
    /\bfull handoff\b/u.test(value) ||
    /\btakeover\b/u.test(value) ||
    /\btake over\b/u.test(value) ||
    /tiếp quản/u.test(value) ||
    /bằng chứng đầy đủ/u.test(value) ||
    /evidence.*(?:file|test|command)/u.test(value)
  ) {
    return 'benchmark';
  }

  if (
    /\bcompact\b/u.test(value) ||
    /\bbrief\b/u.test(value) ||
    /ngắn gọn/u.test(value) ||
    /tóm tắt ngắn/u.test(value)
  ) {
    return 'compact';
  }

  return 'normal';
}

export function buildStructuredHandoff(
  state: HandoffStateV2,
  detail: StructuredHandoffDetail = 'normal'
): StructuredHandoff {
  const limits = DETAIL_LIMITS[detail];

  const currentState = compact([
    `Source agent: ${state.source.agent}`,
    `Captured: ${state.capturedAt}`,

    state.goal ? `Goal: ${state.goal}` : undefined,

    state.request ? `Request: ${state.request}` : undefined,

    state.activity ? `Activity: ${state.activity}` : undefined,

    state.current.phase
      ? `Phase: ${state.current.phase.title} [${state.current.phase.status}]`
      : undefined,

    state.current.task
      ? `Task: ${state.current.task.title} [${state.current.task.status}]`
      : undefined,

    state.current.file ? `Current file: ${state.current.file}` : undefined,

    `Progress: ${JSON.stringify(state.progress)}`,
  ]);

  const completed = compact([
    ...state.completed.phases.map((value) => `Phase: ${value}`),

    ...state.completed.tasks.map((value) => `Task: ${value}`),
  ]).slice(0, limits.completed);

  const evidence = compact([
    `Tests status: ${state.tests.status}`,

    ...state.tests.recent.map((value) => `Test: ${value}`),

    ...(state.tests.checks ?? []).map(
      (check) => `Check [${check.status}] ${check.kind}: ${check.command}`
    ),

    ...(state.evidence?.commands ?? []).map((value) => `Command: ${value}`),

    ...(state.evidence?.references ?? []).map((value) => `Reference: ${value}`),

    ...state.decisions.map((value) => `Decision: ${value}`),

    ...state.attention.map((value) => `Attention: ${value}`),
  ]).slice(0, limits.evidence);

  const filesTouched = compact([
    state.files.current,

    ...(state.files.active ?? []).map((value) => `Active: ${value}`),

    ...(state.files.modified ?? []).map((value) => `Modified: ${value}`),

    ...(state.files.created ?? []).map((value) => `Created: ${value}`),

    ...(state.files.deleted ?? []).map((value) => `Deleted: ${value}`),

    ...state.files.recent.map((value) => `Recent: ${value}`),
  ]).slice(0, limits.files);

  const blockers = compact(state.blockers).slice(0, limits.blockers);

  const nextAction = compact([
    state.nextAction,

    state.nextAction ? undefined : state.remaining.todos[0],
  ]).slice(0, 1);

  return {
    currentState,
    completed,
    evidence,
    filesTouched,
    blockers,
    nextAction,
  };
}

export function formatStructuredHandoff(
  handoff: StructuredHandoff,
  detail: StructuredHandoffDetail,
  quality: HandoffQuality
): string {
  return [
    `HANDOFF_DETAIL: ${detail}`,
    `CONTINUITY_CONFIDENCE: ${quality.confidence}`,
    `QUALITY_SCORE: ${quality.score}`,
    `MISSING_CONTEXT: ${
      quality.missingContext.length > 0 ? quality.missingContext.join(', ') : 'none'
    }`,
    `QUALITY_WARNINGS: ${quality.warnings.length > 0 ? quality.warnings.join(', ') : 'none'}`,

    '',
    'CURRENT_STATE',
    render(handoff.currentState),

    '',
    'COMPLETED',
    render(handoff.completed),

    '',
    'EVIDENCE',
    render(handoff.evidence),

    '',
    'FILES_TOUCHED',
    render(handoff.filesTouched),

    '',
    'BLOCKERS',
    render(handoff.blockers),

    '',
    'NEXT_ACTION',
    render(handoff.nextAction),
  ].join('\n');
}

export function loadLatestStructuredHandoff(
  project: ProjectManifest,
  detail: StructuredHandoffDetail = 'normal'
): StructuredHandoffResult | null {
  const file = join(project.rootPath, '.toolnet', 'work', 'handoff-latest.json');

  if (!existsSync(file)) {
    return null;
  }

  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as {
      continuity?: HandoffStateV2;
    };

    const state = parsed.continuity;

    if (!state || state.schema !== 'toolnet.handoff.v2' || state.version !== 2) {
      return null;
    }

    const data = buildStructuredHandoff(state, detail);

    const quality = evaluateHandoffQuality(state);

    const text = truncateText(
      formatStructuredHandoff(data, detail, quality),
      DETAIL_LIMITS[detail].maxChars
    );

    return {
      detail,
      data,
      quality,
      text,
    };
  } catch {
    return null;
  }
}
