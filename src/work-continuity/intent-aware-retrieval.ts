import type { MemoryRecord, ProjectManifest } from '../core/types.js';
import type { CodeChunk } from '../code-intelligence/chunks/types.js';
import { CodeFtsIndex } from '../code-intelligence/semantic/code-fts.js';
import { inspectMemoryQuality, type MemoryQualityItem } from '../memory/quality.js';
import { ConvergentMemoryStore } from '../multi-host/memory-projection.js';
import { PersistentCodeChunkStore } from '../storage/code-chunk-store.js';
import type { StorageProvider } from '../storage/types.js';
import { currentTaskArtifactLines } from '../tasks/artifact-evidence.js';
import { TaskStore } from '../tasks/store.js';
import { buildCurrentWorkProjection } from './current-work-projection.js';
import { renderCompactCurrentWork } from './context-noise-filter.js';
import { answerRetrievedMemoryQuestion } from './memory-local-answer.js';

export type IntentAwareRetrievalIntent =
  | 'current_work'
  | 'rules'
  | 'recent_state'
  | 'decision'
  | 'code'
  | 'artifact'
  | 'history'
  | 'continuity'
  | 'summary';

export type IntentAwareRetrievalSource =
  | 'persistent-tasks'
  | 'task-artifacts'
  | 'canonical-memory'
  | 'code-intelligence'
  | 'legacy-continuity';

export interface IntentAwareRetrievalRoute {
  intent: IntentAwareRetrievalIntent;
  primarySource: IntentAwareRetrievalSource;
  fallbackSources: IntentAwareRetrievalSource[];
  confidence: number;
  reasons: string[];
}

export interface IntentAwareCodeHit {
  filePath: string;
  symbolName?: string;
  startLine: number;
  endLine: number;
  content: string;
  score: number;
}

export interface IntentAwareRetrievalOptions {
  storage?: StorageProvider;
  agentId?: string;
  now?: number;
  route?: IntentAwareRetrievalRoute;
  /**
   * Injection points used by tests and future runtimes.
   *
   * They are intentionally lazy: router must never call
   * a loader whose source was not selected.
   */
  loadMemories?: () => Promise<MemoryRecord[]>;
  searchCode?: (query: string, limit: number) => Promise<IntentAwareCodeHit[]>;
}

export interface IntentAwareRetrievalResult {
  question: string;
  route: IntentAwareRetrievalRoute;
  answer: string;
  source: IntentAwareRetrievalSource | 'none';
  attemptedSources: IntentAwareRetrievalSource[];
  stats: {
    attempted: number;
    successfulSource: IntentAwareRetrievalSource | 'none';
    resultCount: number;
  };
}

interface SourceResult {
  answer: string;
  count: number;
}

interface RouteCandidate {
  intent: IntentAwareRetrievalIntent;
  score: number;
  reasons: string[];
}

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'cai',
  'các',
  'cho',
  'có',
  'của',
  'dau',
  'đâu',
  'do',
  'for',
  'gi',
  'gì',
  'how',
  'in',
  'is',
  'it',
  'là',
  'nao',
  'nào',
  'of',
  'on',
  'the',
  'thi',
  'thì',
  'to',
  'trong',
  'va',
  'và',
  'what',
  'where',
  'which',
  'why',
]);

function normalize(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase().replace(/\s+/gu, ' ').trim();
}

