import { tokenize } from '../../retrieval/tokenizer.js';

import { markdownFilename, parseMarkdown, toMarkdown } from './markdown.js';

import {
  ADR_RECORD_SCHEMA,
  type AdrAlternative,
  type AdrCreateInput,
  type AdrHistoryEvent,
  type AdrListFilter,
  type AdrMutationResult,
  type AdrOperation,
  type AdrReference,
  type AdrSearchResult,
  type AdrStateV1,
  type AdrStatus,
  type AdrUpdatableSections,
  type ArchitectureDecisionRecord,
} from './types.js';

import { AdrStore } from './store.js';

import {
  AdrError,
  assertNoSecrets,
  assertTransition,
  hashPayload,
  matchesAffectedPath,
  normalizeStringList,
  normalizeTags,
  validateAffectedPath,
  MAX_SECTION_ITEMS,
  MAX_TEXT_LENGTH,
} from './validate.js';

const REFERENCE_KINDS = new Set(['file', 'url', 'adr', 'commit', 'spec']);

/** Statuses that count as current architecture authority. */
const CURRENT_STATUSES: readonly AdrStatus[] = ['proposed', 'accepted', 'deprecated'];

const MAX_TITLE_LENGTH = 300;

export interface AdrMutationOptions {
  expectedRevision?: number;
  requestId?: string;
  actor?: string;
}

export interface AdrSupersedeResult {
  superseded: ArchitectureDecisionRecord;
  replacement: ArchitectureDecisionRecord;
  idempotent: boolean;
  events: AdrHistoryEvent[];
}

export interface AdrRelevanceOptions {
  statuses?: AdrStatus[];
  limit?: number;
}

export interface AdrMarkdownExport {
  humanId: string;
  revision: number;
  filename: string;
  markdown: string;
  key?: string;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function pad(number: number): string {
  return String(number).padStart(4, '0');
}

function humanIdFor(number: number): string {
  return `ADR-${pad(number)}`;
}

function recordStatusRank(record: ArchitectureDecisionRecord): number {
  switch (record.status) {
    case 'accepted':
      return 0;
    case 'proposed':
      return 1;
    case 'deprecated':
      return 2;
    case 'superseded':
      return 3;
    default:
      return 4;
  }
}

function boundedLimit(value: number | undefined, fallback: number, max: number): number {
  if (value === undefined) {
    return fallback;
  }

  const floored = Math.floor(value);

  if (!Number.isFinite(floored) || floored <= 0) {
    return fallback;
  }

  return Math.min(max, floored);
}

function text(value: string | undefined): string {
  const trimmed = (value ?? '').trim();

  if (trimmed.length > MAX_TEXT_LENGTH) {
    throw new AdrError('ADR_INVALID', 'ADR section exceeds the maximum size');
  }

  return trimmed;
}

function normalizeReferences(values: readonly AdrReference[] | undefined): AdrReference[] {
  const output: AdrReference[] = [];

  for (const raw of values ?? []) {
    const target = (raw?.target ?? '').trim();

    if (!target) {
      throw new AdrError('ADR_INVALID', 'ADR reference target must not be empty');
    }

    if (!REFERENCE_KINDS.has(raw.kind)) {
      throw new AdrError('ADR_INVALID', `Unsupported ADR reference kind: ${String(raw.kind)}`);
    }

    const note = (raw.note ?? '').trim();

    output.push({
      kind: raw.kind,
      target,
      ...(note ? { note } : {}),
    });
  }

  return output.slice(0, MAX_SECTION_ITEMS);
}

function normalizeAlternatives(values: readonly AdrAlternative[] | undefined): AdrAlternative[] {
  const output: AdrAlternative[] = [];

  for (const raw of values ?? []) {
    const title = (raw?.title ?? '').trim();

    if (!title) {
      throw new AdrError('ADR_INVALID', 'ADR alternative title must not be empty');
    }

    const description = (raw.description ?? '').trim();
    const rejectedBecause = (raw.rejectedBecause ?? '').trim();

    output.push({
      title,
      ...(description ? { description } : {}),
      ...(rejectedBecause ? { rejectedBecause } : {}),
    });
  }

  return output.slice(0, MAX_SECTION_ITEMS);
}

interface NormalizedSections {
  title?: string;
  context?: string;
  decision?: string;
  consequences?: { positive: string[]; negative: string[]; neutral: string[] };
  alternatives?: AdrAlternative[];
  affectedPaths?: string[];
  affectedSymbols?: string[];
  tags?: string[];
  references?: AdrReference[];
}

function normalizeSections(input: AdrUpdatableSections): NormalizedSections {
  const output: NormalizedSections = {};

  if (input.title !== undefined) {
    const title = input.title.trim();

    if (!title) {
      throw new AdrError('ADR_INVALID', 'ADR title must not be empty');
    }

    if (title.length > MAX_TITLE_LENGTH) {
      throw new AdrError('ADR_INVALID', 'ADR title is too long');
    }

    output.title = title;
  }

  if (input.context !== undefined) {
    output.context = text(input.context);
  }

  if (input.decision !== undefined) {
    output.decision = text(input.decision);
  }

  if (input.consequences !== undefined) {
    output.consequences = {
      positive: normalizeStringList(input.consequences.positive),
      negative: normalizeStringList(input.consequences.negative),
      neutral: normalizeStringList(input.consequences.neutral),
    };
  }

  if (input.alternatives !== undefined) {
    output.alternatives = normalizeAlternatives(input.alternatives);
  }

  if (input.affectedPaths !== undefined) {
    output.affectedPaths = normalizeStringList(
      input.affectedPaths.map((path) => validateAffectedPath(path))
    );
  }

  if (input.affectedSymbols !== undefined) {
    output.affectedSymbols = normalizeStringList(input.affectedSymbols);
  }

  if (input.tags !== undefined) {
    output.tags = normalizeTags(input.tags);
  }

  if (input.references !== undefined) {
    output.references = normalizeReferences(input.references);
  }

  assertNoSecrets({
    references: output.references,
    texts: [output.title, output.context, output.decision].filter(
      (value): value is string => value !== undefined
    ),
  });

  return output;
}

/**
 * Phase 75 — ADR service.
 *
 * The structured record store is the authority. Every mutation is applied to a
 * draft copy and committed atomically, so a rejected mutation can never leave a
 * half-updated record or a partial supersession.
 */
export class ArchitectureDecisionService {
  private state?: AdrStateV1;

  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly store: AdrStore,
    private readonly defaultActor?: string
  ) {}

