/*
 * Phase 76 — Portable Code Intelligence Artifact.
 *
 * DERIVED STATE ONLY.
 *
 * An artifact transports rebuildable code-intelligence state between machines.
 * It is never an authority for Memory, Tasks, Sessions, the Task WAL, ADRs, the
 * Wiki or the Project Manual, and hydration can only ever write the fixed
 * component keys declared in `components.ts`.
 */

export * from './types.js';
export * from './limits.js';
export * from './integrity.js';
export * from './serializer.js';
export * from './components.js';
export * from './fingerprint.js';
export * from './manifest.js';
export * from './archive.js';
export * from './collection.js';
export * from './compatibility.js';
export * from './store.js';
export * from './staging.js';
export * from './retention.js';
export * from './downloader.js';
export * from './publisher.js';
export * from './hydrator.js';
export * from './diagnostics.js';
