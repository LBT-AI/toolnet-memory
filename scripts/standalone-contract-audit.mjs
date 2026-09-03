import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

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

console.log('=== Phase 28 Standalone Contract Audit ===');

const pkg = JSON.parse(read('package.json'));
const launcher = read('src/standalone/cli.ts');
const builder = read('scripts/build-standalone.mjs');
const workflow = read('.github/workflows/release.yml');
const docs = read('docs/standalone.md');
const smoke = read('scripts/standalone-smoke.sh');

console.log('');
console.log('=== BUILD TOOL ===');

if (pkg.devDependencies?.['@yao-pkg/pkg'] === '6.22.0') {
  pass('@yao-pkg/pkg pinned');
} else {
  fail('@yao-pkg/pkg pinned');
}

contains('Enhanced SEA enabled', builder, "'--sea'");
contains('Node 22 target', builder, "'node22'");
contains('one ESM bundle', builder, "format: 'esm'");
contains('dependencies bundled', builder, "packages: 'bundle'");

console.log('');
console.log('=== TARGETS ===');

for (const target of [
  'node22-linux-x64',
  'node22-linux-arm64',
  'node22-macos-x64',
  'node22-macos-arm64',
  'node22-win-x64',
]) {
  contains(`target ${target}`, builder + workflow, target);
}

console.log('');
console.log('=== CLI ===');

contains('embedded version', launcher, 'TOOLNET_VERSION');
contains('default context command', launcher, "'context:print'");
contains('graph direct server', launcher, '../visualization/server.js');
contains('standalone runtime marker', launcher, 'TOOLNET_STANDALONE');
contains('npm update not falsely executed', launcher, 'npm-based self-update is not used');
contains(
  'Windows daemon limitation explicit',
  launcher,
  'Windows daemon transport is not implemented'
);

console.log('');
console.log('=== RELEASE ===');

contains('release waits for binaries', workflow, 'needs:');
contains('artifacts uploaded', workflow, 'actions/upload-artifact@v4');
contains('artifacts downloaded', workflow, 'actions/download-artifact@v4');
contains('SHA256 checksums', workflow, 'SHA256SUMS');
contains('macOS ad-hoc signing', workflow, 'codesign');

console.log('');
console.log('=== NO-NODE PROOF ===');

contains('clean Debian target', smoke, 'debian:bookworm-slim');
contains('target checks Node absent', smoke, 'command -v node');
contains('target checks npm absent', smoke, 'command -v npm');

console.log('');
console.log('=== DOCUMENTATION TRUTH ===');

contains('no Node required on target', docs, 'No Node.js installation is required on the target');
contains('npm remains supported', docs, 'npm distribution remains');
contains('mac notarization not overclaimed', docs, 'Apple-notarized unless');
contains('Windows signing not overclaimed', docs, 'not claimed to have Microsoft code');

console.log('');
console.log('=== ROUTE PARITY ===');

const routes = spawnSync(process.execPath, ['scripts/standalone-route-audit.mjs'], {
  encoding: 'utf8',
});

if (routes.status === 0) {
  pass('standalone route parity');
} else {
  fail('standalone route parity', (routes.stdout || routes.stderr || '').trim());
}

console.log('');
console.log('=== ARCHITECTURE LOCKS ===');

absent('no LLM provider', launcher + builder, 'OpenAI');
absent('no embedding provider', launcher + builder, 'EmbeddingProvider');
absent('no vector database', launcher + builder, 'VectorDatabase');

console.log('');
console.log('=== STORAGE SCOPE REGRESSION ===');

const storage = spawnSync(process.execPath, ['scripts/storage-scope-audit.mjs'], {
  encoding: 'utf8',
});

if (storage.status === 0) {
  pass('Phase 27 storage scope preserved');
} else {
  fail('Phase 27 storage scope preserved', (storage.stdout || storage.stderr || '').trim());
}

console.log('');
console.log(`FAILURES=${failures}`);

if (failures === 0) {
  console.log('STANDALONE_CONTRACT_AUDIT=PASS');
  process.exitCode = 0;
} else {
  console.log('STANDALONE_CONTRACT_AUDIT=FAIL');
  process.exitCode = 1;
}