  async initialize(): Promise<void> {
    await this.ensureState();
  }

  private async ensureState(): Promise<AdrStateV1> {
    if (!this.state) {
      this.state = await this.store.load();
    }

    return this.state;
  }

  private async mutate<T>(callback: (draft: AdrStateV1) => T): Promise<T> {
    let result!: T;

    const current = this.queue.then(async () => {
      const state = await this.ensureState();

      /*
       * Mutations run against a draft: a validation failure after a partial
       * write cannot corrupt the authority.
       */
      const draft = clone(state);

      result = callback(draft);

      draft.updatedAt = new Date().toISOString();

      await this.store.save(draft);

      this.state = draft;
    });

    this.queue = current.then(
      () => undefined,
      () => undefined
    );

    await current;

    return result;
  }

  private resolveIn(state: AdrStateV1, reference: string): ArchitectureDecisionRecord | undefined {
    const value = reference.trim();

    if (!value) {
      return undefined;
    }

    const upper = value.toUpperCase();

    return state.records.find((record) => {
      if (record.id === value) {
        return true;
      }

      if (record.humanId.toUpperCase() === upper) {
        return true;
      }

      return upper.startsWith('ADR-') && `ADR-${pad(record.number)}` === upper;
    });
  }

  private latestEvent(state: AdrStateV1, adrId: string): AdrHistoryEvent | undefined {
    for (let index = state.history.length - 1; index >= 0; index -= 1) {
      const event = state.history[index];

      if (event?.adrId === adrId) {
        return event;
      }
    }

    return undefined;
  }

  private appendEvent(
    state: AdrStateV1,
    record: ArchitectureDecisionRecord,
    operation: AdrOperation,
    beforeRevision: number,
    changedFields: string[],
    requestHash: string
  ): AdrHistoryEvent {
    const event: AdrHistoryEvent = {
      id: hashPayload({ adrId: record.id, revision: record.revision, operation }),
      adrId: record.id,
      humanId: record.humanId,
      operation,
      at: new Date().toISOString(),
      beforeRevision,
      afterRevision: record.revision,
      changedFields: [...changedFields].sort((left, right) => left.localeCompare(right)),
      requestHash,
    };

    state.history.push(event);

    return event;
  }

