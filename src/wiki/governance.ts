import { createHash, randomUUID } from 'node:crypto';

import type { ProjectManifest } from '../core/types.js';

import type { WikiStorage } from './store.js';

import type { WikiPageV1 } from './types.js';

import { WikiError, WikiService } from './service.js';

const STATE_KEY = 'wiki/governance.v1.json';

const STATE_SCHEMA = 'toolnet.knowledge-governance.v1' as const;

const MAX_AUDIT_EVENTS = 500;

export type KnowledgeGovernanceSourceType = 'memory' | 'scene' | 'skill';

export type KnowledgeGovernanceReviewStatus = 'pending' | 'approved' | 'rejected' | 'superseded';

export type KnowledgeGovernanceRisk = 'normal' | 'critical' | 'conflict';

export interface KnowledgeGovernancePolicy {
  autoApproveThreshold: number;
  criticalApproveThreshold: number;
  staleAfterDays: number;
}

export interface KnowledgeGovernanceCandidate {
  sourceKey: string;
  sourceType: KnowledgeGovernanceSourceType;

  slug: string;

  marker: string;

  digest: string;

  title: string;

  summary?: string;

  content: string;

  tags: string[];
}

export interface KnowledgeGovernanceAssessment {
  confidence: number;

  risk: KnowledgeGovernanceRisk;

  requiresReview: boolean;

  reasons: string[];

  conflicts: string[];
}

export interface KnowledgeGovernanceReview {
  id: string;

  sourceKey: string;

  sourceType: KnowledgeGovernanceSourceType;

  slug: string;

  marker: string;

  digest: string;

  title: string;

  summary?: string;

  content: string;

  tags: string[];

  confidence: number;

  risk: KnowledgeGovernanceRisk;

  reasons: string[];

  conflicts: string[];

  status: KnowledgeGovernanceReviewStatus;

  createdAt: string;

  updatedAt: string;

  reviewedAt?: string;

  reviewedBy?: string;

  reviewNote?: string;

  appliedAt?: string;

  supersededBy?: string;

  mergedInto?: string;
}

export interface KnowledgeGovernanceAuditEvent {
  id: string;

  action: string;

  principal: string;

  reviewId?: string;

  sourceKey?: string;

  timestamp: string;

  metadata?: Record<string, unknown>;
}

export interface KnowledgeGovernanceStateV1 {
  schema: typeof STATE_SCHEMA;

  version: 1;

  projectId: string;

  policy: KnowledgeGovernancePolicy;

  reviews: KnowledgeGovernanceReview[];

  audit: KnowledgeGovernanceAuditEvent[];

  createdAt: string;

  updatedAt: string;
}

export interface KnowledgeGovernanceSummary {
  schema: 'toolnet.knowledge-governance-summary.v1';

  projectId: string;

  pending: number;

  approved: number;

  rejected: number;

  superseded: number;

  criticalPending: number;

  conflictPending: number;

  auditEvents: number;

  policy: KnowledgeGovernancePolicy;

  updatedAt: string;
}

export interface KnowledgeQualityReport {
  schema: 'toolnet.knowledge-quality.v1';

  totalPages: number;

  automatedPages: number;

  manualPages: number;

  stalePages: Array<{
    slug: string;
    title: string;
    updatedAt: string;
    ageDays: number;
  }>;

  duplicateTitles: Array<{
    title: string;
    pages: string[];
  }>;

  pendingReviews: number;

  lowConfidenceReviews: number;

  conflicts: number;

  generatedAt: string;
}

export interface KnowledgeGovernanceGateResult {
  allowed: boolean;

  mode: 'auto-approved' | 'review-approved' | 'pending-review' | 'rejected';

  assessment: KnowledgeGovernanceAssessment;

  review?: KnowledgeGovernanceReview;
}

export type KnowledgeReviewAction = 'approve' | 'reject' | 'supersede' | 'merge';

export interface KnowledgeReviewDecision {
  action: KnowledgeReviewAction;

  principal: string;

  note?: string;

  targetReviewId?: string;
}

