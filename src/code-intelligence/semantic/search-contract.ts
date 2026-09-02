export const LOCAL_CODE_SEARCH_ENGINE = 'sqlite-fts5-bm25' as const;
export const LOCAL_CODE_SEARCH_MODE = 'lexical' as const;
export const LOCAL_CODE_SEARCH_DISPLAY_NAME = 'Local Code Search — SQLite FTS5/BM25' as const;
export const LOCAL_CODE_SEARCH_CONTRACT = {
  engine: LOCAL_CODE_SEARCH_ENGINE,
  mode: LOCAL_CODE_SEARCH_MODE,
  displayName: LOCAL_CODE_SEARCH_DISPLAY_NAME,
  semantic: false,
  embedding: false,
  vectorDatabase: false,
  queryExpansion: false,
  synonymExpansion: false,
  networkRequired: false,
  indexBackend: 'sqlite-fts5',
  ranking: 'bm25',
  compatibilityAliases: [
    'SemanticCodeEngine',
    'semantic_code_search',
    'toolnet-memory semantic',
    'semantic-index',
  ],
} as const;
export type LocalCodeSearchEngine = typeof LOCAL_CODE_SEARCH_ENGINE;
export type LocalCodeSearchMode = typeof LOCAL_CODE_SEARCH_MODE;