  private assertRevision(
    record: ArchitectureDecisionRecord,
    options: AdrMutationOptions,
    requestHash: string,
    state: AdrStateV1
  ): boolean {
    const latest = this.latestEvent(state, record.id);

    /*
     * Deterministic idempotency: an exact replay of the previous intent is a
     * success with no new revision and no duplicate history event — even when
     * the caller re-sends the (now stale) expectedRevision.
     */
    if (latest?.requestHash === requestHash) {
      return true;
    }

    if (options.expectedRevision !== undefined && options.expectedRevision !== record.revision) {
      throw new AdrError(
        'ADR_CONFLICT',
        `ADR revision conflict for ${record.humanId}: expected ${options.expectedRevision}, current ${record.revision}`,
        409
      );
    }

    return false;
  }

  private actorFor(options: AdrMutationOptions): string | undefined {
    return options.actor ?? this.defaultActor;
  }

  /* ---------------------------------------------------------------- *
   * Read operations
   * ---------------------------------------------------------------- */

  async get(reference: string): Promise<ArchitectureDecisionRecord> {
    const state = await this.ensureState();
    const record = this.resolveIn(state, reference);

    if (!record) {
      throw new AdrError('ADR_NOT_FOUND', `ADR not found: ${reference}`, 404);
    }

    return clone(record);
  }

