import type { MemoryEngine } from '../core/memory-engine.js';

import type { ProjectManifest } from '../core/types.js';

import type { RetrievalEngine } from '../retrieval/retrieval-engine.js';

import type { CodeGraphStore } from '../code-intelligence/graph/graph-store.js';

import type { GraphCoverageEvaluator } from '../code-intelligence/graph-coverage/coverage-evaluator.js';

import type { CrossServiceSnapshot } from '../code-intelligence/cross-service/types.js';

import type { ReferenceResolver } from '../code-intelligence/symbols/reference-resolver.js';

import type { SemanticCodeEngine } from '../code-intelligence/semantic/semantic-code-engine.js';

import type { MemoryStore } from '../storage/memory-store.js';

import type { StorageProvider } from '../storage/types.js';

import type { FleetSnapshot } from '../code-intelligence/fleet/types.js';

import type { MCPRuntimeState } from './runtime-state.js';

import type { CodeIntelligenceRuntime } from '../code-intelligence/runtime/types.js';

export interface MCPContext {
  project: ProjectManifest;

  memory: MemoryEngine;

  retrieval: RetrievalEngine;

  graph: CodeGraphStore;

  references: ReferenceResolver;

  codeSemantic?: SemanticCodeEngine;

  memoryStore?: MemoryStore;

  storage?: StorageProvider;

  runtime?: MCPRuntimeState;

  /*
   * Phase 68: deterministic graph coverage & trust evaluator.
   *
   * Set after hydration when storage is available. Tools must handle a
   * missing evaluator (degraded/hydration-failed) and simply omit the
   * coverage field, preserving the previous output shape.
   */
  coverage?: GraphCoverageEvaluator;

  /*
   * Phase 72: derived cross-service snapshot (services, protocol links,
   * unresolved references). Missing snapshot degrades gracefully.
   */
  crossService?: CrossServiceSnapshot | null;

  /*
   * Phase 73: the unscoped (root) storage provider.
   *
   * Fleet state lives in its own namespace and must NOT be written through a
   * project-scoped provider; project graphs remain isolated.
   */
  rootStorage?: StorageProvider;

  /* Phase 73: derived Fleet snapshot (cross-project overlay). */
  fleet?: FleetSnapshot | null;

  /**
   * Phase 77: shared runtime abstraction.
   *
   * Served by the local coordination daemon when available, otherwise by an
   * in-process runtime. Tools must never branch on daemon presence themselves.
   */
  codeRuntime?: CodeIntelligenceRuntime;
}
