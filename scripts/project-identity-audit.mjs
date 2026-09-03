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
console.log('=== Phase 18 Project Identity Audit ===');
const identity = read('src/core/project-identity.ts');
const manager = read('src/core/project-manager.ts');
const registry = read('src/production/project-identity-registry.ts');
const init = read('src/production/init.ts');
const help = read('packages/cli/help.ts');
const test = read('tests/core/project-cross-machine-identity.test.ts');
contains('Git identity scheme', identity, "'git-remote-v1'");
contains('Git remote normalization', identity, 'normalizeGitRemote');
contains('stable Git project id', identity, 'stableProjectIdFromGitRemote');
contains('origin inspection', identity, "'origin'");
contains(
  'URL credentials deliberately excluded',
  identity,
  'user/password/query/fragment are intentionally excluded'
);
contains('existing project adoption guard', manager, 'PROJECT_IDENTITY_ALREADY_EXISTS');
contains('Git identity rebind guard', manager, 'PROJECT_GIT_REMOTE_CHANGED');
contains('remote identity registry', registry, '_toolnet/registry/project-identities/v1');
contains('unverified adoption fails closed', registry, 'PROJECT_IDENTITY_ADOPTION_REQUIRED');
contains('remote lookup failure fails closed', registry, 'PROJECT_IDENTITY_REGISTRY_UNAVAILABLE');
contains(
  'remote namespace collision guard',
  registry,
  'PROJECT_IDENTITY_REMOTE_NAMESPACE_COLLISION'
);
contains('explicit adoption flag', init, "'--adopt-remote'");
contains('local-only identity escape', init, "'--no-remote-identity'");
contains('rebind flag explicit', init, "'--rebind-git-identity'");
contains('CLI help adoption', help, '--adopt-remote');
contains('SSH HTTPS equivalence test', test, 'normalizes GitHub HTTPS and SSH');
contains('fresh clone adoption test', test, 'automatically adopts it in a fresh clone');
contains('legacy silent adoption rejection test', test, 'refuses silent adoption');
contains(
  'local collision test',
  test,
  'refuses to overwrite an existing different local project identity'
);
absent('no ToolNet encryption key', identity + registry, 'TOOLNET_MEMORY_MASTER_KEY');
absent('no embedding provider', identity + registry, 'EmbeddingProvider');
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
  console.log('PROJECT_IDENTITY_AUDIT=PASS');
  process.exitCode = 0;
} else {
  console.log('PROJECT_IDENTITY_AUDIT=FAIL');
  process.exitCode = 1;
}
