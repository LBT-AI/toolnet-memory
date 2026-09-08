import type { MemoryRecord, ProjectManifest } from '../core/types.js';
import { ConvergentMemoryStore } from '../multi-host/memory-projection.js';
import {
  retrieveIntentAwareAnswer,
  routeForRetrievalIntent,
  routeNeedsStorage,
  routeRetrievalIntent,
  type IntentAwareRetrievalIntent,
  type IntentAwareRetrievalOptions,
  type IntentAwareRetrievalRoute,
  type IntentAwareRetrievalSource,
} from './intent-aware-retrieval.js';

export type CompositeRetrievalMode = 'single' | 'composite';

export type RetrievalRouteOverride = (
  route: IntentAwareRetrievalRoute
) => IntentAwareRetrievalRoute;

export type CompositeRetrievalConflictCode = 'MEMORY_TASK_STATE_CONFLICT';

export interface CompositeRetrievalStep {
  index: number;
  intent: IntentAwareRetrievalIntent;
  question: string;
  route: IntentAwareRetrievalRoute;
  source: IntentAwareRetrievalSource;
  authority: number;
  label: string;
}

export interface CompositeRetrievalPlan {
  mode: CompositeRetrievalMode;
  question: string;
  maxSources: number;
  steps: CompositeRetrievalStep[];
  sources: IntentAwareRetrievalSource[];
  omittedIntents: IntentAwareRetrievalIntent[];
  primaryRoute: IntentAwareRetrievalRoute;
}

export interface CompositeRetrievalFragment {
  index: number;
  intent: IntentAwareRetrievalIntent;
  source: IntentAwareRetrievalSource;
  authority: number;
  label: string;
  answer: string;
  resultCount: number;
}

export interface CompositeRetrievalConflict {
  code: CompositeRetrievalConflictCode;
  authoritativeSource: IntentAwareRetrievalSource;
  conflictingSource: IntentAwareRetrievalSource;
  authoritativeState: string;
  conflictingState: string;
  detail: string;
}

export interface CompositeRetrievalOptions extends Omit<IntentAwareRetrievalOptions, 'route'> {
  plan?: CompositeRetrievalPlan;
  maxSources?: number;
  maxChars?: number;
}

export interface CompositeRetrievalResult {
  question: string;
  mode: CompositeRetrievalMode;
  plan: CompositeRetrievalPlan;
  /*
   * Compatibility with Phase 59 callers.
   */
  route: IntentAwareRetrievalRoute;
  answer: string;
  source: IntentAwareRetrievalSource | 'composite' | 'none';
  attemptedSources: IntentAwareRetrievalSource[];
  fragments: CompositeRetrievalFragment[];
  conflicts: CompositeRetrievalConflict[];
  stats: {
    attempted: number;
    successfulSource: IntentAwareRetrievalSource | 'composite' | 'none';
    resultCount: number;
  };
}

interface IntentCandidate {
  intent: IntentAwareRetrievalIntent;
  question: string;
  route: IntentAwareRetrievalRoute;
  firstSeen: number;
}

type DeploymentState = 'planned' | 'executed' | 'verified' | 'failed';

const INTENT_PRIORITY: Record<IntentAwareRetrievalIntent, number> = {
  current_work: 100,
  artifact: 95,
  code: 90,
  decision: 82,
  rules: 80,
  recent_state: 78,
  history: 65,
  continuity: 60,
  summary: 20,
};

const SOURCE_AUTHORITY: Record<IntentAwareRetrievalSource, number> = {
  'persistent-tasks': 500,
  'task-artifacts': 450,
  /*
   * Code is orthogonal to execution-state conflicts,
   * but ranks before Memory in merged presentation.
   */
  'code-intelligence': 350,
  'canonical-memory': 300,
  'legacy-continuity': 100,
};

const INTENT_LABELS: Record<IntentAwareRetrievalIntent, string> = {
  current_work: 'Current Work',
  artifact: 'Artifact Evidence',
  code: 'Code Intelligence',
  decision: 'Decisions',
  rules: 'Project Rules',
  recent_state: 'Recent State',
  history: 'History',
  continuity: 'Continuity',
  summary: 'Summary',
};

