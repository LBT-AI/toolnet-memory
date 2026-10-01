/*
 * Phase 86E — Wiki / Knowledge state model.
 *
 * ToolNet ships three global knowledge state files at the shared storage root:
 *
 *   wiki/state.v1.json         (WikiStateV1)
 *   wiki/governance.v1.json    (KnowledgeGovernanceStateV1)
 *   wiki/automation.v1.json    (WikiAutomationLedgerV1)
 *
 * Each one carries the owning `projectId`. Because the keys are global, more
 * than one project can see the same file. Before Phase 86E a project mismatch
 * was indistinguishable from corruption, and the governance loader *overwrote*
 * the state with an empty one for the caller's project — silently destroying
 * another project's reviews and audit log.
 *
 * This module is the single deterministic classifier for that state:
 *
 *   missing            -> a valid unused subsystem (never corruption)
 *   empty              -> valid, zero pages
 *   current            -> readable, owned by this project
 *   project_mismatch   -> owned by another project (never adopted, never rewritten)
 *   unsupported_schema -> written by a newer ToolNet (never downgraded)
 *   revision_integrity_failed -> readable JSON, broken internal references
 *   corrupt            -> unparseable or schema-invalid
 *
 * Nothing here mutates storage.
 */

import type { WikiStateV1 } from './types.js';

export const WIKI_SCHEMA = 'toolnet.wiki.v1' as const;

export const WIKI_SCHEMA_VERSION = 1;

/** Bounded state: a Wiki is knowledge, not a transcript dump. */
export const MAX_WIKI_PAGES = 5_000;

export const MAX_WIKI_REVISIONS = 20_000;

export type WikiStateErrorCode =
  | 'WIKI_STATE_CORRUPT'
  | 'WIKI_SCHEMA_UNSUPPORTED'
  | 'WIKI_PROJECT_MISMATCH'
  | 'WIKI_REVISION_INTEGRITY_FAILED';

export class WikiStateError extends Error {
  readonly code: WikiStateErrorCode;

  readonly statusCode: number;

  readonly projectId?: string;

  readonly expectedProjectId?: string;

  constructor(
    code: WikiStateErrorCode,
    message: string,
    options: {
      statusCode?: number;
      projectId?: string;
      expectedProjectId?: string;
    } = {}
  ) {
    super(message);

    this.name = 'WikiStateError';

    this.code = code;

    this.statusCode = options.statusCode ?? 500;

    if (options.projectId) {
      this.projectId = options.projectId;
    }

    if (options.expectedProjectId) {
      this.expectedProjectId = options.expectedProjectId;
    }
  }
}

export function isWikiStateError(value: unknown): value is WikiStateError {
  return value instanceof WikiStateError;
}

export type WikiStateClassification =
  | { status: 'missing' }
  | { status: 'empty'; state: WikiStateV1 }
  | { status: 'current'; state: WikiStateV1 }
  | { status: 'project_mismatch'; projectId: string; expectedProjectId: string }
  | {
      status: 'unsupported_schema';
      schema?: string;
      version?: number;
      supportedSchema: string;
      supportedVersion: number;
    }
  | { status: 'revision_integrity_failed'; orphanRevisions: number; missingRevisions: number }
  | { status: 'corrupt'; reason: string };

export function wikiInitialState(projectId: string): WikiStateV1 {
  const now = new Date().toISOString();

  return {
    schema: WIKI_SCHEMA,
    version: WIKI_SCHEMA_VERSION,
    projectId,
    pages: [],
    revisions: [],
    createdAt: now,
    updatedAt: now,
  };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function finiteInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) ? value : undefined;
}

function isNonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Internal reference integrity.
 *
 * A revision must point at a page that exists, and every page must have at
 * least one revision. A state that parses but fails this is reported as an
 * integrity error — never as "empty".
 */
function integrityOf(state: WikiStateV1): {
  orphanRevisions: number;
  missingRevisions: number;
} {
  const pageIds = new Set(state.pages.map((page) => page.id));

  const revisionsByPage = new Map<string, number>();

  for (const revision of state.revisions) {
    revisionsByPage.set(revision.pageId, (revisionsByPage.get(revision.pageId) ?? 0) + 1);
  }

  const orphanRevisions = state.revisions.filter(
    (revision) => !pageIds.has(revision.pageId)
  ).length;

  const missingRevisions = state.pages.filter(
    (page) => (revisionsByPage.get(page.id) ?? 0) === 0
  ).length;

  return { orphanRevisions, missingRevisions };
}

