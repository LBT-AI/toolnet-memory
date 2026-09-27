export * from './capabilities.js';
export * from './tree-sitter/index.js';
export * from './parse-code-file.js';
export * from './lsp-capabilities.js';
/*
 * `capability-cli.js` is a standalone CLI: importing it executes it and writes
 * to stdout. It must never be re-exported from a barrel, or any bundle that
 * pulls the barrel pollutes its own stdio (which corrupts MCP). The standalone
 * CLI imports it directly.
 */
export {
  type StructuralParserAdapter,
  type StructuralParseInput,
  type ParserDiagnostic,
} from './engine.js';
export * from './adapter.js';
export * from './registry.js';
export * from './fingerprint.js';