const DEFAULT_POLICY: KnowledgeGovernancePolicy = {
  autoApproveThreshold: 0.86,
  criticalApproveThreshold: 0.94,
  staleAfterDays: 90,
};

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function digest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function normalizeTitle(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

function contentDigest(value: string): string {
  return createHash('sha256')
    .update(value.normalize('NFKC').replace(/\s+/gu, ' ').trim())
    .digest('hex');
}

function isCritical(candidate: KnowledgeGovernanceCandidate): boolean {
  const haystack = [
    candidate.title,
    candidate.summary ?? '',
    candidate.content.slice(0, 2000),
    ...candidate.tags,
  ]
    .join(' ')
    .toLowerCase();

  return /\b(?:architecture|security|authentication|authorization|auth|database|production|deploy|deployment|payment|billing|permission|permissions|acl|credential|secret|migration)\b/u.test(
    haystack
  );
}

function baseConfidence(candidate: KnowledgeGovernanceCandidate): number {
  let confidence =
    candidate.sourceType === 'skill' ? 0.96 : candidate.sourceType === 'memory' ? 0.94 : 0.88;

  const tags = candidate.tags.map((tag) => tag.toLowerCase());

  if (tags.includes('permanent') || tags.includes('task')) {
    confidence += 0.03;
  }

  if (candidate.content.length >= 200) {
    confidence += 0.02;
  }

  if (candidate.content.length < 80) {
    confidence -= 0.05;
  }

  if (candidate.title.length < 4) {
    confidence -= 0.05;
  }

  return clamp(confidence);
}

function initialState(projectId: string): KnowledgeGovernanceStateV1 {
  const now = new Date().toISOString();

  return {
    schema: STATE_SCHEMA,
    version: 1,
    projectId,
    policy: {
      ...DEFAULT_POLICY,
    },
    reviews: [],
    audit: [],
    createdAt: now,
    updatedAt: now,
  };
}

function validPolicy(value: Partial<KnowledgeGovernancePolicy>): KnowledgeGovernancePolicy {
  const autoApproveThreshold = value.autoApproveThreshold ?? DEFAULT_POLICY.autoApproveThreshold;

  const criticalApproveThreshold =
    value.criticalApproveThreshold ?? DEFAULT_POLICY.criticalApproveThreshold;

  const staleAfterDays = value.staleAfterDays ?? DEFAULT_POLICY.staleAfterDays;

  if (
    !Number.isFinite(autoApproveThreshold) ||
    autoApproveThreshold < 0.5 ||
    autoApproveThreshold > 1
  ) {
    throw new WikiError('Invalid autoApproveThreshold', 400);
  }

  if (
    !Number.isFinite(criticalApproveThreshold) ||
    criticalApproveThreshold < 0.5 ||
    criticalApproveThreshold > 1
  ) {
    throw new WikiError('Invalid criticalApproveThreshold', 400);
  }

  if (!Number.isInteger(staleAfterDays) || staleAfterDays < 1 || staleAfterDays > 3650) {
    throw new WikiError('Invalid staleAfterDays', 400);
  }

  return {
    autoApproveThreshold,
    criticalApproveThreshold,
    staleAfterDays,
  };
}

export class KnowledgeGovernanceStore {
  constructor(
    private readonly storage: WikiStorage,
    private readonly project: ProjectManifest
  ) {}

  async load(): Promise<KnowledgeGovernanceStateV1> {
    const text = await this.storage.getText(STATE_KEY);

    if (!text) {
      const state = initialState(this.project.id);

      await this.save(state);

      return state;
    }

    try {
      const parsed = JSON.parse(text) as Partial<KnowledgeGovernanceStateV1>;

      if (
        parsed.schema !== STATE_SCHEMA ||
        parsed.version !== 1 ||
        parsed.projectId !== this.project.id ||
        !Array.isArray(parsed.reviews) ||
        !Array.isArray(parsed.audit)
      ) {
        throw new Error('invalid');
      }

      return {
        ...(parsed as KnowledgeGovernanceStateV1),
        policy: validPolicy(parsed.policy ?? DEFAULT_POLICY),
      };
    } catch {
      const state = initialState(this.project.id);

      await this.save(state);

      return state;
    }
  }

  async save(state: KnowledgeGovernanceStateV1): Promise<void> {
    await this.storage.put(STATE_KEY, JSON.stringify(state, null, 2), 'application/json');
  }
}

export class KnowledgeGovernanceService {
  private state?: KnowledgeGovernanceStateV1;

  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly store: KnowledgeGovernanceStore) {}

  async initialize(): Promise<void> {
    await this.ensureState();
  }

  private async ensureState(): Promise<KnowledgeGovernanceStateV1> {
    if (!this.state) {
      this.state = await this.store.load();
    }

    return this.state;
  }

  private audit(
    state: KnowledgeGovernanceStateV1,
    action: string,
    principal: string,
    data: {
      reviewId?: string;
      sourceKey?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ): void {
    state.audit.push({
      id: randomUUID(),
      action,
      principal,
      ...(data.reviewId ? { reviewId: data.reviewId } : {}),
      ...(data.sourceKey ? { sourceKey: data.sourceKey } : {}),
      timestamp: new Date().toISOString(),
      ...(data.metadata ? { metadata: data.metadata } : {}),
    });

    if (state.audit.length > MAX_AUDIT_EVENTS) {
      state.audit = state.audit.slice(-MAX_AUDIT_EVENTS);
    }
  }

  private async mutate<T>(
    callback: (state: KnowledgeGovernanceStateV1) => T | Promise<T>
  ): Promise<T> {
    let output!: T;

    const current = this.queue.then(async () => {
      const state = await this.ensureState();

      output = await callback(state);

      state.updatedAt = new Date().toISOString();

      await this.store.save(state);
    });

    this.queue = current.then(
      () => undefined,
      () => undefined
    );

    await current;

    return output;
  }

  async policy(): Promise<KnowledgeGovernancePolicy> {
    return {
      ...(await this.ensureState()).policy,
    };
  }

  async setPolicy(
    policy: Partial<KnowledgeGovernancePolicy>,
    principal: string
  ): Promise<KnowledgeGovernancePolicy> {
    return this.mutate((state) => {
      state.policy = validPolicy({
        ...state.policy,
        ...policy,
      });

      this.audit(state, 'policy:update', principal, {
        metadata: {
          ...state.policy,
        },
      });

      return {
        ...state.policy,
      };
    });
  }

  async summary(): Promise<KnowledgeGovernanceSummary> {
    const state = await this.ensureState();

    const count = (status: KnowledgeGovernanceReviewStatus) =>
      state.reviews.filter((review) => review.status === status).length;

    return {
      schema: 'toolnet.knowledge-governance-summary.v1',
      projectId: state.projectId,
      pending: count('pending'),
      approved: count('approved'),
      rejected: count('rejected'),
      superseded: count('superseded'),
      criticalPending: state.reviews.filter(
        (review) => review.status === 'pending' && review.risk === 'critical'
      ).length,
      conflictPending: state.reviews.filter(
        (review) => review.status === 'pending' && review.risk === 'conflict'
      ).length,
      auditEvents: state.audit.length,
      policy: {
        ...state.policy,
      },
      updatedAt: state.updatedAt,
    };
  }

  async listReviews(
    status?: KnowledgeGovernanceReviewStatus
  ): Promise<KnowledgeGovernanceReview[]> {
    const state = await this.ensureState();

    return structuredClone(
      state.reviews
        .filter((review) => !status || review.status === status)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    );
  }

  async auditLog(limit = 100): Promise<KnowledgeGovernanceAuditEvent[]> {
    const state = await this.ensureState();

    const max = Math.max(1, Math.min(500, Math.floor(limit)));

    return structuredClone(state.audit.slice(-max).reverse());
  }

  async assess(
    candidate: KnowledgeGovernanceCandidate,
    pages: WikiPageV1[]
  ): Promise<KnowledgeGovernanceAssessment> {
    const state = await this.ensureState();

    const confidence = baseConfidence(candidate);

    const normalizedTitle = normalizeTitle(candidate.title);

    const conflicts = pages
      .filter(
        (page) =>
          page.slug !== candidate.slug &&
          normalizeTitle(page.title) === normalizedTitle &&
          contentDigest(page.content) !== contentDigest(candidate.content)
      )
      .map((page) => page.slug);

    const critical = isCritical(candidate);

    const reasons: string[] = [];

    if (confidence < state.policy.autoApproveThreshold) {
      reasons.push(`confidence:${confidence.toFixed(2)}`);
    }

    if (critical && confidence < state.policy.criticalApproveThreshold) {
      reasons.push('critical-knowledge');
    }

    if (conflicts.length > 0) {
      reasons.push('conflicting-knowledge');
    }

    const risk: KnowledgeGovernanceRisk =
      conflicts.length > 0 ? 'conflict' : critical ? 'critical' : 'normal';

    return {
      confidence,
      risk,
      requiresReview:
        conflicts.length > 0 ||
        confidence < state.policy.autoApproveThreshold ||
        (critical && confidence < state.policy.criticalApproveThreshold),
      reasons,
      conflicts,
    };
  }

  async gate(
    candidate: KnowledgeGovernanceCandidate,
    pages: WikiPageV1[]
  ): Promise<KnowledgeGovernanceGateResult> {
    const assessment = await this.assess(candidate, pages);

    return this.mutate((state) => {
      const same = state.reviews.find(
        (review) => review.sourceKey === candidate.sourceKey && review.digest === candidate.digest
      );

      if (same?.status === 'approved') {
        return {
          allowed: true,
          mode: 'review-approved',
          assessment,
          review: structuredClone(same),
        };
      }

      if (same?.status === 'rejected') {
        return {
          allowed: false,
          mode: 'rejected',
          assessment,
          review: structuredClone(same),
        };
      }

      if (!assessment.requiresReview) {
        this.audit(state, 'knowledge:auto-approved', 'system', {
          sourceKey: candidate.sourceKey,
          metadata: {
            confidence: assessment.confidence,
            risk: assessment.risk,
          },
        });

        return {
          allowed: true,
          mode: 'auto-approved',
          assessment,
        };
      }

      if (same?.status === 'pending') {
        return {
          allowed: false,
          mode: 'pending-review',
          assessment,
          review: structuredClone(same),
        };
      }

      const now = new Date().toISOString();

      const review: KnowledgeGovernanceReview = {
        id: randomUUID(),
        sourceKey: candidate.sourceKey,
        sourceType: candidate.sourceType,
        slug: candidate.slug,
        marker: candidate.marker,
        digest: candidate.digest,
        title: candidate.title,
        ...(candidate.summary
          ? {
              summary: candidate.summary,
            }
          : {}),
        content: candidate.content,
        tags: [...new Set([...candidate.tags, candidate.marker])],
        confidence: assessment.confidence,
        risk: assessment.risk,
        reasons: [...assessment.reasons],
        conflicts: [...assessment.conflicts],
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      };

      state.reviews.push(review);

      this.audit(state, 'knowledge:review-requested', 'system', {
        reviewId: review.id,
        sourceKey: review.sourceKey,
        metadata: {
          confidence: review.confidence,
          risk: review.risk,
        },
      });

      return {
        allowed: false,
        mode: 'pending-review',
        assessment,
        review: structuredClone(review),
      };
    });
  }

  async markApplied(sourceKey: string, digestValue: string): Promise<void> {
    await this.mutate((state) => {
      const review = state.reviews.find(
        (item) =>
          item.sourceKey === sourceKey && item.digest === digestValue && item.status === 'approved'
      );

      if (!review) {
        return;
      }

      review.appliedAt = new Date().toISOString();

      review.updatedAt = review.appliedAt;

      this.audit(state, 'knowledge:applied', review.reviewedBy ?? 'system', {
        reviewId: review.id,
        sourceKey,
      });
    });
  }

  async decide(
    reviewId: string,
    decision: KnowledgeReviewDecision,
    wiki: WikiService
  ): Promise<KnowledgeGovernanceReview> {
    return this.mutate(async (state) => {
      const review = state.reviews.find((item) => item.id === reviewId);

      if (!review) {
        throw new WikiError(`Governance review not found: ${reviewId}`, 404);
      }

      if (review.status !== 'pending') {
        throw new WikiError('Governance review is already resolved', 409);
      }

      const now = new Date().toISOString();

      review.reviewedAt = now;
      review.reviewedBy = decision.principal;
      review.updatedAt = now;

      if (decision.note?.trim()) {
        review.reviewNote = decision.note.trim();
      }

      if (decision.action === 'reject') {
        review.status = 'rejected';

        this.audit(state, 'knowledge:rejected', decision.principal, {
          reviewId,
          sourceKey: review.sourceKey,
        });

        return structuredClone(review);
      }

      if (decision.action === 'supersede') {
        review.status = 'superseded';

        if (decision.targetReviewId) {
          review.supersededBy = decision.targetReviewId;
        }

        this.audit(state, 'knowledge:superseded', decision.principal, {
          reviewId,
          sourceKey: review.sourceKey,
          metadata: {
            targetReviewId: decision.targetReviewId,
          },
        });

        return structuredClone(review);
      }

      if (decision.action === 'merge') {
        if (!decision.targetReviewId) {
          throw new WikiError('targetReviewId is required for merge', 400);
        }

        const target = state.reviews.find((item) => item.id === decision.targetReviewId);

        if (!target) {
          throw new WikiError('Merge target review not found', 404);
        }

        review.status = 'superseded';
        review.mergedInto = target.id;

        this.audit(state, 'knowledge:merged', decision.principal, {
          reviewId,
          sourceKey: review.sourceKey,
          metadata: {
            targetReviewId: target.id,
          },
        });

        return structuredClone(review);
      }

      review.status = 'approved';

      const pages = await wiki.listPages();

      const existing = pages.find((page) => page.slug === review.slug);

      if (existing && !existing.tags.includes(review.marker)) {
        throw new WikiError(`Wiki page '${review.slug}' is manually managed`, 409);
      }

      if (!existing) {
        await wiki.createPage({
          slug: review.slug,
          title: review.title,
          ...(review.summary
            ? {
                summary: review.summary,
              }
            : {}),
          content: review.content,
          tags: review.tags,
        });
      } else {
        await wiki.updatePage(review.slug, {
          title: review.title,
          summary: review.summary ?? '',
          content: review.content,
          tags: review.tags,
        });
      }

      review.appliedAt = now;

      this.audit(state, 'knowledge:approved', decision.principal, {
        reviewId,
        sourceKey: review.sourceKey,
      });

      return structuredClone(review);
    });
  }

  async quality(wiki: WikiService): Promise<KnowledgeQualityReport> {
    const state = await this.ensureState();

    const pages = await wiki.listPages();

    const now = Date.now();

    const staleMs = state.policy.staleAfterDays * 86_400_000;

    const stalePages = pages
      .map((page) => {
        const ageMs = now - Date.parse(page.updatedAt);

        return {
          slug: page.slug,
          title: page.title,
          updatedAt: page.updatedAt,
          ageDays: Math.max(0, Math.floor(ageMs / 86_400_000)),
          stale: Number.isFinite(ageMs) && ageMs > staleMs,
        };
      })
      .filter((item) => item.stale)
      .map(({ stale: _stale, ...item }) => item);

    const groups = new Map<string, WikiPageV1[]>();

    for (const page of pages) {
      const key = normalizeTitle(page.title);

      const group = groups.get(key) ?? [];

      group.push(page);

      groups.set(key, group);
    }

    const duplicateTitles = [...groups.entries()]
      .filter(([, group]) => group.length > 1)
      .map(([title, group]) => ({
        title,
        pages: group.map((page) => page.slug),
      }));

    const pending = state.reviews.filter((review) => review.status === 'pending');

    return {
      schema: 'toolnet.knowledge-quality.v1',
      totalPages: pages.length,
      automatedPages: pages.filter((page) =>
        page.tags.some((tag) => tag.startsWith('toolnet-auto-'))
      ).length,
      manualPages: pages.filter((page) => !page.tags.some((tag) => tag.startsWith('toolnet-auto-')))
        .length,
      stalePages,
      duplicateTitles,
      pendingReviews: pending.length,
      lowConfidenceReviews: pending.filter(
        (review) => review.confidence < state.policy.autoApproveThreshold
      ).length,
      conflicts: pending.filter((review) => review.risk === 'conflict').length,
      generatedAt: new Date().toISOString(),
    };
  }
}
