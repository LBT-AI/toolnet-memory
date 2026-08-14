import type { MemoryHubScope, MemoryHubService } from '../../hub/index.js';

import {
  KnowledgeGovernanceService,
  type KnowledgeGovernanceReviewStatus,
  type KnowledgeReviewAction,
  type KnowledgeGovernancePolicy,
  type WikiService,
  WikiError,
} from '../../wiki/index.js';

async function requireScope(
  hub: MemoryHubService,
  principal: string,
  scope: MemoryHubScope
): Promise<void> {
  if (!(await hub.authorize(principal, scope))) {
    throw new WikiError(`Principal '${principal}' lacks '${scope}'`, 403);
  }
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new WikiError('Invalid governance request', 400);
  }

  return value as Record<string, unknown>;
}

export async function apiGovernanceSummary(
  governance: KnowledgeGovernanceService,
  hub: MemoryHubService,
  principal: string
) {
  await requireScope(hub, principal, 'governance:read');

  return {
    schema: 'toolnet.api-governance-summary.v1',
    governance: await governance.summary(),
  };
}

export async function apiGovernanceReviews(
  governance: KnowledgeGovernanceService,
  hub: MemoryHubService,
  principal: string,
  status?: string
) {
  await requireScope(hub, principal, 'governance:read');

  const allowed = new Set(['pending', 'approved', 'rejected', 'superseded']);

  if (status && !allowed.has(status)) {
    throw new WikiError('Invalid review status', 400);
  }

  return {
    schema: 'toolnet.api-governance-reviews.v1',
    reviews: await governance.listReviews(status as KnowledgeGovernanceReviewStatus | undefined),
  };
}

export async function apiGovernanceReviewDecision(
  governance: KnowledgeGovernanceService,
  wiki: WikiService,
  hub: MemoryHubService,
  principal: string,
  reviewId: string,
  value: unknown
) {
  await requireScope(hub, principal, 'governance:write');

  const input = object(value);

  const action = input.action;

  if (action !== 'approve' && action !== 'reject' && action !== 'supersede' && action !== 'merge') {
    throw new WikiError('Invalid governance action', 400);
  }

  if (input.note !== undefined && typeof input.note !== 'string') {
    throw new WikiError('Invalid review note', 400);
  }

  if (input.targetReviewId !== undefined && typeof input.targetReviewId !== 'string') {
    throw new WikiError('Invalid targetReviewId', 400);
  }

  return {
    schema: 'toolnet.api-governance-review.v1',
    review: await governance.decide(
      reviewId,
      {
        action: action as KnowledgeReviewAction,
        principal,
        ...(typeof input.note === 'string'
          ? {
              note: input.note,
            }
          : {}),
        ...(typeof input.targetReviewId === 'string'
          ? {
              targetReviewId: input.targetReviewId,
            }
          : {}),
      },
      wiki
    ),
  };
}

export async function apiGovernanceQuality(
  governance: KnowledgeGovernanceService,
  wiki: WikiService,
  hub: MemoryHubService,
  principal: string
) {
  await requireScope(hub, principal, 'governance:read');

  return {
    schema: 'toolnet.api-knowledge-quality.v1',
    quality: await governance.quality(wiki),
  };
}

export async function apiGovernancePolicy(
  governance: KnowledgeGovernanceService,
  hub: MemoryHubService,
  principal: string
) {
  await requireScope(hub, principal, 'governance:read');

  return {
    schema: 'toolnet.api-governance-policy.v1',
    policy: await governance.policy(),
  };
}

export async function apiGovernanceSetPolicy(
  governance: KnowledgeGovernanceService,
  hub: MemoryHubService,
  principal: string,
  value: unknown
) {
  await requireScope(hub, principal, 'governance:write');

  const input = object(value);

  const policy: Partial<KnowledgeGovernancePolicy> = {};

  if (input.autoApproveThreshold !== undefined) {
    if (typeof input.autoApproveThreshold !== 'number') {
      throw new WikiError('Invalid autoApproveThreshold', 400);
    }

    policy.autoApproveThreshold = input.autoApproveThreshold;
  }

  if (input.criticalApproveThreshold !== undefined) {
    if (typeof input.criticalApproveThreshold !== 'number') {
      throw new WikiError('Invalid criticalApproveThreshold', 400);
    }

    policy.criticalApproveThreshold = input.criticalApproveThreshold;
  }

  if (input.staleAfterDays !== undefined) {
    if (typeof input.staleAfterDays !== 'number') {
      throw new WikiError('Invalid staleAfterDays', 400);
    }

    policy.staleAfterDays = input.staleAfterDays;
  }

  return {
    schema: 'toolnet.api-governance-policy.v1',
    policy: await governance.setPolicy(policy, principal),
  };
}

export async function apiGovernanceAudit(
  governance: KnowledgeGovernanceService,
  hub: MemoryHubService,
  principal: string,
  limit: number
) {
  await requireScope(hub, principal, 'governance:read');

  return {
    schema: 'toolnet.api-governance-audit.v1',
    events: await governance.auditLog(limit),
  };
}