export function classifyWikiState(text: string | null, projectId: string): WikiStateClassification {
  if (!text) {
    return { status: 'missing' };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    return { status: 'corrupt', reason: 'json-unparseable' };
  }

  const value = asRecord(parsed);

  if (!value) {
    return { status: 'corrupt', reason: 'not-an-object' };
  }

  const schema = typeof value.schema === 'string' ? value.schema : undefined;

  const version = finiteInteger(value.version);

  if (schema !== WIKI_SCHEMA || version !== WIKI_SCHEMA_VERSION) {
    /*
     * A future ToolNet version must never be downgraded or reinterpreted. A
     * different schema with the current version is corruption; a higher
     * version is unsupported.
     */
    if (version !== undefined && version > WIKI_SCHEMA_VERSION) {
      return {
        status: 'unsupported_schema',
        ...(schema ? { schema } : {}),
        version,
        supportedSchema: WIKI_SCHEMA,
        supportedVersion: WIKI_SCHEMA_VERSION,
      };
    }

    return { status: 'corrupt', reason: 'schema-mismatch' };
  }

  if (!isNonEmptyString(value.projectId)) {
    return { status: 'corrupt', reason: 'missing-project-id' };
  }

  const stateProjectId = value.projectId as string;

  if (stateProjectId !== projectId) {
    return { status: 'project_mismatch', projectId: stateProjectId, expectedProjectId: projectId };
  }

  if (!Array.isArray(value.pages) || !Array.isArray(value.revisions)) {
    return { status: 'corrupt', reason: 'invalid-collections' };
  }

  if (value.pages.length > MAX_WIKI_PAGES || value.revisions.length > MAX_WIKI_REVISIONS) {
    return { status: 'corrupt', reason: 'state-too-large' };
  }

  for (const page of value.pages) {
    const record = asRecord(page);

    if (
      !record ||
      !isNonEmptyString(record.id) ||
      !isNonEmptyString(record.slug) ||
      !isNonEmptyString(record.title) ||
      typeof record.content !== 'string'
    ) {
      return { status: 'corrupt', reason: 'invalid-page' };
    }
  }

  for (const revision of value.revisions) {
    const record = asRecord(revision);

    if (
      !record ||
      !isNonEmptyString(record.id) ||
      !isNonEmptyString(record.pageId) ||
      !isNonEmptyString(record.slug)
    ) {
      return { status: 'corrupt', reason: 'invalid-revision' };
    }
  }

  if (!isNonEmptyString(value.createdAt) || !isNonEmptyString(value.updatedAt)) {
    return { status: 'corrupt', reason: 'invalid-timestamps' };
  }

  const state = value as unknown as WikiStateV1;

  const integrity = integrityOf(state);

  if (integrity.orphanRevisions > 0 || integrity.missingRevisions > 0) {
    return { status: 'revision_integrity_failed', ...integrity };
  }

  return state.pages.length === 0 ? { status: 'empty', state } : { status: 'current', state };
}

/**
 * Turn a non-loadable classification into a typed error. Returns null for
 * `missing`/`empty`/`current`.
 */
export function wikiStateToError(classification: WikiStateClassification): WikiStateError | null {
  switch (classification.status) {
    case 'project_mismatch':
      return new WikiStateError(
        'WIKI_PROJECT_MISMATCH',
        [
          'Wiki state belongs to a different ToolNet project.',
          `state projectId: ${classification.projectId}`,
          `current projectId: ${classification.expectedProjectId}`,
          'ToolNet never adopts or rewrites another project\u2019s Wiki state.',
        ].join(' '),
        {
          statusCode: 409,
          projectId: classification.projectId,
          expectedProjectId: classification.expectedProjectId,
        }
      );
    case 'unsupported_schema':
      return new WikiStateError(
        'WIKI_SCHEMA_UNSUPPORTED',
        [
          'Wiki state was written by a newer ToolNet version.',
          `state version: ${String(classification.version)}`,
          `supported version: ${String(classification.supportedVersion)}`,
          'Upgrade ToolNet; the existing state is left untouched.',
        ].join(' '),
        { statusCode: 409 }
      );
    case 'revision_integrity_failed':
      return new WikiStateError(
        'WIKI_REVISION_INTEGRITY_FAILED',
        [
          'Wiki state revision history is inconsistent.',
          `orphan revisions: ${String(classification.orphanRevisions)}`,
          `pages without revisions: ${String(classification.missingRevisions)}`,
        ].join(' '),
        { statusCode: 409 }
      );
    case 'corrupt':
      return new WikiStateError(
        'WIKI_STATE_CORRUPT',
        `Wiki state is corrupt (${classification.reason}). The original file is preserved.`,
        { statusCode: 422 }
      );
    default:
      return null;
  }
}

/**
 * Content-free classification metadata for status/doctor/MCP surfaces.
 */
export function wikiStateMetadata(classification: WikiStateClassification): {
  status: WikiStateClassification['status'];
  projectId?: string;
  pages?: number;
  revisions?: number;
  reason?: string;
} {
  switch (classification.status) {
    case 'project_mismatch':
      return { status: classification.status, projectId: classification.projectId };
    case 'unsupported_schema':
      return { status: classification.status, reason: `version-${String(classification.version)}` };
    case 'corrupt':
      return { status: classification.status, reason: classification.reason };
    case 'revision_integrity_failed':
      return { status: classification.status, reason: 'revision-integrity' };
    case 'empty':
    case 'current':
      return {
        status: classification.status,
        projectId: classification.state.projectId,
        pages: classification.state.pages.length,
        revisions: classification.state.revisions.length,
      };
    default:
      return { status: classification.status };
  }
}

/**
 * Deterministic migration into the current schema.
 *
 * Only the current version is supported today, so the transform is the
 * identity: validate, then return. It exists as a real, tested path so the
 * migration contract (validate -> transform -> write -> verify -> preserve)
 * is in place before a second schema version ever ships. Unsupported or
 * future versions throw instead of being rewritten.
 */
export function migrateWikiState(
  text: string,
  projectId: string
): { state: WikiStateV1; migrated: boolean; fromVersion: number } {
  const classification = classifyWikiState(text, projectId);

  switch (classification.status) {
    case 'current':
    case 'empty':
      return {
        state: classification.state,
        migrated: false,
        fromVersion: classification.state.version,
      };
    case 'project_mismatch':
    case 'unsupported_schema':
    case 'revision_integrity_failed':
    case 'corrupt': {
      const error = wikiStateToError(classification);

      throw error ?? new WikiStateError('WIKI_STATE_CORRUPT', 'Wiki state is not loadable.');
    }
    default:
      throw new WikiStateError('WIKI_STATE_CORRUPT', 'Wiki state is missing; nothing to migrate.');
  }
}
