/*
 * Phase 84C — the authority migration registry.
 *
 * An authority migration is only legitimate when it is:
 *
 *   - explicit   (declared here, nowhere else),
 *   - versioned  (`fromVersions` -> `toVersion`),
 *   - backed up  (the orchestration backs up authority before running it),
 *   - verified   (the orchestration re-reads the result before continuing).
 *
 * The table is intentionally EMPTY today. Every authority store in the 84B
 * registry is still at schema v1, so there is nothing to migrate; declaring a
 * migration "for the future" would be an untested code path guarding data that
 * cannot exist. A legacy authority payload with no declaration here is a hard
 * blocker, which is exactly the safe answer.
 *
 * Adding an entry is the whole interface for a future authority schema change.
 */

import type { StoreKind } from '../../storage/compatibility/index.js';

export interface AuthorityMigration {
  /** Stable identifier recorded in the upgrade plan. */
  id: string;
  kind: StoreKind;
  /** On-disk schema versions this migration accepts. */
  fromVersions: readonly number[];
  /** Schema version the store has after the migration. */
  toVersion: number;
  description: string;
}

export const AUTHORITY_MIGRATIONS: readonly AuthorityMigration[] = Object.freeze([]);

/**
 * The declared migration that moves `kind` from `detectedVersion` forward.
 *
 * Returns `undefined` when no migration exists — the caller must treat that as
 * a blocker, never as "nothing to do".
 */
export function authorityMigrationFor(
  kind: string,
  detectedVersion: number,
  migrations: readonly AuthorityMigration[] = AUTHORITY_MIGRATIONS
): AuthorityMigration | undefined {
  return migrations.find(
    (migration) => migration.kind === kind && migration.fromVersions.includes(detectedVersion)
  );
}
