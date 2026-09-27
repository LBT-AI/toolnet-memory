/*
 * Phase 84B — legacy resolution snapshot compatibility.
 *
 * The legacy snapshot format declared `version: 1` but used a different
 * `kind` vocabulary (`CALL`, `REFERENCE`, `EXTENDS`, `IMPLEMENTS`) than the
 * current one (`call`, `type`, `inheritance`, `implementation`, ...). Because
 * the numeric version never changed, a reader that compares `kind` against the
 * new literals silently skipped every legacy entry. This module is the single
 * translation point: nothing is dropped, and the original value is retained on
 * the entry as `legacyKind`.
 *
 * Declared in the store registry as legacy value domain `resolution_kind_uppercase`.
 */

import type { ResolutionKind, TypeResolution, TypeResolutionSnapshot } from './types.js';

export const LEGACY_RESOLUTION_KIND_DOMAIN = 'resolution_kind_uppercase' as const;

/** Legacy kind vocabulary mapped onto the current one. */
export const LEGACY_RESOLUTION_KIND_MAP: Readonly<Record<string, ResolutionKind>> = Object.freeze({
  CALL: 'call',
  REFERENCE: 'type',
  EXTENDS: 'inheritance',
  IMPLEMENTS: 'implementation',
});

const CANONICAL_KINDS: readonly string[] = [
  'call',
  'import',
  'type',
  'inheritance',
  'implementation',
  'member',
];

function isCanonical(kind: string): kind is ResolutionKind {
  return CANONICAL_KINDS.includes(kind);
}

/**
 * Resolve any observed kind value to a canonical one.
 *
 * Returns `undefined` when the value is not part of the known vocabulary at
 * all — callers must keep the entry rather than drop it.
 */
export function canonicalResolutionKind(kind: unknown): ResolutionKind | undefined {
  if (typeof kind !== 'string' || kind.length === 0) {
    return undefined;
  }

  if (isCanonical(kind)) {
    return kind;
  }

  /* Tolerate case-only variations before falling back to the legacy map. */
  const lowered = kind.toLowerCase();

  if (isCanonical(lowered)) {
    return lowered;
  }

  return LEGACY_RESOLUTION_KIND_MAP[kind.toUpperCase()];
}

function normalizeEntry(entry: TypeResolution): { entry: TypeResolution; rewritten: boolean } {
  const canonical = canonicalResolutionKind(entry.kind);

  if (canonical === undefined) {
    /* Unknown vocabulary: preserve the raw value verbatim for inspection. */
    return {
      entry: { ...entry, legacyKind: entry.legacyKind ?? String(entry.kind) },
      rewritten: false,
    };
  }

  if (canonical === entry.kind) {
    return { entry, rewritten: false };
  }

  return {
    entry: {
      ...entry,
      kind: canonical,
      legacyKind: entry.legacyKind ?? String(entry.kind),
    },
    rewritten: true,
  };
}

export interface NormalizedResolutionEntries {
  /** Canonical entries, same order and same count as the input. */
  resolutions: TypeResolution[];
  /** Number of entries whose kind was rewritten. */
  rewritten: number;
}

/** Normalize a resolution list without ever dropping an entry. */
export function normalizeTypeResolutions(
  resolutions: readonly TypeResolution[]
): NormalizedResolutionEntries {
  let rewritten = 0;

  const output = resolutions.map((entry) => {
    const normalized = normalizeEntry(entry);

    if (normalized.rewritten) {
      rewritten += 1;
    }

    return normalized.entry;
  });

  return { resolutions: output, rewritten };
}

export interface NormalizedResolutionSnapshot {
  snapshot: TypeResolutionSnapshot;
  rewritten: number;
}

/** Normalize a legacy `TypeResolutionSnapshot` in place-free form. */
export function normalizeTypeResolutionSnapshot(
  snapshot: TypeResolutionSnapshot
): NormalizedResolutionSnapshot {
  if (!Array.isArray(snapshot.resolutions)) {
    return { snapshot, rewritten: 0 };
  }

  const { resolutions, rewritten } = normalizeTypeResolutions(snapshot.resolutions);

  if (rewritten === 0) {
    return { snapshot, rewritten };
  }

  return { snapshot: { ...snapshot, resolutions }, rewritten };
}

/**
 * Produce the canonical on-disk form of a snapshot.
 *
 * Kinds are rewritten to the current vocabulary and the `legacyKind`
 * provenance marker is dropped once the mapping has been applied — a new write
 * must never carry the archived vocabulary forward. An entry whose kind is not
 * part of any known vocabulary keeps both its raw kind and its marker, so
 * information is never lost.
 */
export function canonicalizeTypeResolutionSnapshot(
  snapshot: TypeResolutionSnapshot
): TypeResolutionSnapshot {
  const normalized = normalizeTypeResolutionSnapshot(snapshot);

  if (!Array.isArray(normalized.snapshot.resolutions)) {
    return normalized.snapshot;
  }

  let stripped = false;

  const resolutions = normalized.snapshot.resolutions.map((entry) => {
    if (entry.legacyKind === undefined) {
      return entry;
    }

    if (canonicalResolutionKind(entry.kind) === undefined) {
      return entry;
    }

    const rest: TypeResolution = { ...entry };

    delete rest.legacyKind;

    stripped = true;

    return rest;
  });

  if (!stripped) {
    return normalized.snapshot;
  }

  return { ...normalized.snapshot, resolutions };
}
