import type { MemoryEngine } from '../core/memory-engine.js';

import type { ProjectManifest } from '../core/types.js';

import type { RetrievalEngine } from '../retrieval/retrieval-engine.js';

import type { CodeGraphStore } from '../code-intelligence/graph/graph-store.js';

import type { ReferenceResolver } from '../code-intelligence/symbols/reference-resolver.js';

import type { SemanticCodeEngine } from '../code-intelligence/semantic/semantic-code-engine.js';

import type { MemoryStore } from '../storage/memory-store.js';

import type { StorageProvider } from '../storage/types.js';

export interface MCPContext {
  project: ProjectManifest;

  memory: MemoryEngine;

  retrieval: RetrievalEngine;

  graph: CodeGraphStore;

  references: ReferenceResolver;

  codeSemantic?: SemanticCodeEngine;

  memoryStore?: MemoryStore;

  storage?: StorageProvider;
}
