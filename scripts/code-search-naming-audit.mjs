import { existsSync, readFileSync } from 'node:fs';

let failures = 0;

function read(file) {
  if (!existsSync(file)) {
    failures += 1;
    console.log(`FAIL  required file: ${file}`);
    return '';
  }
  return readFileSync(file, 'utf8');
}

function pass(label) {
  console.log(`PASS  ${label}`);
}

function fail(label, detail = '') {
  failures += 1;
  console.log(`FAIL  ${label}`);
  if (detail) {
    console.log(`      ${detail}`);
  }
}

function contains(label, text, value) {
  if (text.includes(value)) {
    pass(label);
    return;
  }
  fail(label, `missing=${value}`);
}

function absent(label, text, value) {
  if (!text.includes(value)) {
    pass(label);
    return;
  }
  fail(label, `unexpected=${value}`);
}

console.log('=== Phase 20 Code Search Naming Audit ===');

const fts = read('src/code-intelligence/semantic/code-fts.ts');
const engine = read('src/code-intelligence/semantic/semantic-code-engine.ts');
const contract = read('src/code-intelligence/semantic/search-contract.ts');
const mcp = read('src/mcp/tools/semantic-code-search.ts');
const server = read('src/mcp/server.ts');
const cliHelp = read('packages/cli/help.ts');
const bin = read('bin/toolnet-memory');
const pipeline = read('src/production/index-pipeline.ts');
const fullIndex = read('src/production/full-index.ts');
const readme = read('README.md');

console.log('');
console.log('=== ENGINE TRUTH ===');

contains('node sqlite backend', fts, "from 'node:sqlite'");
contains('FTS5 table', fts, 'USING fts5');
contains('BM25 ranking', fts, 'bm25(code_fts)');
contains('canonical engine name', contract, "'sqlite-fts5-bm25'");
contains('lexical mode', contract, "'lexical'");
contains('semantic capability false', contract, 'semantic: false');
contains('embedding capability false', contract, 'embedding: false');
contains('vector database capability false', contract, 'vectorDatabase: false');

console.log('');
console.log('=== BACKWARD COMPATIBILITY ===');

contains('SemanticCodeEngine class preserved', engine, 'export class SemanticCodeEngine');
contains('legacy MCP name preserved', server, "'semantic_code_search'");
contains('legacy CLI semantic route preserved', bin, 'semantic)');
contains('legacy MCP output identified', mcp, "legacyAlias: 'semantic_code_search'");
contains('legacy vectorScore field preserved', engine, 'vectorScore:');

console.log('');
console.log('=== USER-FACING TRUTH ===');

contains('MCP description says FTS5/BM25', server, 'SQLite FTS5/BM25');
absent('MCP no semantic-meaning oversell', server, 'Search source code by semantic meaning');
contains('CLI help says local code search', cliHelp, 'Local code search — SQLite FTS5/BM25');
absent('CLI help no old semantic description', cliHelp, "description: 'Semantic code search'");
contains('pipeline truthful title', pipeline, 'Local Code Search — SQLite FTS5/BM25');
contains('full-index truthful title', fullIndex, 'Local code search — FTS5/BM25');
contains('README engine truth', readme, 'Index backend: SQLite FTS5');
contains('README alias truth', readme, 'Those names are compatibility aliases');

console.log('');
console.log('=== NO ENGINE REGRESSION ===');

absent('no sqlite-vec', engine + contract, 'sqlite-vec');
absent('no embedding provider', engine + contract, 'EmbeddingProvider');
absent('no HNSW', engine + contract, 'HNSW');

console.log('');
console.log(`FAILURES=${failures}`);

if (failures === 0) {
  console.log('CODE_SEARCH_NAMING_AUDIT=PASS');
  process.exitCode = 0;
} else {
  console.log('CODE_SEARCH_NAMING_AUDIT=FAIL');
  process.exitCode = 1;
}
