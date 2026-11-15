/**
 * ToolNet v0.7 migration version constants.
 *
 * These constants define the schema versions handled by the migration system.
 * They are distinct from the runtime package version and represent the specific
 * legacy schema versions that the migration manager can process.
 */

/** Legacy schema version that this migration manager handles (v0.6.2). */
export const LEGACY_MIGRATION_SOURCE_VERSION = '0.6.2' as const;

/** Target schema version that migrations produce (v0.7.0). */
export const LEGACY_MIGRATION_TARGET_VERSION = '0.7.0' as const;

/** Migration identifier for the v0.6.2 → v0.7.0 transition. */
export const LEGACY_MIGRATION_IDENTIFIER =
  `${LEGACY_MIGRATION_SOURCE_VERSION}-${LEGACY_MIGRATION_TARGET_VERSION}` as const;