  async list(filter: AdrListFilter = {}): Promise<{
    records: ArchitectureDecisionRecord[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const state = await this.ensureState();

    const statuses =
      filter.status === 'all' ? undefined : filter.status ? [filter.status] : CURRENT_STATUSES;

    let records = state.records.filter((record) => !statuses || statuses.includes(record.status));

    if (filter.tag) {
      const tag = filter.tag.trim().toLowerCase();

      records = records.filter((record) => record.tags.includes(tag));
    }

    records = records.sort(
      (left, right) =>
        recordStatusRank(left) - recordStatusRank(right) || left.number - right.number
    );

    const total = records.length;
    const limit = boundedLimit(filter.limit, 20, 200);
    const offset = Math.max(0, Math.floor(filter.offset ?? 0));

    return {
      records: clone(records.slice(offset, offset + limit)),
      total,
      limit,
      offset,
    };
  }

  /**
   * Deterministic local lexical (BM25-style) ranking. No embeddings, no vector
   * database, no external model.
   */
  async search(
    query: string,
    options: { limit?: number; includeHistorical?: boolean } = {}
  ): Promise<AdrSearchResult[]> {
    const state = await this.ensureState();
    const queryTokens = tokenize(query);

    if (queryTokens.length === 0) {
      return [];
    }

    const limit = boundedLimit(options.limit, 10, 50);

    const candidates = options.includeHistorical
      ? state.records
      : state.records.filter((record) => CURRENT_STATUSES.includes(record.status));

    const results: AdrSearchResult[] = [];

    for (const record of candidates) {
      const fields: Array<[number, string[]]> = [
        [4, tokenize(record.title)],
        [3, tokenize(record.tags.join(' '))],
        [2.5, tokenize(record.decision)],
        [1.5, tokenize(record.context)],
        [
          1,
          tokenize(
            record.alternatives
              .map((item) =>
                [item.title, item.description ?? '', item.rejectedBecause ?? ''].join(' ')
              )
              .join(' ')
          ),
        ],
        [0.5, tokenize(record.affectedPaths.join(' ') + ' ' + record.affectedSymbols.join(' '))],
      ];

      let score = 0;

      for (const token of queryTokens) {
        for (const [weight, tokens] of fields) {
          let termFrequency = 0;

          for (const candidate of tokens) {
            if (candidate === token) {
              termFrequency += 1;
            }
          }

          if (termFrequency > 0) {
            score += weight * (1 + Math.log(1 + termFrequency));
          }
        }
      }

      if (score > 0) {
        results.push({ record: clone(record), score });
      }
    }

    return results
      .sort((left, right) => right.score - left.score || left.record.number - right.record.number)
      .slice(0, limit)
      .map((item) => ({ record: item.record, score: Number(item.score.toFixed(6)) }));
  }

  async history(reference: string): Promise<AdrHistoryEvent[]> {
    const record = await this.get(reference);
    const state = await this.ensureState();

    return clone(
      state.history
        .filter((event) => event.adrId === record.id)
        .sort(
          (left, right) =>
            left.afterRevision - right.afterRevision || left.id.localeCompare(right.id)
        )
    );
  }

  /**
   * Accepted ADRs relevant to a project-relative file path.
   *
   * Matching is deterministic glob/dir-prefix matching only. No fuzzy or
   * title-based mapping.
   */
  async relevantByPath(
    filePath: string,
    options: AdrRelevanceOptions = {}
  ): Promise<ArchitectureDecisionRecord[]> {
    const normalized = filePath.trim().replace(/\\/gu, '/').replace(/^\.\//u, '');

    if (!normalized) {
      return [];
    }

    return this.relevantRecords(options, (record) =>
      record.affectedPaths.some((pattern) => matchesAffectedPath(pattern, normalized))
    );
  }

  /**
   * ADRs linked to an exact symbol id or qualified name. Simple-name guessing is
   * deliberately not supported.
   */
  async relevantBySymbol(
    symbol: string,
    options: AdrRelevanceOptions = {}
  ): Promise<ArchitectureDecisionRecord[]> {
    const value = symbol.trim();

    if (!value) {
      return [];
    }

    return this.relevantRecords(options, (record) => record.affectedSymbols.includes(value));
  }

  private async relevantRecords(
    options: AdrRelevanceOptions,
    predicate: (record: ArchitectureDecisionRecord) => boolean
  ): Promise<ArchitectureDecisionRecord[]> {
    const state = await this.ensureState();
    const statuses = options.statuses ?? ['accepted'];
    const limit = boundedLimit(options.limit, 5, 50);

    return clone(
      state.records
        .filter((record) => statuses.includes(record.status) && predicate(record))
        .sort(
          (left, right) =>
            recordStatusRank(left) - recordStatusRank(right) || left.number - right.number
        )
        .slice(0, limit)
    );
  }

  /**
   * Bounded supersession chain (backwards = what this ADR supersedes, forwards
   * = what superseded it). Cycle-guarded.
   */
  async supersessionChain(reference: string): Promise<{
    supersedes: string[];
    supersededBy: string[];
  }> {
    const state = await this.ensureState();
    const record = this.resolveIn(state, reference);

    if (!record) {
      throw new AdrError('ADR_NOT_FOUND', `ADR not found: ${reference}`, 404);
    }

    const backwards: string[] = [];
    const visitedBackwards = new Set<string>([record.id]);

    const walkBack = (current: ArchitectureDecisionRecord, depth: number) => {
      if (depth > 32) {
        return;
      }

      for (const humanId of current.supersedes) {
        const target = this.resolveIn(state, humanId);

        if (!target || visitedBackwards.has(target.id)) {
          continue;
        }

        visitedBackwards.add(target.id);
        backwards.push(target.humanId);
        walkBack(target, depth + 1);
      }
    };

    walkBack(record, 0);

    const forwards: string[] = [];
    const visitedForwards = new Set<string>([record.id]);

    const walkForward = (current: ArchitectureDecisionRecord, depth: number) => {
      if (depth > 32 || !current.supersededBy) {
        return;
      }

      const target = this.resolveIn(state, current.supersededBy);

      if (!target || visitedForwards.has(target.id)) {
        return;
      }

      visitedForwards.add(target.id);
      forwards.push(target.humanId);
      walkForward(target, depth + 1);
    };

    walkForward(record, 0);

    return {
      supersedes: backwards,
      supersededBy: forwards,
    };
  }

  /* ---------------------------------------------------------------- *
   * Mutations
   * ---------------------------------------------------------------- */

  async create(input: AdrCreateInput): Promise<AdrMutationResult> {
    const sections = normalizeSections({
      title: input.title,
      context: input.context,
      decision: input.decision,
      consequences: input.consequences,
      alternatives: input.alternatives,
      affectedPaths: input.affectedPaths,
      affectedSymbols: input.affectedSymbols,
      tags: input.tags,
      references: input.references,
    });

    const status: AdrStatus = input.status ?? 'proposed';

    if (!sections.title) {
      throw new AdrError('ADR_INVALID', 'ADR title must not be empty');
    }

    if (status === 'accepted' && !sections.decision) {
      throw new AdrError('ADR_INVALID', 'An accepted ADR requires a non-empty decision');
    }

    if (status === 'superseded') {
      throw new AdrError(
        'ADR_INVALID_TRANSITION',
        'Use the supersede operation to create a superseded ADR'
      );
    }

    const requestHash = hashPayload({
      operation: 'created',
      input: { ...input, number: input.number },
    });

    return this.mutate((draft) => {
      /*
       * Deterministic create idempotency: replaying an identical intent returns
       * the original record instead of allocating a second number.
       */
      const replay = draft.history.find(
        (event) => event.operation === 'created' && event.requestHash === requestHash
      );

      if (replay) {
        const existing = draft.records.find((record) => record.id === replay.adrId);

        if (existing) {
          return { record: clone(existing), idempotent: true };
        }
      }

      const number = input.number ?? draft.nextNumber;

      if (!Number.isInteger(number) || number < 1) {
        throw new AdrError('ADR_INVALID', 'ADR number must be a positive integer');
      }

      if (draft.records.some((record) => record.number === number)) {
        throw new AdrError('ADR_CONFLICT', `ADR number already in use: ADR-${pad(number)}`, 409);
      }

      const humanId = humanIdFor(number);
      const now = new Date().toISOString();
      const actor = this.actorFor({ actor: input.provenance?.actor });

      const record: ArchitectureDecisionRecord = {
        schema: ADR_RECORD_SCHEMA,
        id: `${draft.projectId}:${humanId}`,
        projectId: draft.projectId,
        number,
        humanId,
        title: sections.title ?? '',
        status,
        context: sections.context ?? '',
        decision: sections.decision ?? '',
        consequences: sections.consequences ?? { positive: [], negative: [], neutral: [] },
        alternatives: sections.alternatives ?? [],
        affectedPaths: sections.affectedPaths ?? [],
        affectedSymbols: sections.affectedSymbols ?? [],
        tags: sections.tags ?? [],
        references: sections.references ?? [],
        supersedes: [],
        revision: 1,
        createdAt: now,
        updatedAt: now,
        provenance: {
          source: input.provenance?.source ?? 'manual',
          ...(actor ? { actor } : {}),
        },
      };

      draft.records.push(record);

      if (number >= draft.nextNumber) {
        draft.nextNumber = number + 1;
      }

      const event = this.appendEvent(
        draft,
        record,
        input.provenance?.source === 'import' ? 'imported' : 'created',
        0,
        Object.keys(sections),
        requestHash
      );

      return { record: clone(record), idempotent: false, event };
    });
  }

  private applySections(
    draft: AdrStateV1,
    record: ArchitectureDecisionRecord,
    sections: NormalizedSections
  ): string[] {
    const changed: string[] = [];

    if (sections.title !== undefined && sections.title !== record.title) {
      record.title = sections.title;
      changed.push('title');
    }

    if (sections.context !== undefined && sections.context !== record.context) {
      record.context = sections.context;
      changed.push('context');
    }

    if (sections.decision !== undefined && sections.decision !== record.decision) {
      record.decision = sections.decision;
      changed.push('decision');
    }

    if (sections.consequences !== undefined) {
      record.consequences = sections.consequences;
      changed.push('consequences');
    }

    if (sections.alternatives !== undefined) {
      record.alternatives = sections.alternatives;
      changed.push('alternatives');
    }

    if (sections.affectedPaths !== undefined) {
      record.affectedPaths = sections.affectedPaths;
      changed.push('affectedPaths');
    }

    if (sections.affectedSymbols !== undefined) {
      record.affectedSymbols = sections.affectedSymbols;
      changed.push('affectedSymbols');
    }

    if (sections.tags !== undefined) {
      record.tags = sections.tags;
      changed.push('tags');
    }

    if (sections.references !== undefined) {
      record.references = sections.references;
      changed.push('references');
    }

    if (record.status === 'accepted' && !record.decision.trim()) {
      throw new AdrError('ADR_INVALID', 'An accepted ADR requires a non-empty decision');
    }

    void draft;

    return changed;
  }

  async update(
    reference: string,
    sections: AdrUpdatableSections,
    options: AdrMutationOptions = {}
  ): Promise<AdrMutationResult> {
    return this.applyMutation(reference, sections, options, 'updated');
  }

  /**
   * Byte-preserving section update: only the supplied sections are touched, all
   * other stored sections keep their exact previous value.
   */
  async setSections(
    reference: string,
    sections: AdrUpdatableSections,
    options: AdrMutationOptions = {}
  ): Promise<AdrMutationResult> {
    return this.applyMutation(reference, sections, options, 'sections_updated');
  }

  private async applyMutation(
    reference: string,
    sections: AdrUpdatableSections,
    options: AdrMutationOptions,
    operation: Extract<AdrOperation, 'updated' | 'sections_updated'>
  ): Promise<AdrMutationResult> {
    const normalized = normalizeSections(sections);
    const requestHash = hashPayload({ operation, reference: reference.trim(), sections });

    return this.mutate((draft) => {
      const record = this.resolveIn(draft, reference);

      if (!record) {
        throw new AdrError('ADR_NOT_FOUND', `ADR not found: ${reference}`, 404);
      }

      if (this.assertRevision(record, options, requestHash, draft)) {
        return { record: clone(record), idempotent: true };
      }

      const beforeRevision = record.revision;
      const changed = this.applySections(draft, record, normalized);

      if (changed.length === 0) {
        return { record: clone(record), idempotent: true };
      }

      record.revision = beforeRevision + 1;
      record.updatedAt = new Date().toISOString();

      const event = this.appendEvent(
        draft,
        record,
        operation,
        beforeRevision,
        changed,
        requestHash
      );

      return { record: clone(record), idempotent: false, event };
    });
  }

  async changeStatus(
    reference: string,
    status: AdrStatus,
    options: AdrMutationOptions = {}
  ): Promise<AdrMutationResult> {
    const requestHash = hashPayload({
      operation: 'status_changed',
      reference: reference.trim(),
      status,
    });

    return this.mutate((draft) => {
      const record = this.resolveIn(draft, reference);

      if (!record) {
        throw new AdrError('ADR_NOT_FOUND', `ADR not found: ${reference}`, 404);
      }

      if (this.assertRevision(record, options, requestHash, draft)) {
        return { record: clone(record), idempotent: true };
      }

      assertTransition(record.status, status);

      if (record.status === status) {
        return { record: clone(record), idempotent: true };
      }

      if (status === 'accepted' && !record.decision.trim()) {
        throw new AdrError('ADR_INVALID', 'An accepted ADR requires a non-empty decision');
      }

      const beforeRevision = record.revision;

      record.status = status;
      record.revision = beforeRevision + 1;
      record.updatedAt = new Date().toISOString();

      const event = this.appendEvent(
        draft,
        record,
        'status_changed',
        beforeRevision,
        ['status'],
        requestHash
      );

      return { record: clone(record), idempotent: false, event };
    });
  }

  /**
   * Atomic supersession: the old record becomes `superseded` and the replacement
   * records the reverse link in a single commit. No half-updates, no cycles.
   */
  async supersede(
    oldReference: string,
    newReference: string,
    options: AdrMutationOptions = {}
  ): Promise<AdrSupersedeResult> {
    const requestHash = hashPayload({
      operation: 'superseded',
      oldReference: oldReference.trim(),
      newReference: newReference.trim(),
    });

    return this.mutate((draft) => {
      const oldRecord = this.resolveIn(draft, oldReference);
      const newRecord = this.resolveIn(draft, newReference);

      if (!oldRecord) {
        throw new AdrError('ADR_NOT_FOUND', `ADR not found: ${oldReference}`, 404);
      }

      if (!newRecord) {
        throw new AdrError('ADR_NOT_FOUND', `ADR not found: ${newReference}`, 404);
      }

      if (oldRecord.id === newRecord.id) {
        throw new AdrError('ADR_SUPERSESSION_CYCLE', 'An ADR cannot supersede itself');
      }

      const latest = this.latestEvent(draft, oldRecord.id);

      if (latest?.requestHash === requestHash) {
        return {
          superseded: clone(oldRecord),
          replacement: clone(newRecord),
          idempotent: true,
          events: [],
        };
      }

      if (
        options.expectedRevision !== undefined &&
        options.expectedRevision !== oldRecord.revision
      ) {
        throw new AdrError(
          'ADR_CONFLICT',
          `ADR revision conflict for ${oldRecord.humanId}: expected ${options.expectedRevision}, current ${oldRecord.revision}`,
          409
        );
      }

      if (oldRecord.supersededBy === newRecord.humanId) {
        return {
          superseded: clone(oldRecord),
          replacement: clone(newRecord),
          idempotent: true,
          events: [],
        };
      }

      if (oldRecord.supersededBy && oldRecord.supersededBy !== newRecord.humanId) {
        throw new AdrError(
          'ADR_INVALID_TRANSITION',
          `${oldRecord.humanId} is already superseded by ${oldRecord.supersededBy}`
        );
      }

      /*
       * The new edge is `newRecord` -supersedes-> `oldRecord`. A cycle exists
       * only if `oldRecord` can already reach `newRecord` by walking the
       * `supersedes` relation. Guards both directions and is bounded.
       */
      const stack = [oldRecord.humanId];
      const visited = new Set<string>();

      while (stack.length > 0) {
        const current = stack.pop();

        if (!current || visited.has(current) || visited.size > 64) {
          continue;
        }

        visited.add(current);

        if (current === newRecord.humanId) {
          throw new AdrError(
            'ADR_SUPERSESSION_CYCLE',
            `Supersession cycle detected: ${newRecord.humanId} -> ${oldRecord.humanId}`
          );
        }

        const node = this.resolveIn(draft, current);

        for (const next of node?.supersedes ?? []) {
          stack.push(next);
        }
      }

      const oldBefore = oldRecord.revision;
      const newBefore = newRecord.revision;
      const now = new Date().toISOString();

      oldRecord.status = 'superseded';
      oldRecord.supersededBy = newRecord.humanId;
      oldRecord.revision = oldBefore + 1;
      oldRecord.updatedAt = now;

      newRecord.supersedes = Array.from(new Set([...newRecord.supersedes, oldRecord.humanId])).sort(
        (left, right) => left.localeCompare(right)
      );
      newRecord.revision = newBefore + 1;
      newRecord.updatedAt = now;

      const oldEvent = this.appendEvent(
        draft,
        oldRecord,
        'superseded',
        oldBefore,
        ['status', 'supersededBy'],
        requestHash
      );

      const newEvent = this.appendEvent(
        draft,
        newRecord,
        'superseded',
        newBefore,
        ['supersedes'],
        requestHash
      );

      return {
        superseded: clone(oldRecord),
        replacement: clone(newRecord),
        idempotent: false,
        events: [oldEvent, newEvent],
      };
    });
  }

  /**
   * Explicit, deterministic import of canonical ADR Markdown. Nothing is
   * inferred: a non-canonical document is rejected.
   */
  async importMarkdown(
    markdown: string,
    options: { number?: number; supersedes?: string[] } = {}
  ): Promise<AdrMutationResult> {
    const parsed = parseMarkdown(markdown);

    return this.create({
      title: parsed.title,
      context: parsed.context,
      decision: parsed.decision,
      status: parsed.status === 'superseded' ? 'accepted' : parsed.status,
      consequences: parsed.consequences,
      alternatives: parsed.alternatives,
      affectedPaths: parsed.affectedPaths,
      affectedSymbols: parsed.affectedSymbols,
      tags: parsed.tags,
      number: options.number ?? parsed.number,
      provenance: { source: 'import' },
    });
  }

  /* ---------------------------------------------------------------- *
   * Markdown projection (deterministic, server-controlled destination)
   * ---------------------------------------------------------------- */

  async exportMarkdown(reference: string, persist = false): Promise<AdrMarkdownExport> {
    const record = await this.get(reference);
    const filename = markdownFilename(record);
    const markdown = toMarkdown(record);

    if (!persist) {
      return {
        humanId: record.humanId,
        revision: record.revision,
        filename,
        markdown,
      };
    }

    const key = await this.store.writeMarkdown(filename, markdown);

    return {
      humanId: record.humanId,
      revision: record.revision,
      filename,
      markdown,
      key,
    };
  }

  /** Export every record, deterministically ordered. */
  async exportAll(): Promise<AdrMarkdownExport[]> {
    const state = await this.ensureState();

    const records = [...state.records].sort((left, right) => left.number - right.number);

    const output: AdrMarkdownExport[] = [];

    for (const record of records) {
      const filename = markdownFilename(record);
      const markdown = toMarkdown(record);

      const key = await this.store.writeMarkdown(filename, markdown);

      output.push({
        humanId: record.humanId,
        revision: record.revision,
        filename,
        markdown,
        key,
      });
    }

    return output;
  }
}
