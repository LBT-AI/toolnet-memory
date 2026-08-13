import type { ImportanceLevel } from '../core/types.js';

import type { NormalizedSessionEvent, SessionIdentity } from '../session/types.js';

import { extractLearnedMemories } from '../session/learner/extractor.js';

import type { LearnedMemoryCandidate } from '../session/learner/types.js';

import { buildMemoryHierarchy, type MemoryHierarchy } from './hierarchy.js';

import { extractSessionMemory } from '../session/session-extractor.js';

export type MemoryKnowledgeClass = 'permanent' | 'task' | 'session' | 'transient';

export interface MemoryPipelineCandidate extends LearnedMemoryCandidate {
  knowledgeClass: MemoryKnowledgeClass;

  importanceScore: number;

  retrievalTerms: string[];
}

export interface MemoryPipelineState {
  task?: string;

  decisions: string[];

  files: string[];

  todos: string[];

  completed: string[];

  blockers: string[];

  nextActions: string[];

  architecture: string[];
}

export interface MemoryRetrievalIndexEntry {
  fingerprint: string;

  kind: LearnedMemoryCandidate['kind'];

  knowledgeClass: MemoryKnowledgeClass;

  importanceScore: number;

  content: string;

  terms: string[];
}

export interface MemoryPipelineV2Result {
  version: 2;

  normalizedEvents: NormalizedSessionEvent[];

  summary: string;

  state: MemoryPipelineState;

  candidates: MemoryPipelineCandidate[];

  retrievalIndex: MemoryRetrievalIndexEntry[];

  hierarchy: MemoryHierarchy;

  stats: {
    inputEvents: number;

    normalizedEvents: number;

    extractedCandidates: number;

    persistedCandidates: number;

    permanent: number;

    task: number;

    session: number;

    transient: number;
  };
}