function compact(value: string, max = 320): string {
  const normalized = value.normalize('NFKC').replace(/\s+/gu, ' ').trim();
  if (normalized.length <= max) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function addSignal(
  candidate: RouteCandidate,
  question: string,
  pattern: RegExp,
  weight: number,
  reason: string
): void {
  if (!pattern.test(question)) {
    return;
  }
  candidate.score += weight;
  candidate.reasons.push(reason);
}

function sourcePlan(
  intent: IntentAwareRetrievalIntent
): Pick<IntentAwareRetrievalRoute, 'primarySource' | 'fallbackSources'> {
  switch (intent) {
    case 'current_work':
      return {
        primarySource: 'persistent-tasks',
        fallbackSources: ['legacy-continuity'],
      };
    case 'artifact':
      return {
        primarySource: 'task-artifacts',
        fallbackSources: [],
      };
    case 'rules':
    case 'recent_state':
    case 'decision':
    case 'history':
      return {
        primarySource: 'canonical-memory',
        fallbackSources: ['legacy-continuity'],
      };
    case 'code':
      return {
        primarySource: 'code-intelligence',
        fallbackSources: [],
      };
    case 'continuity':
      return {
        primarySource: 'legacy-continuity',
        fallbackSources: [],
      };
    case 'summary':
      return {
        primarySource: 'persistent-tasks',
        fallbackSources: ['canonical-memory', 'legacy-continuity'],
      };
  }
}

/**
 * Pure deterministic intent classification.
 *
 * No Memory / Task / code source is read here.
 */
export function routeRetrievalIntent(question: string): IntentAwareRetrievalRoute {
  const q = normalize(question);
  const candidates: RouteCandidate[] = [
    { intent: 'artifact', score: 0, reasons: [] },
    { intent: 'code', score: 0, reasons: [] },
    { intent: 'decision', score: 0, reasons: [] },
    { intent: 'rules', score: 0, reasons: [] },
    { intent: 'history', score: 0, reasons: [] },
    { intent: 'continuity', score: 0, reasons: [] },
    { intent: 'current_work', score: 0, reasons: [] },
    { intent: 'recent_state', score: 0, reasons: [] },
    { intent: 'summary', score: 1, reasons: ['default-summary'] },
  ];
  const byIntent = new Map(candidates.map((candidate) => [candidate.intent, candidate]));

  const artifact = byIntent.get('artifact')!;
  addSignal(
    artifact,
    q,
    /\b(?:artifact|backup|report|release|build|deploy|deployment|crawler|screenshot)\b/u,
    7,
    'artifact-keyword'
  );
  addSignal(
    artifact,
    q,
    /(?:seo audit|crawler output|report json|backup folder|backup path|đường dẫn backup|đường dẫn report|deploy (?:chạy|xong|verified|verify)|đã deploy|deploy chưa)/u,
    9,
    'artifact-state-or-path'
  );

  const code = byIntent.get('code')!;
  addSignal(
    code,
    q,
    /\b(?:function|class|symbol|module|implementation|caller|callers|dependency|dependencies|import|source code)\b/u,
    7,
    'code-symbol'
  );
  addSignal(
    code,
    q,
    /(?:hàm|class|module|symbol|định nghĩa|implementation|được gọi ở đâu|caller|dependency|phụ thuộc|code nằm|source nằm)/u,
    7,
    'code-structure'
  );
  addSignal(
    code,
    q,
    /(?:where is|defined where|nằm ở file nào|file nào định nghĩa)/u,
    5,
    'code-location'
  );

  const decision = byIntent.get('decision')!;
  addSignal(
    decision,
    q,
    /(?:quyết định|đã chốt|decision|rationale|reason for|why did|tại sao chọn|vì sao chọn)/u,
    9,
    'decision-explicit'
  );
  addSignal(decision, q, /^(?:tại sao|vì sao|why)\b/u, 4, 'why-question');

  const rules = byIntent.get('rules')!;
  addSignal(
    rules,
    q,
    /(?:quy tắc|rule|rules|convention|coding standard|policy|project rule|nguyên tắc)/u,
    9,
    'rule-explicit'
  );
  addSignal(rules, q, /(?:luôn phải|không được|must always|must never)/u, 7, 'rule-language');

  const history = byIntent.get('history')!;
  addSignal(
    history,
    q,
    /(?:lịch sử|history|trước đây|hồi trước|old history|historical|đã từng|previous work)/u,
    9,
    'history-explicit'
  );
  addSignal(
    history,
    q,
    /(?:đã làm gì|đã hoàn thành gì|completed before|done before)/u,
    6,
    'historical-completion'
  );

  const continuity = byIntent.get('continuity')!;
  addSignal(
    continuity,
    q,
    /(?:agent trước|previous agent|session trước|previous session|handoff|bàn giao|tiếp quản)/u,
    10,
    'continuity-explicit'
  );

  const current = byIntent.get('current_work')!;
  addSignal(
    current,
    q,
    /(?:task hiện tại|current task|đang làm gì|đang làm task|todo còn lại|việc còn lại|chưa làm|chưa xong)/u,
    9,
    'current-task'
  );
  addSignal(
    current,
    q,
    /(?:next action|next step|tiếp theo|làm gì tiếp|blocker|đang vướng|đang kẹt)/u,
    8,
    'current-action'
  );
  addSignal(
    current,
    q,
    /(?:file đang sửa|file đang đụng|files touched|current file|progress|tiến độ|status task)/u,
    8,
    'current-state'
  );

  const recent = byIntent.get('recent_state')!;
  addSignal(
    recent,
    q,
    /(?:gần đây|recent|recently|mới nhất|latest fact|latest state|recent state)/u,
    8,
    'recent-explicit'
  );
  addSignal(
    recent,
    q,
    /(?:production hiện tại|hiện đang dùng|current production|current config)/u,
    6,
    'recent-fact'
  );

  const summary = byIntent.get('summary')!;
  addSignal(summary, q, /(?:tóm tắt|summary|overview|tổng quan)/u, 6, 'summary-explicit');

  /*
   * Explicit current-file phrasing must not be stolen
   * by generic "file" / code-location patterns.
   */
  if (/(?:file đang sửa|file đang đụng|current file|last touched file)/u.test(q)) {
    current.score += 8;
  }
  /*
   * Explicit deploy-state questions belong to artifact evidence
   * even when they also contain "why".
   */
  if (
    /(?:deploy|deployment)/u.test(q) &&
    /(?:chạy chưa|xong chưa|verify|verified|executed|status|trạng thái)/u.test(q)
  ) {
    artifact.score += 8;
  }

  const tieOrder: IntentAwareRetrievalIntent[] = [
    'artifact',
    'decision',
    'code',
    'rules',
    'history',
    'continuity',
    'current_work',
    'recent_state',
    'summary',
  ];
  candidates.sort(
    (left, right) =>
      right.score - left.score || tieOrder.indexOf(left.intent) - tieOrder.indexOf(right.intent)
  );
  const winner = candidates[0]!;
  const plan = sourcePlan(winner.intent);
  return {
    intent: winner.intent,
    ...plan,
    confidence: Math.max(0.55, Math.min(0.99, 0.55 + winner.score / 25)),
    reasons: winner.reasons.length ? winner.reasons : ['default-summary'],
  };
}

function queryTerms(question: string): string[] {
  return [
    ...new Set(
      normalize(question)
        .split(/[^\p{L}\p{N}_-]+/u)
        .map((term) => term.trim())
        .filter((term) => term.length >= 2 && !STOP_WORDS.has(term))
    ),
  ].slice(0, 20);
}

function lexicalScore(text: string, terms: string[]): number {
  if (terms.length === 0) {
    return 0;
  }
  const normalized = normalize(text);
  let score = 0;
  for (const term of terms) {
    if (normalized.includes(term)) {
      score += 1;
    }
  }
  return score / terms.length;
}

function memoryItemScore(item: MemoryQualityItem, terms: string[]): number {
  return (
    lexicalScore(item.content, terms) * 100 +
    item.confidence * 20 +
    (item.freshness === 'fresh' ? 8 : item.freshness === 'needs_verification' ? 2 : 0)
  );
}

function formatMemoryItem(item: MemoryQualityItem): string {
  const observed = item.observedAt.slice(0, 10);
  return [
    `[${item.scope}]`,
    `[${item.freshness}]`,
    `[${item.confidence.toFixed(2)}]`,
    `[${observed}]`,
    compact(item.content, 420),
  ].join(' ');
}

async function canonicalMemories(
  project: ProjectManifest,
  options: IntentAwareRetrievalOptions
): Promise<MemoryRecord[]> {
  if (options.loadMemories) {
    return options.loadMemories();
  }
  if (!options.storage) {
    return [];
  }
  return new ConvergentMemoryStore(options.storage).load(project.id);
}

async function memorySource(
  project: ProjectManifest,
  question: string,
  intent: IntentAwareRetrievalIntent,
  options: IntentAwareRetrievalOptions
): Promise<SourceResult> {
  let memories: MemoryRecord[];
  try {
    memories = await canonicalMemories(project, options);
  } catch {
    return { answer: '', count: 0 };
  }
  if (memories.length === 0) {
    return { answer: '', count: 0 };
  }
  const now = options.now ?? Date.now();
  const report = inspectMemoryQuality(memories, now);
  const terms = queryTerms(question);
  let candidates: MemoryQualityItem[];
  switch (intent) {
    case 'rules':
      candidates = report.items.filter(
        (item) =>
          item.scope === 'rule' &&
          item.freshness === 'fresh' &&
          item.confidence >= 0.8 &&
          (Boolean(item.verifiedAt) || item.confidence >= 0.95)
      );
      break;
    case 'decision':
      candidates = report.items.filter(
        (item) => item.scope === 'decision' && item.freshness !== 'stale' && item.confidence >= 0.7
      );
      break;
    case 'recent_state':
      candidates = report.items.filter(
        (item) =>
          ['decision', 'fact', 'observation'].includes(item.scope) &&
          item.freshness === 'fresh' &&
          item.confidence >= 0.8
      );
      break;
    case 'history':
      /*
       * Explicit historical query is the one place where
       * stale history is intentionally eligible.
       */
      candidates = report.items;
      break;
    case 'summary':
      candidates = report.items.filter(
        (item) => item.freshness === 'fresh' && item.confidence >= 0.8 && item.scope !== 'history'
      );
      break;
    default:
      return { answer: '', count: 0 };
  }
  candidates = [...candidates]
    .sort(
      (left, right) =>
        memoryItemScore(right, terms) - memoryItemScore(left, terms) ||
        right.observedAt.localeCompare(left.observedAt) ||
        left.id.localeCompare(right.id)
    )
    .slice(0, intent === 'history' ? 8 : 5);
  if (candidates.length === 0) {
    return { answer: '', count: 0 };
  }
  return {
    answer: candidates.map(formatMemoryItem).join('\n'),
    count: candidates.length,
  };
}

function currentWorkSource(
  project: ProjectManifest,
  options: IntentAwareRetrievalOptions
): SourceResult {
  try {
    const now = options.now ?? Date.now();
    const projection = buildCurrentWorkProjection(project, {
      now,
      ...(options.agentId ? { agentId: options.agentId } : {}),
    });
    /*
     * Persistent Tasks exist but none is fresh/current.
     *
     * This is a meaningful answer and must not resurrect
     * session history.
     */
    if (projection.source === 'empty' && projection.authority === 'persistent-tasks') {
      return {
        answer: renderCompactCurrentWork(projection, { now }),
        count: 1,
      };
    }
    const rendered = renderCompactCurrentWork(projection, {
      now,
      maxChars: 3_200,
    });
    return {
      answer: rendered,
      count: rendered ? 1 : 0,
    };
  } catch {
    return { answer: '', count: 0 };
  }
}

function artifactSource(project: ProjectManifest, question: string): SourceResult {
  try {
    const store = new TaskStore(project);
    const projection = store.projection();
    const current = buildCurrentWorkProjection(project);
    const currentTaskId = current.task?.id;
    const terms = queryTerms(question);
    const tasks = Object.values(projection.tasks).sort((left, right) => {
      const leftCurrent = left.id === currentTaskId ? 0 : 1;
      const rightCurrent = right.id === currentTaskId ? 0 : 1;
      const leftTerminal = left.status === 'completed' || left.status === 'cancelled' ? 1 : 0;
      const rightTerminal = right.status === 'completed' || right.status === 'cancelled' ? 1 : 0;
      return (
        leftCurrent - rightCurrent ||
        leftTerminal - rightTerminal ||
        right.updatedAt.localeCompare(left.updatedAt) ||
        left.id.localeCompare(right.id)
      );
    });
    const lines: Array<{ text: string; score: number }> = [];
    for (const task of tasks) {
      const artifacts = currentTaskArtifactLines(task.evidence, 12);
      for (const artifact of artifacts) {
        const text = `${task.title} — ${artifact}`;
        lines.push({
          text,
          score:
            lexicalScore(text, terms) * 100 +
            (task.id === currentTaskId ? 20 : 0) +
            (task.status === 'completed' || task.status === 'cancelled' ? 0 : 10),
        });
      }
    }
    const selected = lines
      .sort((left, right) => right.score - left.score || left.text.localeCompare(right.text))
      .slice(0, 8);
    return {
      answer: selected.map((item) => item.text).join('\n'),
      count: selected.length,
    };
  } catch {
    return { answer: '', count: 0 };
  }
}

async function persistedCodeSearch(
  project: ProjectManifest,
  question: string,
  options: IntentAwareRetrievalOptions
): Promise<IntentAwareCodeHit[]> {
  if (options.searchCode) {
    return options.searchCode(question, 6);
  }
  if (!options.storage) {
    return [];
  }
  let snapshot;
  try {
    snapshot = await new PersistentCodeChunkStore(options.storage).load(project.id);
  } catch {
    return [];
  }
  if (!snapshot || snapshot.chunks.length === 0) {
    return [];
  }
  const index = new CodeFtsIndex(project.id);
  try {
    index.build(snapshot.chunks);
    return index.search(question, 6).map((hit) => ({
      filePath: hit.chunk.filePath,
      ...(hit.chunk.symbolName ? { symbolName: hit.chunk.symbolName } : {}),
      startLine: hit.chunk.startLine,
      endLine: hit.chunk.endLine,
      content: hit.chunk.content,
      score: hit.score,
    }));
  } finally {
    index.close();
  }
}

function codeHitText(hit: IntentAwareCodeHit): string {
  const location = `${hit.filePath}:${hit.startLine}-${hit.endLine}`;
  const symbol = hit.symbolName ? ` [${hit.symbolName}]` : '';
  return `${location}${symbol} — ${compact(hit.content, 260)}`;
}

async function codeSource(
  project: ProjectManifest,
  question: string,
  options: IntentAwareRetrievalOptions
): Promise<SourceResult> {
  const hits = await persistedCodeSearch(project, question, options);
  return {
    answer: hits.slice(0, 6).map(codeHitText).join('\n'),
    count: hits.length,
  };
}

function legacySource(project: ProjectManifest, question: string): SourceResult {
  const legacy = answerRetrievedMemoryQuestion(project, question);
  if (legacy.source === 'none') {
    return { answer: '', count: 0 };
  }
  return {
    answer: legacy.answer,
    count: 1,
  };
}

async function executeSource(
  source: IntentAwareRetrievalSource,
  project: ProjectManifest,
  question: string,
  intent: IntentAwareRetrievalIntent,
  options: IntentAwareRetrievalOptions
): Promise<SourceResult> {
  switch (source) {
    case 'persistent-tasks':
      return currentWorkSource(project, options);
    case 'task-artifacts':
      return artifactSource(project, question);
    case 'canonical-memory':
      return memorySource(project, question, intent, options);
    case 'code-intelligence':
      return codeSource(project, question, options);
    case 'legacy-continuity':
      return legacySource(project, question);
  }
}

/**
 * Phase 59 router.
 *
 * Only the selected source is queried.
 * Fallback sources execute sequentially and only when the
 * previous source produced no useful answer.
 */
export async function retrieveIntentAwareAnswer(
  project: ProjectManifest,
  question: string,
  options: IntentAwareRetrievalOptions = {}
): Promise<IntentAwareRetrievalResult> {
  const route = options.route ?? routeRetrievalIntent(question);
  const plan = [route.primarySource, ...route.fallbackSources];
  const attemptedSources: IntentAwareRetrievalSource[] = [];
  for (const source of plan) {
    attemptedSources.push(source);
    let result: SourceResult;
    try {
      result = await executeSource(source, project, question, route.intent, options);
    } catch {
      continue;
    }
    if (!result.answer.trim()) {
      continue;
    }
    return {
      question,
      route,
      answer: result.answer,
      source,
      attemptedSources,
      stats: {
        attempted: attemptedSources.length,
        successfulSource: source,
        resultCount: result.count,
      },
    };
  }
  return {
    question,
    route,
    answer: 'ToolNet chưa có đủ dữ liệu phù hợp cho câu hỏi này.',
    source: 'none',
    attemptedSources,
    stats: {
      attempted: attemptedSources.length,
      successfulSource: 'none',
      resultCount: 0,
    },
  };
}

/**
 * Used by CLI before creating remote storage.
 *
 * Current-work / artifact / continuity questions should remain
 * local and must not initialize remote storage unnecessarily.
 */
export function routeNeedsStorage(route: IntentAwareRetrievalRoute): boolean {
  return [route.primarySource, ...route.fallbackSources].some(
    (source) => source === 'canonical-memory' || source === 'code-intelligence'
  );
}
