import type { MemoryFreshnessState, MemoryRecord, MemoryScope, MemoryType } from '../core/types.js';

export type MemoryLifetimeClass = 'permanent' | 'task' | 'session' | 'transient';

const DAY_MS = 86_400_000;

function validIso(value: unknown): string | undefined {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
    return undefined;
  }

  return new Date(value).toISOString();
}

function finiteConfidence(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }

  return Math.min(1, Math.max(0, value));
}

function metadataRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

export function inferMemoryScope(kind?: string, type?: MemoryType): MemoryScope {
  switch (kind) {
    case 'rule':
      return 'rule';
    case 'decision':
    case 'architecture':
      return 'decision';
    case 'fix':
    case 'context':
      return 'fact';
    case 'todo':
    case 'next_action':
      return 'observation';
  }

  switch (type) {
    case 'rule':
      return 'rule';
    case 'decision':
      return 'decision';
    case 'todo':
    case 'activity':
    case 'summary':
      return 'observation';
    case 'code':
      return 'fact';
  }

  return 'history';
}

export function inferMemoryLifetimeClass(kind?: string, type?: MemoryType): MemoryLifetimeClass {
  if (kind === 'rule') {
    return 'permanent';
  }

  if (kind === 'decision' || kind === 'todo' || kind === 'next_action' || kind === 'fix') {
    return 'task';
  }

  if (kind === 'architecture') {
    return 'session';
  }

  if (kind === 'context') {
    return 'session';
  }

  if (type === 'rule') {
    return 'permanent';
  }

  if (type === 'decision' || type === 'todo') {
    return 'task';
  }

  if (type === 'activity' || type === 'summary') {
    return 'session';
  }

  return 'session';
}

export function defaultMemoryStaleAfter(
  lifetime: MemoryLifetimeClass,
  observedAt: string
): string | undefined {
  const observed = Date.parse(observedAt);

  if (!Number.isFinite(observed) || lifetime === 'permanent') {
    return undefined;
  }

  const days = lifetime === 'task' ? 30 : lifetime === 'session' ? 14 : 1;

  return new Date(observed + days * DAY_MS).toISOString();
}

export function candidateVerifiedAt(input: {
  observedAt: string;
  evidence?: {
    userExplicit?: boolean;
    sourceVerified?: boolean;
    testVerified?: boolean;
  };
}): string | undefined {
  const evidence = input.evidence;

  if (
    evidence?.userExplicit === true ||
    evidence?.sourceVerified === true ||
    evidence?.testVerified === true
  ) {
    return validIso(input.observedAt);
  }

  return undefined;
}

export function deriveMemoryFreshness(
  memory: MemoryRecord,
  now: number = Date.now()
): MemoryFreshnessState {
  const metadata = metadataRecord(memory.metadata);
  const staleAfter = validIso(memory.staleAfter) ?? validIso(metadata.staleAfter);
  const expiresAt = validIso(memory.expiresAt);

  if (
    (staleAfter && Date.parse(staleAfter) <= now) ||
    (expiresAt && Date.parse(expiresAt) <= now)
  ) {
    return 'stale';
  }

  const confidence = finiteConfidence(memory.confidence) ?? finiteConfidence(metadata.confidence);

  if (confidence === undefined || confidence < 0.6) {
    return 'needs_verification';
  }

  const verifiedAt = validIso(memory.verifiedAt) ?? validIso(metadata.verifiedAt);

  if (!verifiedAt && confidence < 0.9) {
    return 'needs_verification';
  }

  return 'fresh';
}

export function normalizeMemoryScopeMetadata(memory: MemoryRecord): boolean {
  const metadata = metadataRecord(memory.metadata);
  const learningKind =
    typeof metadata.learningKind === 'string' ? metadata.learningKind : undefined;
  const currentScope =
    typeof memory.scope === 'string'
      ? memory.scope
      : typeof metadata.memoryScope === 'string'
        ? (metadata.memoryScope as MemoryScope)
        : undefined;
  const scope = currentScope ?? inferMemoryScope(learningKind, memory.type);
  const observedAt =
    validIso(memory.observedAt) ??
    validIso(metadata.observedAt) ??
    validIso(metadata.sourceCreatedAt) ??
    validIso(memory.createdAt) ??
    new Date(0).toISOString();
  const confidence = finiteConfidence(memory.confidence) ?? finiteConfidence(metadata.confidence);
  const evidence = metadataRecord(metadata.evidence);
  const verifiedAt =
    validIso(memory.verifiedAt) ??
    validIso(metadata.verifiedAt) ??
    candidateVerifiedAt({
      observedAt,
      evidence: {
        userExplicit: evidence.userExplicit === true,
        sourceVerified: evidence.sourceVerified === true,
        testVerified: evidence.testVerified === true,
      },
    });
  const rawLifetime = metadata.knowledgeClass;
  const lifetime: MemoryLifetimeClass =
    rawLifetime === 'permanent' ||
    rawLifetime === 'task' ||
    rawLifetime === 'session' ||
    rawLifetime === 'transient'
      ? rawLifetime
      : inferMemoryLifetimeClass(learningKind, memory.type);
  const staleAfter =
    validIso(memory.staleAfter) ??
    validIso(metadata.staleAfter) ??
    defaultMemoryStaleAfter(lifetime, observedAt);
  const provenance = metadataRecord(metadata.provenance);
  const sourcePaths = Array.isArray(provenance.sourcePaths) ? provenance.sourcePaths : [];
  const sourceRef =
    memory.sourceRef ??
    (typeof metadata.sourceRef === 'string' ? metadata.sourceRef : undefined) ??
    sourcePaths.find((value): value is string => typeof value === 'string');

  const nextMetadata: Record<string, unknown> = {
    ...metadata,
    memoryScope: scope,
    observedAt,
    confidence,
    knowledgeClass: lifetime,
    freshnessSchema: 1,
  };

  if (verifiedAt) {
    nextMetadata.verifiedAt = verifiedAt;
  }

  if (staleAfter) {
    nextMetadata.staleAfter = staleAfter;
  }

  if (sourceRef) {
    nextMetadata.sourceRef = sourceRef;
  }

  const before = JSON.stringify({
    scope: memory.scope,
    observedAt: memory.observedAt,
    verifiedAt: memory.verifiedAt,
    confidence: memory.confidence,
    staleAfter: memory.staleAfter,
    sourceRef: memory.sourceRef,
    metadata: memory.metadata,
  });

  memory.scope = scope;
  memory.observedAt = observedAt;
  memory.confidence = confidence;
  memory.verifiedAt = verifiedAt;
  memory.staleAfter = staleAfter;
  memory.sourceRef = sourceRef;
  memory.metadata = nextMetadata;

  return (
    before !==
    JSON.stringify({
      scope: memory.scope,
      observedAt: memory.observedAt,
      verifiedAt: memory.verifiedAt,
      confidence: memory.confidence,
      staleAfter: memory.staleAfter,
      sourceRef: memory.sourceRef,
      metadata: memory.metadata,
    })
  );
}
