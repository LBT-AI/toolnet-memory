import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const readme = readFileSync('README.md', 'utf8');

const runtimeTruth = readFileSync('docs/runtime-truth.md', 'utf8');

describe('Phase 21 documentation truth', () => {
  it('documents the actual local code search engine', () => {
    expect(readme).toContain('Local Code Search — SQLite FTS5/BM25');

    expect(runtimeTruth).toContain('Mode:   lexical');
  });
  it('documents unsupported languages', () => {
    expect(readme).toContain('Python');
    expect(readme).toContain('Go');
    expect(readme).toContain('Rust');
  });
  it('documents cross-machine identity adoption', () => {
    expect(readme).toContain('toolnet-memory init --adopt-remote <remote-name>');
    expect(readme).toContain('toolnet-memory init --no-remote-identity');
  });
  it('declares optional remote client-side encryption supported', () => {
    expect(runtimeTruth).toContain(
      'Optional remote client-side encryption is implemented with AES-256-GCM.'
    );
    expect(runtimeTruth).toMatch(/mandatory encryption key\s*\|\s*no/u);
  });
  it('keeps compatibility names explicit', () => {
    expect(runtimeTruth).toContain('SemanticCodeEngine');
    expect(runtimeTruth).toContain('semantic_code_search');
    expect(runtimeTruth).toContain('toolnet-memory semantic');
  });
});
