/*
 * Phase 84C — observing the stores that actually exist.
 *
 * The planner must reason about real on-disk state, never about the stores the
 * build happens to declare. So this module reports only stores that exist, and
 * reports a schema version only when the payload actually carries one.
 *
 * It is deliberately read-only and deliberately quiet: a file that cannot be
 * read yields an observation without a version marker, and the 84B contract
 * then decides what that means. Nothing is inferred that is not present.
 */

import { existsSync, readFileSync } from 'node:fs';

import { join } from 'node:path';

import type { StoreKind } from '../../storage/compatibility/index.js';
import type { StoreObservation } from './types.js';

/**
 * Local stores worth inspecting before an upgrade.
 *
 * Remote-only stores (the graph and resolution snapshots) are not listed: they
 * are derived and rebuilt lazily by their own code paths, and reading them
 * would mean a network round trip inside an upgrade plan.
 */
const LOCAL_STORE_FILES: readonly { path: string; kind: StoreKind }[] = [
  { path: '.toolnet/project.json', kind: 'project_manifest' },
  { path: '.toolnet/tasks/events.jsonl', kind: 'task_operations' },
  { path: '.toolnet/tasks/state.json', kind: 'task_projection' },
  { path: '.toolnet/tasks/replication/cursor.json', kind: 'task_replication_cursor' },
  { path: '.toolnet/retrieval/feedback.jsonl', kind: 'retrieval_feedback' },
  { path: '.toolnet/retrieval/telemetry.jsonl', kind: 'retrieval_telemetry' },
  { path: '.toolnet/retrieval/overrides.json', kind: 'retrieval_overrides' },
];

/*
 * A store's own version marker, however the store spells it. The 84B registry
 * already declares each store's current schema version; this only reports what
 * the payload says, and never corrects it.
 */
function versionOf(value: unknown): number | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;

  const candidate = record.schemaVersion ?? record.version;

  return Number.isSafeInteger(candidate) && (candidate as number) >= 1
    ? (candidate as number)
    : undefined;
}

/**
 * The schema version declared by a payload.
 *
 * Pretty-printed JSON objects and newline-delimited JSON logs are both real
 * shapes in this codebase, so both are accepted and nothing else is guessed at.
 */
export function readSchemaVersionMarker(text: string): number | undefined {
  const trimmed = text.trim();

  if (!trimmed) {
    return undefined;
  }

  try {
    return versionOf(JSON.parse(trimmed));
  } catch {
    /* Not a single JSON document; try the first line of a JSONL log. */
  }

  const firstLine = trimmed.split('\n')[0]?.trim();

  if (!firstLine) {
    return undefined;
  }

  try {
    return versionOf(JSON.parse(firstLine));
  } catch {
    return undefined;
  }
}

/** Every local store that exists, deterministically ordered by kind. */
export function collectLocalStoreObservations(rootPath: string): StoreObservation[] {
  const observations: StoreObservation[] = [];

  for (const store of LOCAL_STORE_FILES) {
    const file = join(rootPath, ...store.path.split('/'));

    if (!existsSync(file)) {
      continue;
    }

    let detectedVersion: number | undefined;

    try {
      detectedVersion = readSchemaVersionMarker(readFileSync(file, 'utf8'));
    } catch {
      /* Unreadable payload: no marker, and the contract decides what that means. */
    }

    observations.push({
      kind: store.kind,
      ...(detectedVersion !== undefined ? { detectedVersion } : {}),
    });
  }

  return observations.sort((left, right) => left.kind.localeCompare(right.kind));
}
