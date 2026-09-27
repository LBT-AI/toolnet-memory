/*
 * Phase 77 — Local Coordination Daemon.
 *
 * A same-machine shared runtime for ToolNet clients. Not an authority for
 * Memory, Tasks, ADRs or any persistent knowledge; purely runtime coordination
 * over derived state.
 */

export * from './types.js';
export * from './limits.js';
export * from './fingerprint.js';
export * from './paths.js';
export * from './protocol.js';
export * from './registry.js';
export * from './single-flight.js';
export * from './log.js';
export * from './instance-lock.js';
export * from './server.js';
export * from './client.js';
export * from './bootstrap.js';
export * from './coordinators.js';
export * from './watcher-coordinator.js';
export * from './dependencies.js';