function normalize(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase().replace(/\s+/gu, ' ').trim();
}

function compact(value: string, max: number): string {
  const normalized = value.normalize('NFKC').trim();
  if (normalized.length <= max) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function uniqueSources(values: IntentAwareRetrievalSource[]): IntentAwareRetrievalSource[] {
  const output: IntentAwareRetrievalSource[] = [];
  const seen = new Set<IntentAwareRetrievalSource>();
  for (const value of values) {
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    output.push(value);
  }
  return output;
}

function splitQuestion(question: string): string[] {
  const parts = question
    .split(
      /(?:[,;\n]+|\?+\s+|\s+(?:và|and|plus|also|ngoài ra|đồng thời|cùng với|as well as)\s+|\s+&\s+)/giu
    )
    .map((part) => part.trim())
    .filter((part) => part.length >= 3);
  if (parts.length === 0) {
    return [question.trim()];
  }
  return parts.slice(0, 10);
}

/**
 * Phase 59 already handles almost every clause.
 *
 * This override exists only for small clause fragments whose
 * meaning becomes obvious after composite splitting.
 *
 * Example:
 *
 *   "file nào đang sửa"
 *
 * alone may otherwise look too generic.
 */
function routeClause(
  clause: string,
  routeOverride?: RetrievalRouteOverride
): IntentAwareRetrievalRoute {
  let route = routeRetrievalIntent(clause);
  if (route.intent !== 'summary') {
    return routeOverride ? routeOverride(route) : route;
  }
  const q = normalize(clause);
  if (/(?:file (?:nào )?đang (?:sửa|đụng)|current file|files? touched)/u.test(q)) {
    route = routeForRetrievalIntent('current_work', {
      confidence: 0.94,
      reasons: ['composite-current-file'],
    });
    return routeOverride ? routeOverride(route) : route;
  }
  if (
    /(?:artifact|backup|report|deploy|deployment|crawler|screenshot)/u.test(q) &&
    /(?:verified|verify|executed|failed|status|trạng thái|chạy chưa|xong chưa|đường dẫn|path)/u.test(
      q
    )
  ) {
    route = routeForRetrievalIntent('artifact', {
      confidence: 0.95,
      reasons: ['composite-artifact-state'],
    });
    return routeOverride ? routeOverride(route) : route;
  }
  if (
    /(?:class|function|hàm|symbol|module)/u.test(q) &&
    /(?:ở đâu|where|defined|định nghĩa|caller|callers)/u.test(q)
  ) {
    route = routeForRetrievalIntent('code', {
      confidence: 0.95,
      reasons: ['composite-code-location'],
    });
    return routeOverride ? routeOverride(route) : route;
  }
  return routeOverride ? routeOverride(route) : route;
}

function sourceAuthority(source: IntentAwareRetrievalSource): number {
  return SOURCE_AUTHORITY[source];
}

function labelForIntent(intent: IntentAwareRetrievalIntent): string {
  return INTENT_LABELS[intent];
}

/**
 * Build a deterministic bounded retrieval plan.
 *
 * Single-intent questions return the exact Phase 59 route.
 *
 * Composite questions:
 * - keep at most 3 distinct primary sources
 * - remove fallbacks so runtime cannot expand beyond that bound
 * - may contain multiple intents on the same source
 */
export function planCompositeRetrieval(
  question: string,
  options: {
    maxSources?: number;
    routeOverride?: RetrievalRouteOverride;
  } = {}
): CompositeRetrievalPlan {
  const normalizedQuestion = question.trim();
  const baselineFullRoute = routeRetrievalIntent(normalizedQuestion);
  const fullRoute = options.routeOverride
    ? options.routeOverride(baselineFullRoute)
    : baselineFullRoute;
  const maxSources = Math.max(1, Math.min(3, Math.trunc(options.maxSources ?? 3)));
  const clauses = splitQuestion(normalizedQuestion);
  const rawCandidates: IntentCandidate[] = clauses.map((clause, index) => {
    const route = routeClause(clause, options.routeOverride);
    return {
      intent: route.intent,
      question: clause,
      route,
      firstSeen: index,
    };
  });
  let candidates = rawCandidates.filter(
    (candidate, index, values) =>
      values.findIndex((other) => other.intent === candidate.intent) === index
  );
  const meaningful = candidates.filter((candidate) => candidate.intent !== 'summary');
  if (meaningful.length > 0) {
    candidates = meaningful;
  }
  /*
   * One intent = Phase 59 behavior exactly.
   */
  if (candidates.length <= 1) {
    const route = fullRoute;
    return {
      mode: 'single',
      question: normalizedQuestion,
      maxSources,
      steps: [
        {
          index: 0,
          intent: route.intent,
          question: normalizedQuestion,
          route,
          source: route.primarySource,
          authority: sourceAuthority(route.primarySource),
          label: labelForIntent(route.intent),
        },
      ],
      sources: [route.primarySource],
      omittedIntents: [],
      primaryRoute: route,
    };
  }
  candidates.sort(
    (left, right) =>
      INTENT_PRIORITY[right.intent] - INTENT_PRIORITY[left.intent] ||
      left.firstSeen - right.firstSeen
  );
  const steps: CompositeRetrievalStep[] = [];
  const sources = new Set<IntentAwareRetrievalSource>();
  const omittedIntents: IntentAwareRetrievalIntent[] = [];
  for (const candidate of candidates) {
    if (steps.length >= 4) {
      omittedIntents.push(candidate.intent);
      continue;
    }
    const base = routeForRetrievalIntent(candidate.intent, {
      confidence: candidate.route.confidence,
      reasons: [...candidate.route.reasons, 'composite-plan'],
    });
    const source = base.primarySource;
    const newSource = !sources.has(source);
    if (newSource && sources.size >= maxSources) {
      omittedIntents.push(candidate.intent);
      continue;
    }
    sources.add(source);
    /*
     * Composite mode has NO per-step fallback expansion.
     *
     * This is what makes the three-source budget real.
     */
    const route: IntentAwareRetrievalRoute = {
      ...base,
      fallbackSources: [],
    };
    steps.push({
      index: steps.length,
      intent: candidate.intent,
      question: candidate.question,
      route,
      source,
      authority: sourceAuthority(source),
      label: labelForIntent(candidate.intent),
    });
  }
  if (steps.length <= 1) {
    const route = fullRoute;
    return {
      mode: 'single',
      question: normalizedQuestion,
      maxSources,
      steps: [
        {
          index: 0,
          intent: route.intent,
          question: normalizedQuestion,
          route,
          source: route.primarySource,
          authority: sourceAuthority(route.primarySource),
          label: labelForIntent(route.intent),
        },
      ],
      sources: [route.primarySource],
      omittedIntents,
      primaryRoute: route,
    };
  }
  return {
    mode: 'composite',
    question: normalizedQuestion,
    maxSources,
    steps,
    sources: [...sources],
    omittedIntents,
    primaryRoute: steps[0]!.route,
  };
}

export function compositePlanNeedsStorage(plan: CompositeRetrievalPlan): boolean {
  return plan.steps.some((step) => routeNeedsStorage(step.route));
}

function dedupeFragmentLines(
  fragments: CompositeRetrievalFragment[]
): CompositeRetrievalFragment[] {
  const seen = new Set<string>();
  return fragments.map((fragment) => {
    const lines: string[] = [];
    for (const raw of fragment.answer.split(/\r?\n/u)) {
      const line = raw.trim();
      if (!line) {
        continue;
      }
      const key = normalize(line);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      lines.push(line);
    }
    return {
      ...fragment,
      answer: lines.join('\n'),
    };
  });
}

function artifactDeploymentState(
  fragments: CompositeRetrievalFragment[]
): DeploymentState | undefined {
  for (const fragment of fragments) {
    if (fragment.source !== 'task-artifacts') {
      continue;
    }
    const match = fragment.answer.match(/\[(planned|executed|verified|failed)\]\s+deploy\b/iu);
    if (match?.[1]) {
      return match[1].toLocaleLowerCase() as DeploymentState;
    }
  }
  return undefined;
}

function memoryDeploymentState(
  fragments: CompositeRetrievalFragment[]
): DeploymentState | undefined {
  const eligible = fragments.filter(
    (fragment) =>
      fragment.source === 'canonical-memory' &&
      ['recent_state', 'history', 'summary'].includes(fragment.intent)
  );
  for (const fragment of eligible) {
    const value = normalize(fragment.answer);
    /*
     * Require assertive state language.
     *
     * Do not treat rules such as
     * "deploy must be verified"
     * as claims that verification already happened.
     */
    if (
      /(?:deploy|deployment).{0,120}(?:is|was|đã|=)\s*(?:failed|failure|thất bại|lỗi)/u.test(
        value
      ) ||
      /(?:failed|failure|thất bại).{0,120}(?:deploy|deployment)/u.test(value)
    ) {
      return 'failed';
    }
    if (
      /(?:deploy|deployment).{0,120}(?:is|was|đã|=)\s*(?:verified|completed|complete|done|successful|success|xác minh|hoàn tất|xong|thành công)/u.test(
        value
      ) ||
      /(?:verified|completed|complete|done|successful|xác minh|hoàn tất|thành công).{0,120}(?:deploy|deployment)/u.test(
        value
      )
    ) {
      return 'verified';
    }
    if (
      /(?:deploy|deployment).{0,120}(?:is|was|đã|=)\s*(?:executed|deployed|run|ran|chạy|thực thi)/u.test(
        value
      )
    ) {
      return 'executed';
    }
  }
  return undefined;
}

function detectConflicts(fragments: CompositeRetrievalFragment[]): CompositeRetrievalConflict[] {
  const conflicts: CompositeRetrievalConflict[] = [];
  const artifactState = artifactDeploymentState(fragments);
  const memoryState = memoryDeploymentState(fragments);
  if (artifactState && memoryState && artifactState !== memoryState) {
    conflicts.push({
      code: 'MEMORY_TASK_STATE_CONFLICT',
      authoritativeSource: 'task-artifacts',
      conflictingSource: 'canonical-memory',
      authoritativeState: artifactState,
      conflictingState: memoryState,
      detail: [
        'Canonical Task Artifact Evidence and Memory disagree about deployment state.',
        `Artifact state=${artifactState}.`,
        `Memory state=${memoryState}.`,
        'Task Artifact Evidence wins for production execution/verification truth.',
      ].join(' '),
    });
  }
  return conflicts;
}

function renderCompositeAnswer(
  fragments: CompositeRetrievalFragment[],
  conflicts: CompositeRetrievalConflict[],
  maxChars: number
): string {
  const ordered = dedupeFragmentLines(
    [...fragments].sort(
      (left, right) => right.authority - left.authority || left.index - right.index
    )
  );
  const parts: string[] = [];
  let used = 0;
  for (const fragment of ordered) {
    if (!fragment.answer.trim()) {
      continue;
    }
    const header = `## ${fragment.label}\n`;
    const sourceLine = `\nsource: ${fragment.source}`;
    const remaining = maxChars - used - header.length - sourceLine.length - 2;
    if (remaining < 80) {
      break;
    }
    const body = compact(fragment.answer, Math.min(1_800, remaining));
    const section = `${header}${body}${sourceLine}`;
    parts.push(section);
    used += section.length + 2;
  }
  if (conflicts.length > 0) {
    const warnings = [
      '## Warnings',
      ...conflicts.map((conflict) => `- ${conflict.code}: ${conflict.detail}`),
    ].join('\n');
    if (used + warnings.length + 2 <= maxChars) {
      parts.push(warnings);
    }
  }
  return parts.join('\n\n');
}

function cachedMemoryLoader(
  project: ProjectManifest,
  options: CompositeRetrievalOptions
): (() => Promise<MemoryRecord[]>) | undefined {
  if (!options.loadMemories && !options.storage) {
    return undefined;
  }
  let promise: Promise<MemoryRecord[]> | undefined;
  return () => {
    if (!promise) {
      promise = options.loadMemories
        ? options.loadMemories()
        : new ConvergentMemoryStore(options.storage!).load(project.id);
    }
    return promise;
  };
}

/**
 * Phase 60 execution.
 *
 * Single mode delegates directly to Phase 59.
 *
 * Composite mode executes every planned intent, but never more
 * than three distinct sources.
 */
export async function retrieveCompositeAnswer(
  project: ProjectManifest,
  question: string,
  options: CompositeRetrievalOptions = {}
): Promise<CompositeRetrievalResult> {
  const plan =
    options.plan ??
    planCompositeRetrieval(question, {
      maxSources: options.maxSources,
    });
  const maxChars = Math.max(2_000, Math.min(8_000, Math.trunc(options.maxChars ?? 6_000)));
  if (plan.mode === 'single') {
    const direct = await retrieveIntentAwareAnswer(project, question, {
      ...(options.storage ? { storage: options.storage } : {}),
      ...(options.agentId ? { agentId: options.agentId } : {}),
      ...(options.now !== undefined ? { now: options.now } : {}),
      ...(options.loadMemories ? { loadMemories: options.loadMemories } : {}),
      ...(options.searchCode ? { searchCode: options.searchCode } : {}),
      route: plan.primaryRoute,
    });
    const fragments: CompositeRetrievalFragment[] =
      direct.source === 'none'
        ? []
        : [
            {
              index: 0,
              intent: direct.route.intent,
              source: direct.source,
              authority: sourceAuthority(direct.source),
              label: labelForIntent(direct.route.intent),
              answer: direct.answer,
              resultCount: direct.stats.resultCount,
            },
          ];
    return {
      question,
      mode: 'single',
      plan,
      route: direct.route,
      answer: direct.answer,
      source: direct.source,
      attemptedSources: direct.attemptedSources,
      fragments,
      conflicts: [],
      stats: {
        attempted: direct.stats.attempted,
        successfulSource: direct.stats.successfulSource,
        resultCount: direct.stats.resultCount,
      },
    };
  }
  const loadMemories = cachedMemoryLoader(project, options);
  const fragments: CompositeRetrievalFragment[] = [];
  const attempted: IntentAwareRetrievalSource[] = [];
  for (const step of plan.steps) {
    const direct = await retrieveIntentAwareAnswer(project, step.question, {
      ...(options.storage ? { storage: options.storage } : {}),
      ...(options.agentId ? { agentId: options.agentId } : {}),
      ...(options.now !== undefined ? { now: options.now } : {}),
      ...(loadMemories ? { loadMemories } : {}),
      ...(options.searchCode ? { searchCode: options.searchCode } : {}),
      route: step.route,
    });
    attempted.push(...direct.attemptedSources);
    if (direct.source === 'none' || !direct.answer.trim()) {
      continue;
    }
    fragments.push({
      index: step.index,
      intent: step.intent,
      source: direct.source,
      authority: sourceAuthority(direct.source),
      label: step.label,
      answer: direct.answer,
      resultCount: direct.stats.resultCount,
    });
  }
  const attemptedSources = uniqueSources(attempted);
  /*
   * Hard runtime invariant:
   *
   * planning + execution may never fan out to >3 sources.
   */
  if (attemptedSources.length > plan.maxSources) {
    throw new Error('COMPOSITE_RETRIEVAL_SOURCE_BUDGET_EXCEEDED');
  }
  const conflicts = detectConflicts(fragments);
  const answer =
    fragments.length > 0
      ? renderCompositeAnswer(fragments, conflicts, maxChars)
      : 'ToolNet chưa có đủ dữ liệu phù hợp cho câu hỏi này.';
  return {
    question,
    mode: 'composite',
    plan,
    route: plan.primaryRoute,
    answer,
    source: fragments.length > 0 ? 'composite' : 'none',
    attemptedSources,
    fragments,
    conflicts,
    stats: {
      attempted: attemptedSources.length,
      successfulSource: fragments.length > 0 ? 'composite' : 'none',
      resultCount: fragments.reduce((total, fragment) => total + fragment.resultCount, 0),
    },
  };
}
