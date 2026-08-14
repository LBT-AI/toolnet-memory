import { z } from 'zod';

import type { ProjectManifest } from '../../core/types.js';

import {
  KnowledgeGovernanceService,
  KnowledgeGovernanceStore,
  WikiService,
  WikiStore,
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

export async function knowledgeGovernanceStatus(
  ctx: KnowledgeGovernanceStatusContext,
  input: KnowledgeGovernanceStatusInput
) {
  const storage = ctx.storage;

  if (!storage) {
    throw new Error('Knowledge Governance storage unavailable');
  }
  const governance = new KnowledgeGovernanceService(
    new KnowledgeGovernanceStore(storage, ctx.project)
  );

  await governance.initialize();

  const wiki = new WikiService(new WikiStore(storage, ctx.project));

  await wiki.initialize();

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

  return {
    schema: 'toolnet.knowledge-governance-status.v1',
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