function uniqueStrings(values: Array<string | undefined>): string[] {
  const seen = new Set<string>();

  const output: string[] = [];

  for (const raw of values) {
    const value = raw?.replace(/\s+/g, ' ').trim();

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

function normalizeEvents(events: NormalizedSessionEvent[]): NormalizedSessionEvent[] {
  const byIdentity = new Map<string, NormalizedSessionEvent>();

  for (const event of events) {
    if (!event || !event.id || !Number.isFinite(event.sequence)) {
      continue;
    }

    const key = event.sourceEventId ? `${event.agent}:${event.sourceEventId}` : event.id;

    const previous = byIdentity.get(key);

    if (!previous || event.sequence > previous.sequence) {
      byIdentity.set(key, event);
    }
  }

  return [...byIdentity.values()].sort(
    (left, right) => left.sequence - right.sequence || left.timestamp.localeCompare(right.timestamp)
  );
}

function importanceBase(importance: ImportanceLevel): number {
  switch (importance) {
    case 'critical':
      return 1;

    case 'high':
      return 0.85;

    case 'normal':
      return 0.6;

    case 'temporary':
      return 0.25;
  }
}

function scoreCandidate(candidate: LearnedMemoryCandidate): number {
  const base = importanceBase(candidate.importance);

  /*
   * Importance is primary.
   * Extraction confidence is supporting evidence.
   */
  return Math.max(0, Math.min(1, base * 0.75 + candidate.confidence * 0.25));
}

function classifyKnowledge(candidate: LearnedMemoryCandidate): MemoryKnowledgeClass {
  /*
   * Explicitly low-value information never reaches
   * durable memory/retrieval.
   */
  if (candidate.importance === 'temporary' || candidate.confidence < 0.78) {
    return 'transient';
  }

  /*
   * Stable project knowledge.
   */
  if (candidate.kind === 'rule' || candidate.kind === 'architecture') {
    return 'permanent';
  }

  /*
   * Work-specific knowledge needed to continue
   * the current task across agents/sessions.
   */
  if (candidate.kind === 'decision' || candidate.kind === 'todo' || candidate.kind === 'fix') {
    return 'task';
  }

  /*
   * Paths, runtime context, temporary implementation
   * context, etc. Useful during a session but should
   * not be treated as a permanent project rule.
   */
  return 'session';
}

function retrievalTerms(text: string): string[] {
  const terms =
    text
      .normalize('NFKC')
      .toLowerCase()
      .match(/[\p{L}\p{N}_./:-]+/gu) ?? [];

  const unique = new Set<string>();

  for (const term of terms) {
    if (term.length < 2 || /^\d+$/u.test(term)) {
      continue;
    }

    unique.add(term);

    if (unique.size >= 40) {
      break;
    }
  }

  return [...unique];
}

function enrichCandidate(candidate: LearnedMemoryCandidate): MemoryPipelineCandidate {
  const knowledgeClass = classifyKnowledge(candidate);

  const importanceScore = scoreCandidate(candidate);

  const terms = retrievalTerms(candidate.content);

  return {
    ...candidate,

    knowledgeClass,

    importanceScore,

    retrievalTerms: terms,

    tags: uniqueStrings([
      ...candidate.tags,
      'level:fact',
      `class:${knowledgeClass}`,
      `kind:${candidate.kind}`,
    ]),
  };
}

function eventPayloads(events: NormalizedSessionEvent[]): string[] {
  return events
    .map((event) => {
      try {
        return JSON.stringify({
          type: event.type,

          role: event.role,

          data: event.data,

          provenance: {
            sourcePath: event.provenance.sourcePath,

            files: event.provenance.files,
          },
        });
      } catch {
        return '';
      }
    })
    .filter(Boolean);
}

function buildState(
  identity: SessionIdentity,

  events: NormalizedSessionEvent[],

  candidates: MemoryPipelineCandidate[]
): {
  summary: string;

  state: MemoryPipelineState;
} {
  const extraction = extractSessionMemory(
    eventPayloads(events),

    identity.nativeSessionId
  );

  const candidateTodos = candidates
    .filter((candidate) => candidate.kind === 'todo')
    .map((candidate) => candidate.content);

  const candidateFiles = candidates.flatMap((candidate) => candidate.provenance.sourcePaths);

  const architecture = candidates
    .filter((candidate) => candidate.kind === 'architecture')
    .map((candidate) => candidate.content);

  const todos = uniqueStrings([...candidateTodos, ...extraction.nextActions]);

  const nextActions = uniqueStrings([...extraction.nextActions, ...candidateTodos]);

  return {
    summary: extraction.summary,

    state: {
      task: nextActions[0] ?? todos[0],

      decisions: uniqueStrings(extraction.decisions),

      files: uniqueStrings([...extraction.filesChanged, ...candidateFiles]),

      todos,

      completed: uniqueStrings(extraction.bugsFixed),

      blockers: uniqueStrings(extraction.blockers),

      nextActions,

      architecture: uniqueStrings(architecture),
    },
  };
}

export function runMemoryPipelineV2(
  identity: SessionIdentity,

  events: NormalizedSessionEvent[]
): MemoryPipelineV2Result {
  /*
   * Stage 1: normalization.
   */
  const normalizedEvents = normalizeEvents(events);

  /*
   * Stage 2–4:
   * extraction + classification + importance.
   *
   * Existing learner extraction remains the source
   * of truth for durable candidate detection.
   */
  const extracted = extractLearnedMemories(
    identity,

    normalizedEvents
  ).map(enrichCandidate);

  /*
   * Stage 5:
   * transient information is deliberately excluded
   * from durable persistence and retrieval.
   */
  const candidates = extracted
    .filter((candidate) => candidate.knowledgeClass !== 'transient')
    .sort((left, right) => right.importanceScore - left.importanceScore);

  /*
   * Stage 6:
   * summary + task state extraction.
   */
  const { summary, state } = buildState(
    identity,

    normalizedEvents,

    candidates
  );

  /*
   * Stage 7:
   * retrieval index projection.
   *
   * Candidate content is still persisted through the
   * existing immutable SessionMemoryJournal and later
   * reconciled into MemoryStore/MemoryEngine.
   */
  const retrievalIndex = candidates.map((candidate) => ({
    fingerprint: candidate.fingerprint,

    kind: candidate.kind,

    knowledgeClass: candidate.knowledgeClass,

    importanceScore: candidate.importanceScore,

    content: candidate.content,

    terms: candidate.retrievalTerms,
  }));

  /*
   * Stage 8:
   * deterministic hierarchical memory assets.
   *
   * Raw payload remains in the normalized session source.
   * Hierarchy keeps provenance references and promotes
   * selected facts into semantic scenes/durable knowledge.
   */
  const hierarchy = buildMemoryHierarchy(normalizedEvents, candidates);

  const countClass = (value: MemoryKnowledgeClass) =>
    extracted.filter((candidate) => candidate.knowledgeClass === value).length;

  return {
    version: 2,

    normalizedEvents,

    summary,

    state,

    candidates,

    retrievalIndex,

    hierarchy,

    stats: {
      inputEvents: events.length,

      normalizedEvents: normalizedEvents.length,

      extractedCandidates: extracted.length,

      persistedCandidates: candidates.length,

      permanent: countClass('permanent'),

      task: countClass('task'),

      session: countClass('session'),

      transient: countClass('transient'),
    },
  };
}
