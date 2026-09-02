import { describe, expect, it } from 'vitest';

import {
  LOCAL_CODE_SEARCH_CONTRACT,
  LOCAL_CODE_SEARCH_DISPLAY_NAME,
  LOCAL_CODE_SEARCH_ENGINE,
  LOCAL_CODE_SEARCH_MODE,
} from '../../src/code-intelligence/semantic/search-contract.js';

describe('Phase 20 local code search naming', () => {
  it('declares the real search engine', () => {
    expect(LOCAL_CODE_SEARCH_ENGINE).toBe('sqlite-fts5-bm25');

    expect(LOCAL_CODE_SEARCH_MODE).toBe('lexical');
    expect(LOCAL_CODE_SEARCH_DISPLAY_NAME).toBe('Local Code Search — SQLite FTS5/BM25');
  });
  it('does not claim semantic vector capabilities', () => {
    expect(LOCAL_CODE_SEARCH_CONTRACT.semantic).toBe(false);
    expect(LOCAL_CODE_SEARCH_CONTRACT.embedding).toBe(false);
    expect(LOCAL_CODE_SEARCH_CONTRACT.vectorDatabase).toBe(false);
    expect(LOCAL_CODE_SEARCH_CONTRACT.networkRequired).toBe(false);
  });
  it('keeps historical compatibility aliases', () => {
    expect(LOCAL_CODE_SEARCH_CONTRACT.compatibilityAliases).toContain('SemanticCodeEngine');
    expect(LOCAL_CODE_SEARCH_CONTRACT.compatibilityAliases).toContain('semantic_code_search');
    expect(LOCAL_CODE_SEARCH_CONTRACT.compatibilityAliases).toContain('toolnet-memory semantic');
  });
});
