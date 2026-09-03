import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

let failures = 0;

function read(file) {
  return readFileSync(file, 'utf8');
}

function pass(label) {
  console.log(`PASS  ${label}`);
}

function fail(label) {
  failures += 1;
  console.log(`FAIL  ${label}`);
}

function contains(label, text, needle) {
  if (text.includes(needle)) {
    pass(label);
    return;
  }
  fail(label);
}

function absent(label, text, needle) {
  if (!text.includes(needle)) {
    pass(label);
    return;
  }
  fail(label);
}

const capabilities = read('src/code-intelligence/parsers/capabilities.ts');
const dispatcher = read('src/code-intelligence/parsers/parse-code-file.ts');
const lsp = read('src/code-intelligence/parsers/lsp-capabilities.ts');
const indexer = read('src/code-intelligence/indexer/repository-indexer.ts');
const docs = read('docs/non-ts-intelligence.md');

console.log('=== Phase 30 Audit ===');

for (const language of ["'python'", "'go'", "'rust'", "'c'", "'cpp'"]) {
  contains(`language ${language}`, capabilities, language);
}

contains('non-TS lexical search enabled', capabilities, 'lexicalSearch');
contains('structural support remains explicit', capabilities, 'structural');
contains('file-level lexical parser', dispatcher, 'parseLexicalOnlyFile');
contains('no fake imports', dispatcher, 'imports: []');
contains('no fake calls', dispatcher, 'calls: []');
contains('indexer parser dispatcher', indexer, 'parseCodeFile');
contains('indexer searchable extensions', indexer, 'searchableParserExtensions');
contains('pyright detection', lsp, 'pyright-langserver');
contains('gopls detection', lsp, "'gopls'");
contains('rust-analyzer detection', lsp, 'rust-analyzer');
contains('clangd detection', lsp, "'clangd'");
absent('no language-server download', lsp, 'npm install');
absent('no network downloader', lsp, 'fetch(');
contains('docs structural limitation', docs, 'structural graph capability remains');
contains('docs SQLite FTS5 BM25', docs, 'SQLite FTS5 / BM25');
contains('docs LSP detection only', docs, 'capability detection only');

const routes = spawnSync(process.execPath, ['scripts/standalone-route-audit.mjs'], {
  encoding: 'utf8',
});
if (routes.status === 0) {
  pass('standalone route parity');
} else {
  fail('standalone route parity');
  process.stdout.write(routes.stdout ?? '');
}

const combined = capabilities + dispatcher + lsp + indexer;
absent('no LLM', combined, 'OpenAI');
absent('no embeddings', combined, 'EmbeddingProvider');
absent('no vector DB', combined, 'VectorDatabase');

console.log(`FAILURES=${failures}`);
if (failures === 0) {
  console.log('PHASE30_AUDIT=PASS');
  process.exitCode = 0;
} else {
  console.log('PHASE30_AUDIT=FAIL');
  process.exitCode = 1;
}
