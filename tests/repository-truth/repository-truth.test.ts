import { existsSync, statSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  repositoryCapability,
  repositoryCapabilitySupported,
} from '../../src/core/repository-capabilities.js';

const REMOVED = [
  'src/sync/sync-engine.ts',
  'src/sync/upload-queue.ts',
  'src/retrieval/query-classifier.ts',
  'src/retrieval/query-expansion.ts',
  'src/retrieval/bm25/index.ts',
  'src/retrieval/hybrid/index.ts',
  'src/retrieval/graph/index.ts',
  'src/retrieval/reranker/index.ts',
  'src/mcp/tools/memory-rules.ts',
  'src/mcp/tools/memory-todos.ts',
  'src/mcp/tools/memory-decisions.ts',
  'src/mcp/tools/memory-recent.ts',
  'src/mcp/tools/index-repository.ts',
  'src/security/encryption.ts',
  'packages/cli/commands.ts',
  'packages/cli/index.ts',
];

describe('Phase 19 repository truth', () => {
  it('removes dead scaffolds', () => {
    for (const file of REMOVED) {
      expect(existsSync(file), file).toBe(false);
    }
  });

  it('keeps real retrieval implementations nonempty', () => {
    for (const file of [
      'src/retrieval/bm25.ts',
      'src/retrieval/hybrid-search.ts',
      'src/retrieval/retrieval-engine.ts',
    ]) {
      expect(existsSync(file), file).toBe(true);
      expect(statSync(file).size, file).toBeGreaterThan(0);
    }
  });

  it('declares unsupported storage honestly', () => {
    expect(repositoryCapabilitySupported('storage.google-drive')).toBe(false);
    expect(repositoryCapabilitySupported('storage.github')).toBe(false);
    expect(repositoryCapability('storage.google-drive')?.status).toBe('unsupported');
  });

  it('declares client-side encryption unsupported', () => {
    expect(repositoryCapabilitySupported('security.client-side-encryption')).toBe(false);
    expect(repositoryCapability('security.client-side-encryption')?.implementation).toBe('none');
  });

  it('points legacy sync at multi-host replacement', () => {
    const capability = repositoryCapability('sync.legacy-engine');
    expect(capability?.status).toBe('legacy-removed');
    expect(capability?.replacement).toBe('src/multi-host');
  });
});
