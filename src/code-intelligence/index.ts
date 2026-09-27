export * from './types.js';

export * from './graph-coverage/index.js';

export * from './indexer/repository-scanner.js';
export * from './indexer/repository-indexer.js';
export * from './indexer/bounded-concurrency.js';

export * from './parsers/typescript-parser.js';
export type { ParserLanguage, ParserCapability } from './parsers/capabilities.js';
export {
  parserCapabilityForPath,
  parserSupportsPath,
  parserLexicallySearchesPath,
  supportedParserExtensions,
  searchableParserExtensions,
  structuralLanguages,
  treeSitterLanguages,
} from './parsers/capabilities.js';
/*
 * `ParserEngine` and its companions are types only. They must be re-exported
 * with `export type` so ESM consumers do not fail linking on a missing value
 * export.
 */
export type {
  ParserEngine,
  StructuralParserAdapter,
  StructuralParseInput,
  ParserDiagnostic,
} from './parsers/engine.js';

export * from './graph/graph-store.js';
export * from './graph/graph-builder.js';
export * from './graph/graph-repair.js';
export * from './graph/architecture.js';
export * from './graph/trace.js';
export * from './graph/edge-semantic-registry.js';
export * from './graph/edge-provenance.js';
export * from './graph/edge-factory.js';
export * from './graph/graph-validator.js';
export * from './graph/graph-semantics.js';

export * from './symbols/reference-resolver.js';

export * from './impact/index.js';

export * from './incremental/file-hash.js';
export * from './incremental/manifest.js';
export * from './incremental/manifest-builder.js';
export * from './incremental/incremental-indexer.js';
export * from './chunks/index.js';
export * from './semantic/index.js';

export * from './git/index.js';
export * from './resolution/index.js';
export * from './rich/index.js';
export * from './architecture/index.js';
export * from './query/index.js';

/* Phase 74 — ToolNet Graph Query Language (TGQL). */
export * from './query-v2/index.js';
export * from './artifact/index.js';
export * from './analysis/index.js';
export * from './visualization/index.js';
export * from './parsers/index.js';
export * from './cross-service/index.js';
export * from './fleet/index.js';
