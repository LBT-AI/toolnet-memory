/*
 * Phase 84B — storage compatibility model.
 *
 * The single entrypoint for "what kind of store is this, and what may a build
 * do with it". Consumers: store readers, release analysis, upgrade planning.
 */

export * from './types.js';
export * from './registry.js';
export * from './check.js';
