import { z } from 'zod';

import type { ProjectManifest } from '../../core/types.js';

import {
  defaultGovernancePolicy,
  KnowledgeGovernanceService,
  KnowledgeGovernanceStore,
  WikiService,
  WikiStore,
  wikiStateMetadata,
  type KnowledgeGovernanceClassification,
} from '../../wiki/index.js';

import type { WikiStorage } from '../../wiki/store.js';

export const knowledgeGovernanceStatusSchema = {
  includePending: z
    .boolean()
    .optional()
    .describe('Include compact pending-review metadata. Default false.'),
};

export interface KnowledgeGovernanceStatusInput {
  includePending?: boolean;
}

/*
 * Deliberately depend on WikiStorage rather than the full StorageProvider.
 *
 * Governance + Wiki status only need the persistence contract consumed by
 * WikiStore / KnowledgeGovernanceStore. A complete MCP StorageProvider still
 * satisfies this narrower interface, while focused tests may use lightweight
 * in-memory storage without implementing unrelated filesystem operations.
 */
export interface KnowledgeGovernanceStatusContext {
  project: ProjectManifest;
  storage?: WikiStorage;
}

/**
 * Read-only Wiki/governance state vocabulary.
 *
 * `unused` is a first-class healthy state: a project that never used the Wiki
 * has no state, and that is not an error. Failures are reported with the exact
 * cause instead of a generic "unavailable".
 */
export type KnowledgeSubsystemState =
  | 'unused'
  | 'current'
  | 'project_mismatch'
  | 'corrupt'
  | 'schema_unsupported'
  | 'revision_integrity_failed';

function governanceStateMetadata(
  classification: KnowledgeGovernanceClassification
): Record<string, unknown> {
  switch (classification.status) {
    case 'project_mismatch':
      return { status: classification.status, projectId: classification.projectId };
    case 'unsupported_schema':
      return { status: classification.status, reason: `version-${String(classification.version)}` };
    case 'corrupt':
      return { status: classification.status, reason: classification.reason };
    case 'current':
      return {
        status: classification.status,
        projectId: classification.state.projectId,
        reviews: classification.state.reviews.length,
        auditEvents: classification.state.audit.length,
      };
    default:
      return { status: classification.status };
  }
}

function loadable(state: { status: string }): boolean {
  return state.status === 'missing' || state.status === 'current' || state.status === 'empty';
}

/**
 * Phase 86E: this status tool is PURE.
 *
 * It never initialises, migrates or repairs Wiki/governance state. Previously
 * it called `initialize()` on both stores, which materialised empty state files
 * — and, on a project mismatch, destroyed the other project's governance state.
 */
export async function knowledgeGovernanceStatus(
  ctx: KnowledgeGovernanceStatusContext,
  input: KnowledgeGovernanceStatusInput
) {
  const storage = ctx.storage;

  if (!storage) {
    throw new Error('Knowledge Governance storage unavailable');
  }

  const wikiStore = new WikiStore(storage, ctx.project);
  const governanceStore = new KnowledgeGovernanceStore(storage, ctx.project);

  const [wikiState, governanceState] = await Promise.all([
    wikiStore.readState(),
    governanceStore.readState(),
  ]);

  const wikiMeta = wikiStateMetadata(wikiState);
  const governanceMeta = governanceStateMetadata(governanceState);

  const state = { wiki: wikiMeta, governance: governanceMeta };

  if (!loadable(wikiState) || !loadable(governanceState)) {
    const status: KnowledgeSubsystemState = !loadable(wikiState)
      ? (wikiState.status as KnowledgeSubsystemState)
      : (governanceState.status as KnowledgeSubsystemState);

    const guidance: string[] = [];

    if (status === 'project_mismatch') {
      guidance.push(
        'This storage root holds Wiki state for another ToolNet project.',
        'Open the owning project, or point this project at its own storage root.',
        'ToolNet will not adopt or rewrite the existing state.'
      );
    }

    if (status === 'schema_unsupported') {
      guidance.push('Upgrade ToolNet to the build that wrote this state.');
    }

    if (status === 'corrupt' || status === 'revision_integrity_failed') {
      guidance.push(
        'The original state file is preserved; ToolNet never overwrites it.',
        'Restore from backup or remove the file to start a fresh Wiki.'
      );
    }

    /*
     * The response shape is stable: readers always get `summary` and
     * `quality`. For a non-loadable state they are zeroed and the truth lives
     * in `status`, `state` and `guidance`.
     */
    return {
      schema: 'toolnet.knowledge-governance-status.v1' as const,
      status,
      buildRequired: false,
      state,
      guidance,
      summary: {
        schema: 'toolnet.knowledge-governance-summary.v1' as const,
        projectId: ctx.project.id,
        pending: 0,
        approved: 0,
        rejected: 0,
        superseded: 0,
        criticalPending: 0,
        conflictPending: 0,
        auditEvents: 0,
        policy: defaultGovernancePolicy(),
        updatedAt: new Date(0).toISOString(),
      },
      quality: { stalePages: 0, duplicateTitles: 0, pendingReviews: 0, conflicts: 0 },
    };
  }

  const wiki = new WikiService(wikiStore);
  const governance = new KnowledgeGovernanceService(governanceStore);

  const summary = await governance.summary();
  const quality = await governance.quality(wiki);

  const pending = input.includePending
    ? (await governance.listReviews('pending')).slice(0, 10).map((review) => ({
        id: review.id,
        sourceType: review.sourceType,
        title: review.title,
        confidence: review.confidence,
        risk: review.risk,
        reasons: review.reasons,
      }))
    : undefined;

  const status: KnowledgeSubsystemState =
    wikiState.status === 'missing' && governanceState.status === 'missing' ? 'unused' : 'current';

  return {
    schema: 'toolnet.knowledge-governance-status.v1' as const,
    status,
    buildRequired: false,
    state,
    summary,
    quality: {
      stalePages: quality.stalePages.length,
      duplicateTitles: quality.duplicateTitles.length,
      pendingReviews: quality.pendingReviews,
      conflicts: quality.conflicts,
    },
    ...(pending ? { pending } : {}),
  };
}
