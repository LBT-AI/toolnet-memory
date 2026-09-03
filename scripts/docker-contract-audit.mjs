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

console.log('=== Phase 26 Docker Contract Audit ===');

const dockerfile = read('Dockerfile');
const compose = read('docker-compose.yml');
const ignore = read('.dockerignore');
const workflow = read('.github/workflows/docker.yml');
const health = read('src/service/docker-healthcheck.ts');
const bundle = read('scripts/build-bundle.mjs');
const docs = read('docs/docker.md');

console.log('');
console.log('=== IMAGE BUILD ===');

contains('Node 22 builder', dockerfile, 'FROM node:22-bookworm-slim AS builder');
contains('Node 22 runtime', dockerfile, 'FROM node:22-bookworm-slim AS runtime');
contains('deterministic npm install', dockerfile, 'npm ci');
contains('release build', dockerfile, 'npm run build:release');
contains('development dependencies pruned', dockerfile, 'npm prune --omit=dev');

console.log('');
console.log('=== NON-ROOT RUNTIME ===');

contains('non-root node user', dockerfile, 'USER node');

const userIndex = dockerfile.lastIndexOf('USER node');
if (userIndex >= 0 && !dockerfile.slice(userIndex).includes('USER root')) {
  pass('no root fallback after USER node');
} else {
  fail('no root fallback after USER node');
}

contains('tini PID1', dockerfile, '/usr/bin/tini');
contains('Git runtime dependency', dockerfile, 'git');
contains('Bash runtime dependency', dockerfile, 'bash');

console.log('');
console.log('=== HEALTH ===');

contains('healthcheck bundle entry', bundle, "'docker-healthcheck':");
contains('Docker HEALTHCHECK', dockerfile, 'HEALTHCHECK');
contains('real service socket path', health, 'toolNetServiceSocketPath');
contains('real ping request', health, "'ping'");
absent('no fake HTTP health server', health, 'createServer');

console.log('');
console.log('=== PERSISTENCE ===');

contains('ToolNet home volume', dockerfile, 'VOLUME ["/home/node/.toolnet"]');
contains('Compose ToolNet home', compose, 'toolnet-home:/home/node/.toolnet');
contains('Compose project mount', compose, '${TOOLNET_PROJECT_PATH:-.}');
contains('workspace target', compose, 'target: /workspace');

console.log('');
console.log('=== CONTAINER HARDENING ===');

contains('read-only root filesystem', compose, 'read_only:');
contains('capabilities dropped', compose, 'cap_drop:');
contains('ALL capabilities dropped', compose, '- ALL');
contains('no-new-privileges', compose, 'no-new-privileges:true');
contains('tmpfs', compose, '/tmp:rw,noexec,nosuid');
absent('no default exposed Docker port', dockerfile, 'EXPOSE ');

console.log('');
console.log('=== BUILD CONTEXT SECURITY ===');

for (const ignored of ['.git', '.toolnet', 'node_modules', '.env', '.npmrc', '.pem', '.key']) {
  contains(`dockerignore ${ignored}`, ignore, ignored);
}

contains('env example remains available', ignore, '!.env.example');

console.log('');
console.log('=== RELEASE IMAGE ===');

contains('GHCR image', workflow, 'ghcr.io/lbt-ai/toolnet-memory');
contains('amd64 + arm64', workflow, 'linux/amd64,linux/arm64');
contains('provenance', workflow, 'provenance: true');
contains('SBOM', workflow, 'sbom: true');
contains('Docker Hub target', workflow, 'lbtai/toolnet-memory');
contains('Docker Hub opt-in only', workflow, "vars.DOCKERHUB_ENABLED == 'true'");

console.log('');
console.log('=== SHARED-VOLUME TRUTH ===');

contains('shared dedupe documented', docs, '.toolnet/runtime/dedupe/hooks');
contains('same-filesystem scope documented', docs, 'same-filesystem coordination');
contains('remote locking not claimed', docs, 'not a distributed lock');
contains('append-only cross-host truth', docs, 'immutable append-only multi-host');

console.log('');
console.log('=== ARCHITECTURE LOCKS ===');

absent('no encryption master key', dockerfile + compose + health, 'TOOLNET_MEMORY_MASTER_KEY');
absent('no embedding provider', dockerfile + compose + health, 'EmbeddingProvider');
absent('no vector database', dockerfile + compose + health, 'VectorDatabase');
absent('no LLM provider', dockerfile + compose + health, 'OpenAI');

console.log('');
console.log('=== STORAGE SCOPE (Phase 27 unlocked) ===');

const storageScope = spawnSync(process.execPath, ['scripts/storage-scope-audit.mjs'], {
  encoding: 'utf8',
});

if (storageScope.status === 0) {
  pass('approved src/storage scope');
} else {
  fail('approved src/storage scope', (storageScope.stdout || storageScope.stderr || '').trim());
}

console.log('');
console.log(`FAILURES=${failures}`);

if (failures === 0) {
  console.log('DOCKER_CONTRACT_AUDIT=PASS');
  process.exitCode = 0;
} else {
  console.log('DOCKER_CONTRACT_AUDIT=FAIL');
  process.exitCode = 1;
}
