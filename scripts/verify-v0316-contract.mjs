import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const VERSION = '0.3.16';
let failures = 0;
function pass(label) {
  console.log(`PASS  ${label}`);
}
function fail(label, detail = '') {
  failures += 1;
  console.log(`FAIL  ${label}`);
  if (detail) console.log(`      ${detail}`);
}
function read(file) {
  if (!existsSync(file)) {
    fail(`required file: ${file}`);
    return '';
  }
  return readFileSync(file, 'utf8');
}
function json(file) {
  const raw = read(file);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch (error) {
    fail(`valid JSON: ${file}`, error instanceof Error ? error.message : String(error));
    return undefined;
  }
}
function exact(label, actual, expected) {
  if (actual === expected) {
    pass(label);
    return;
  }
  fail(label, `expected=${String(expected)} actual=${String(actual)}`);
}
function contains(label, text, needle) {
  if (text.includes(needle)) {
    pass(label);
    return;
  }
  fail(label, `missing=${needle}`);
}
function absent(label, text, needle) {
  if (!text.includes(needle)) {
    pass(label);
    return;
  }
  fail(label, `unexpected=${needle}`);
}
console.log('=== ToolNet Memory v0.3.16 Feature Contract ===');
const pkg = json('package.json');
const lock = json('package-lock.json');
const manifest = json('release-manifest.json');
const target = read('.release-target').trim();
const projectIdentity = read('src/core/project-identity.ts');
const projectRegistry = read('src/production/project-identity-registry.ts');
const capabilities = read('src/core/repository-capabilities.ts');
const searchContract = read('src/code-intelligence/semantic/search-contract.ts');
const semanticEngine = read('src/code-intelligence/semantic/semantic-code-engine.ts');
const semanticMcp = read('src/mcp/tools/semantic-code-search.ts');
const conflict = read('src/memory/conflict-detector.ts');
const memoryEngine = read('src/core/memory-engine.ts');
const decay = read('src/memory/decay.ts');
const learnerTypes = read('src/session/learner/types.ts');
const learnerJournal = read('src/session/learner/journal.ts');
const runtimeTruth = read('docs/runtime-truth.md');
const finalCert = read('scripts/final-release-certify.sh');
console.log('');
console.log('=== VERSION ===');
exact('release target', target, VERSION);
exact('package version', pkg?.version, VERSION);
exact('package lock version', lock?.version, VERSION);
exact('package lock root version', lock?.packages?.['']?.version, VERSION);
exact('manifest version', manifest?.version, VERSION);
console.log('');
console.log('=== PHASE 18 — PROJECT IDENTITY ===');
exact('cross-machine identity manifest', manifest?.hardening?.projectIdentity?.crossMachine, true);
exact(
  'path hash not primary for Git',
  manifest?.hardening?.projectIdentity?.pathHashPrimaryForGit,
  false
);
exact(
  'silent adoption disabled',
  manifest?.hardening?.projectIdentity?.silentUnverifiedAdoption,
  false
);
contains('normalized Git remote', projectIdentity, 'normalizeGitRemote');
contains('stable Git project id', projectIdentity, 'stableProjectIdFromGitRemote');
contains('remote identity registry', projectRegistry, '_toolnet/registry/project-identities/v1');
contains('legacy adoption guard', projectRegistry, 'PROJECT_IDENTITY_ADOPTION_REQUIRED');
console.log('');
console.log('=== PHASE 19 — REPOSITORY TRUTH ===');
exact(
  'dead scaffolds removed manifest',
  manifest?.hardening?.repositoryTruth?.deadScaffoldsRemoved,
  true
);
exact(
  'unclassified zero-byte source count',
  manifest?.hardening?.repositoryTruth?.unclassifiedZeroByteSourceFiles,
  0
);
contains('Google Drive unsupported', capabilities, "'storage.google-drive'");
contains('GitHub storage unsupported', capabilities, "'storage.github'");
contains('legacy sync replacement', capabilities, "'src/multi-host'");
for (const dead of [
  'src/sync/sync-engine.ts',
  'src/mcp/tools/memory-rules.ts',
  'src/security/encryption.ts',
  'src/retrieval/query-expansion.ts',
]) {
  if (!existsSync(dead)) {
    pass(`dead scaffold absent: ${dead}`);
  } else {
    fail(`dead scaffold absent: ${dead}`);
  }
}
console.log('');
console.log('=== PHASE 20 — CODE SEARCH TRUTH ===');
exact('code search engine manifest', manifest?.hardening?.codeSearch?.engine, 'sqlite-fts5-bm25');
exact('code search lexical mode', manifest?.hardening?.codeSearch?.mode, 'lexical');
exact('embedding disabled', manifest?.hardening?.codeSearch?.embeddings, false);
exact('vector DB disabled', manifest?.hardening?.codeSearch?.vectorDatabase, false);
contains('canonical search contract', searchContract, "'sqlite-fts5-bm25'");
contains('SemanticCodeEngine compatibility', semanticEngine, 'export class SemanticCodeEngine');
contains('semantic_code_search compatibility', semanticMcp, "'semantic_code_search'");
console.log('');
console.log('=== PHASE 21 — DOCUMENTATION TRUTH ===');
exact(
  'runtime capability docs',
  manifest?.hardening?.documentationTruth?.runtimeCapabilityMatrix,
  true
);
contains('runtime truth local code search', runtimeTruth, 'Local Code Search — SQLite FTS5/BM25');
contains('runtime truth Python unsupported', runtimeTruth, '| Python `.py` | unsupported |');
contains(
  'runtime truth cross-machine identity',
  runtimeTruth,
  'normalized Git repository identity'
);
contains('runtime truth multi-host path', runtimeTruth, 'src/multi-host/**');
contains('runtime truth no mandatory encryption key', runtimeTruth, 'mandatory encryption key');
console.log('');
console.log('=== PHASE 22 — CONFLICT ENGINE V2 ===');
exact('conflict V2 deterministic', manifest?.hardening?.conflictEngineV2?.deterministic, true);
exact('LLM merge disabled', manifest?.hardening?.conflictEngineV2?.llmMerge, false);
exact(
  'embedding conflict matching disabled',
  manifest?.hardening?.conflictEngineV2?.embeddingMatching,
  false
);
for (const kind of ['rule', 'decision', 'todo', 'next_action', 'fix', 'context', 'architecture']) {
  if (manifest?.hardening?.conflictEngineV2?.kinds?.includes(kind)) {
    pass(`conflict kind: ${kind}`);
  } else {
    fail(`conflict kind: ${kind}`);
  }
}
contains('conflict kind resolver', conflict, 'memoryConflictKind');
contains('entity matching', conflict, 'entityOf(');
contains('topic matching', conflict, 'topicOf(');
contains('verified completion gate', conflict, 'completionEvidence');
contains('completed lifecycle state', memoryEngine, "'completed'");
contains('resolved lifecycle state', memoryEngine, "'resolved'");
contains('conflicting lifecycle state', memoryEngine, "'conflicting'");
contains('active retrieval hides completed', decay, "'completed'");
contains('next action learner kind', learnerTypes, "'next_action'");
contains('learner evidence preserved', learnerJournal, 'candidate.evidence');
console.log('');
console.log('=== TEST / AUDIT CONTRACT ===');
for (const file of [
  'tests/core/project-cross-machine-identity.test.ts',
  'tests/repository-truth/repository-truth.test.ts',
  'tests/code-intelligence/code-search-naming.test.ts',
  'tests/documentation/documentation-truth.test.ts',
  'tests/memory/conflict-v2.test.ts',
]) {
  if (existsSync(file)) {
    pass(`phase test exists: ${file}`);
  } else {
    fail(`phase test exists: ${file}`);
  }
}
for (const audit of [
  'PROJECT_IDENTITY_AUDIT',
  'REPOSITORY_TRUTH_AUDIT',
  'CODE_SEARCH_NAMING_AUDIT',
  'DOCUMENTATION_TRUTH_AUDIT',
  'CONFLICT_V2_AUDIT',
  'FULL_TEST_SUITE',
]) {
  contains(`final certification gate ${audit}`, finalCert, `"${audit}"`);
}
console.log('');
console.log('=== ARCHITECTURE LOCKS ===');
exact('manifest requires LLM', manifest?.runtime?.requiresLlm, false);
exact('manifest requires embeddings', manifest?.runtime?.requiresEmbeddings, false);
exact('mandatory encryption key', manifest?.hardening?.security?.requiresEncryptionKey, false);
absent(
  'no encryption master key contract',
  projectIdentity + projectRegistry + conflict,
  'TOOLNET_MEMORY_MASTER_KEY'
);
absent(
  'no embedding provider introduced',
  projectIdentity + projectRegistry + conflict,
  'EmbeddingProvider'
);
console.log('');
console.log('=== STORAGE FREEZE ===');
const storage = spawnSync('git', ['status', '--porcelain', '--', 'src/storage'], {
  encoding: 'utf8',
});
if (storage.status === 0 && !storage.stdout.trim()) {
  pass('src/storage unchanged');
} else {
  fail('src/storage unchanged', (storage.stdout || storage.stderr || '').trim());
}
console.log('');
console.log('======================================');
if (failures === 0) {
  console.log('V0316_FEATURE_CONTRACT=PASS');
  process.exitCode = 0;
} else {
  console.log(`V0316_FEATURE_CONTRACT=FAIL failures=${failures}`);
  process.exitCode = 1;
}
