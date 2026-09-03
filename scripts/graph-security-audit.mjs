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
  if (detail) console.log(`      ${detail}`);
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
console.log('=== Phase 25 Graph Security Audit ===');
const security = read('src/visualization/security.ts');
const server = read('src/visualization/server.ts');
const frontend = read('src/visualization/public/index.html');
const cli = read('src/production/graph-cli.ts');
const env = read('.env.example');
console.log('');
console.log('=== DEFAULT EXPOSURE ===');
contains('server default localhost', server, "'127.0.0.1'");
contains('loopback detector', security, 'isLoopbackGraphHost');
contains('Host-header guard', server, 'graphHostHeaderAllowed');
contains('DNS rebinding contract', security, 'DNS-rebinding');
console.log('');
console.log('=== HEALTH ENDPOINT ===');
const healthStart = server.indexOf("url.pathname === '/api/health'");
const projectsStart = server.indexOf("url.pathname === '/api/projects'");
if (healthStart >= 0 && projectsStart > healthStart) {
  const health = server.slice(healthStart, projectsStart);
  contains('health is minimal service status', health, "'toolnet-memory-graph'");
  absent('health does not load catalog', health, 'getCatalog');
  absent('health does not reveal default project', health, 'defaultProject');
  absent('health does not reveal project counts', health, 'indexedProjects');
  absent('health does not reveal token state', health, 'GRAPH_TOKEN=');
} else {
  fail('health route boundaries discoverable');
}
console.log('');
console.log('=== API AUTH ===');
contains('generic API auth gate', server, 'GRAPH_API_AUTH_GATE');
contains('Bearer authorization', server, 'graphBearerAuthorized');
contains('401 challenge', server, 'www-authenticate');
contains('same-origin gate', server, 'isSameOriginGraphRequest');
contains('timing-safe compare', security, 'timingSafeEqual');
console.log('');
console.log('=== BROWSER TOKEN HANDLING ===');
contains('API fetch wrapper', frontend, 'graphApiFetch');
contains('sessionStorage only', frontend, 'sessionStorage');
contains('Authorization header', frontend, '"Authorization"');
contains('Bearer header', frontend, 'Bearer ${token}');
absent('token never stored in localStorage', frontend, 'localStorage');
absent('token never placed in URL query', frontend, '?token=');
absent('token never placed in hash', frontend, '#token=');
console.log('');
console.log('=== SECURITY HEADERS ===');
for (const header of [
  'x-content-type-options',
  'x-frame-options',
  'content-security-policy',
  'referrer-policy',
  'cross-origin-resource-policy',
]) {
  contains(`security header ${header}`, security, header);
}
console.log('');
console.log('=== CLI WARNINGS ===');
contains('remote exposure warning', cli, 'Graph UI is exposed beyond localhost');
contains('unauthenticated remote warning', cli, 'Graph API bearer authentication: disabled');
contains('optional token env documented', env, 'TOOLNET_GRAPH_TOKEN');
contains('allowed hosts env documented', env, 'TOOLNET_GRAPH_ALLOWED_HOSTS');
console.log('');
console.log('=== ARCHITECTURE LOCKS ===');
absent('no memory encryption key', security + server + cli, 'TOOLNET_MEMORY_MASTER_KEY');
absent('no embedding provider', security + server + cli, 'EmbeddingProvider');
absent('no vector database', security + server + cli, 'VectorDatabase');
absent('no LLM provider', security + server + cli, 'OpenAI');
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
  console.log('GRAPH_SECURITY_AUDIT=PASS');
  process.exitCode = 0;
} else {
  console.log('GRAPH_SECURITY_AUDIT=FAIL');
  process.exitCode = 1;
}
