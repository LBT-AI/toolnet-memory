import { existsSync, readFileSync } from 'node:fs';

import { spawnSync } from 'node:child_process';

let failures = 0;

function read(file) {
  if (!existsSync(file)) {
    failures += 1;
    console.log(`FAIL  required documentation: ${file}`);
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

function contains(label, text, expected) {
  if (text.includes(expected)) {
    pass(label);
    return;
  }
  fail(label, `missing=${expected}`);
}

function absent(label, text, forbidden) {
  if (!text.includes(forbidden)) {
    pass(label);
    return;
  }
  fail(label, `unexpected=${forbidden}`);
}

console.log('=== Phase 21 Documentation Truth Audit ===');

const pkg = JSON.parse(read('package.json'));
const targetVersion = read('.release-target').trim();
const readme = read('README.md');
const runtimeTruth = read('docs/runtime-truth.md');
const repositoryTruth = read('docs/repository-capabilities.md');
const security = read('docs/security-model.md');
const projectIdentity = read('docs/project-identity.md');
const multiHost = read('docs/multi-host.md');
const parserCapabilities = read('src/code-intelligence/parsers/capabilities.ts');
const searchContract = read('src/code-intelligence/semantic/search-contract.ts');
const mcpMemoryAgent = read('src/mcp/tools/memory-agent-ask.ts');
const mcpServer = read('src/mcp/server.ts');

console.log('');
console.log('=== RELEASE VERSION ===');

if (pkg.version === targetVersion) {
  pass(`package current release ${targetVersion}`);
} else {
  fail(`package current release ${targetVersion}`, `actual=${pkg.version}`);
}

contains('README current release', readme, `v${targetVersion}`);
absent('README no stale current npm package', readme, `toolnet-memory@0.3.16`);

console.log('');
console.log('=== CODE SEARCH TRUTH ===');

contains('README names SQLite FTS5/BM25', readme, 'Local Code Search — SQLite FTS5/BM25');
contains(
  'runtime docs name SQLite FTS5/BM25',
  runtimeTruth,
  'Local Code Search — SQLite FTS5/BM25'
);
contains('runtime docs lexical', runtimeTruth, 'Mode:   lexical');
contains('runtime docs embeddings disabled', runtimeTruth, 'embedding      no');
contains('search contract engine', searchContract, "'sqlite-fts5-bm25'");
contains('legacy MCP alias documented', runtimeTruth, 'semantic_code_search');

console.log('');
console.log('=== PARSER TRUTH ===');

for (const language of ["'typescript'", "'tsx'", "'javascript'", "'jsx'", "'mjs'", "'cjs'"]) {
  contains(`parser capability declared ${language}`, parserCapabilities, language);
}

for (const language of ["'python'", "'go'", "'rust'", "'cpp'"]) {
  contains(`unsupported parser declared ${language}`, parserCapabilities, language);
}

contains('README Python unsupported', readme, 'Python');
contains('README Go unsupported', readme, 'Go');

console.log('');
console.log('=== PROJECT IDENTITY TRUTH ===');

contains('README explicit legacy adoption', readme, 'toolnet-memory init --adopt-remote ');
contains('project identity normalized git remote', projectIdentity, 'normalized Git remote');
contains('project identity fail closed', projectIdentity, 'fails closed');
contains('project identity local-only escape', projectIdentity, '--no-remote-identity');

console.log('');
console.log('=== MULTI-HOST TRUTH ===');

contains('multi-host implementation path', multiHost, 'src/multi-host/**');
contains('multi-host immutable operations', multiHost, 'immutable operations');
contains('no vector-clock CRDT claim', multiHost, 'vector-clock CRDT');
contains('legacy sync described removed', repositoryTruth, 'src/sync/**');

console.log('');
console.log('=== STORAGE / SECURITY TRUTH ===');

contains('Google Drive unsupported', runtimeTruth, '| Google Drive | unsupported |');
contains('GitHub storage unsupported', runtimeTruth, '| GitHub storage backend | unsupported |');
contains(
  'optional remote encryption documented',
  security,
  'Remote client-side encryption is optional and disabled by default.'
);
contains('AES-256-GCM documented', security, 'AES-256-GCM');
absent(
  'docs no mandatory master key',
  readme + runtimeTruth + security,
  'TOOLNET_MEMORY_MASTER_KEY'
);

console.log('');
console.log('=== MEMORY AGENT TRUTH ===');

contains('schema local-only enum', mcpMemoryAgent, ".enum(['local'])");
contains('schema usedAi false', mcpMemoryAgent, 'usedAi: false');
absent('MCP server no mode=ai guidance', mcpServer, 'mode=ai');
contains('MCP server local-only guidance', mcpServer, 'local-only');

console.log('');
console.log('=== STORAGE SCOPE (Phase 27 unlocked) ===');

const storageStatus = spawnSync(process.execPath, ['scripts/storage-scope-audit.mjs'], {
  encoding: 'utf8',
});

if (storageStatus.status === 0) {
  pass('approved src/storage scope');
} else {
  fail('approved src/storage scope', (storageStatus.stdout || storageStatus.stderr || '').trim());
}

console.log('');
console.log(`FAILURES=${failures}`);

if (failures === 0) {
  console.log('DOCUMENTATION_TRUTH_AUDIT=PASS');
  process.exitCode = 0;
} else {
  console.log('DOCUMENTATION_TRUTH_AUDIT=FAIL');
  process.exitCode = 1;
}
