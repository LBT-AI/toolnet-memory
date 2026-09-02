import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const VERSION = '0.3.15';

let failures = 0;

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

function read(file) {
  if (!fs.existsSync(file)) {
    fail(`required file: ${file}`);
    return '';
  }
  return fs.readFileSync(file, 'utf8');
}

function json(file) {
  const raw = read(file);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch (error) {
    fail(
      `valid JSON: ${file}`,
      error instanceof Error ? error.message : String(error)
    );
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

function contains(label, content, needle) {
  if (content.includes(needle)) {
    pass(label);
    return;
  }
  fail(label, `missing=${needle}`);
}

function absent(label, content, needle) {
  if (!content.includes(needle)) {
    pass(label);
    return;
  }
  fail(label, `unexpected=${needle}`);
}

function recursiveText(roots) {
  const output = [];
  const walk = (target) => {
    if (!fs.existsSync(target)) return;
    const stats = fs.lstatSync(target);
    if (stats.isSymbolicLink()) return;
    if (stats.isFile()) {
      if (
        /\.(?:ts|js|mjs|json|md|sh|example)$/u.test(target) ||
        target.endsWith('.env.example')
      ) {
        output.push(fs.readFileSync(target, 'utf8'));
      }
      return;
    }
    if (!stats.isDirectory()) return;
    for (const entry of fs.readdirSync(target)) {
      walk(`${target}/${entry}`);
    }
  };
  for (const root of roots) walk(root);
  return output.join('\n');
}

const pkg = json('package.json');
const lock = json('package-lock.json');
const manifest = json('release-manifest.json');
const target = read('.release-target').trim();

const retentionCli = read('src/retention/cli.ts');
const retentionPolicy = read('src/retention/policy.ts');
const runtimeRetention = read('src/retention/service.ts');
const dedupe = read('src/session/integration-scope/event-dedupe.ts');
const scanner = read('src/code-intelligence/indexer/repository-scanner.ts');
const concurrency = read('src/code-intelligence/indexer/bounded-concurrency.ts');
const benchmark = read('src/code-intelligence/benchmark/large-repo-benchmark.ts');
const parserCapabilities = read('src/code-intelligence/parsers/capabilities.ts');
const treeSitter = read('src/code-intelligence/parsers/tree-sitter/parser.ts');
const moduleResolver = read('src/code-intelligence/resolution/typescript-module-resolver.ts');
const graphRepair = read('src/code-intelligence/graph/graph-repair.ts');
const incremental = read('src/code-intelligence/incremental/incremental-indexer.ts');
const secretScanner = read('src/security/secret-scanner.ts');
const durableSanitizer = read('src/security/durable-sanitizer.ts');
const projectManager = read('src/core/project-manager.ts');
const memoryCli = read('src/work-continuity/memory-agent-cli.ts');
const projectTrust = read('src/security/project-document-trust.ts');
const finalCert = read('scripts/final-release-certify.sh');
const releaseWorkflow = read('.github/workflows/release.yml');

console.log('=== ToolNet Memory v0.3.15 Feature Contract ===');
console.log('');
console.log('=== VERSION ===');
exact('release target', target, VERSION);
exact('package version', pkg?.version, VERSION);
exact('package lock version', lock?.version, VERSION);
exact('package lock root version', lock?.packages?.['']?.version, VERSION);
exact('manifest version', manifest?.version, VERSION);

console.log('');
console.log('=== RETENTION / GC ===');
exact('safe GC manifest', manifest?.hardening?.retention?.safeGc, true);
exact('GC default dry-run manifest', manifest?.hardening?.retention?.defaultDryRun, true);
contains('GC apply flag', retentionCli, "args.includes('--apply')");
contains('GC defaults to !apply', retentionCli, 'no --apply');
contains('protected remote operations', runtimeRetention, 'REMOTE_GC_STORAGE_NOT_CONFIGURED');
contains('re-plan before destructive remote GC', runtimeRetention, 'Re-plan immediately before destructive remote GC');
contains('remote GC re-plans', runtimeRetention, 'plan = current');

console.log('');
console.log('=== CROSS-CONTAINER DEDUPE ===');
exact('project scoped dedupe manifest', manifest?.hardening?.dedupe?.projectScoped, true);
exact('PID identity disabled', manifest?.hardening?.dedupe?.usesPidIdentity, false);
exact('remote distributed lock disabled', manifest?.hardening?.dedupe?.remoteDistributedLock, false);
contains('project runtime dedupe path', dedupe, "'dedupe'");
contains('dedupe hook directory', dedupe, "'hooks'");
contains('exclusive atomic claim', dedupe, "'wx'");
contains('ownership token', dedupe, 'randomUUID');
absent('dedupe does not use StorageProvider', dedupe, 'StorageProvider');
absent('dedupe does not initialize storage', dedupe, 'createStorageProvider');

console.log('');
console.log('=== LARGE REPOSITORY ===');
for (const profile of ["'10k'", "'50k'", "'100k'"]) {
  contains(`benchmark profile ${profile}`, benchmark, profile);
}
contains('scanner max code size', scanner, 'DEFAULT_MAX_CODE_FILE_BYTES');
contains('symlink protection', scanner, 'isSymbolicLink');
contains('bounded concurrency', concurrency, 'mapWithConcurrency');
contains('cancellation boundary', concurrency, 'signal?.aborted');

console.log('');
console.log('=== CODE INTELLIGENCE ===');
exact('parser engine manifest', manifest?.hardening?.codeIntelligence?.parserEngine, 'typescript-compiler-api');
exact('Tree-sitter disabled manifest', manifest?.hardening?.codeIntelligence?.treeSitterRuntime, false);
contains('TypeScript parser truth', parserCapabilities, "'typescript-compiler-api'");
contains('Python unsupported truth', parserCapabilities, "'python'");
contains('Tree-sitter unavailable truth', treeSitter, 'TREE_SITTER_RUNTIME_AVAILABLE');
contains('tsconfig module resolution', moduleResolver, 'resolveModuleName');
contains('workspace package resolution', moduleResolver, 'resolveWorkspacePackage');
contains('stable symbol remap', graphRepair, 'buildStableSymbolRemap');
contains('preserved-edge repair', graphRepair, 'repairPreservedEdges');
contains('structural full rebuild', incremental, 'structuralChange');

console.log('');
console.log('=== SECURITY ISOLATION ===');
exact('secret scanner version', manifest?.hardening?.security?.secretScannerVersion, 2);
exact('durable sanitization manifest', manifest?.hardening?.security?.durableSanitization, true);
exact('project isolation manifest', manifest?.hardening?.security?.projectIsolation, true);
exact('project data untrusted manifest', manifest?.hardening?.security?.projectDataTrusted, false);
exact('client encryption disabled', manifest?.hardening?.security?.clientSideEncryption, false);
exact('encryption key not required', manifest?.hardening?.security?.requiresEncryptionKey, false);
contains('GitHub credential pattern', secretScanner, 'github_token');
contains('AWS credential pattern', secretScanner, 'aws_access_key');
contains('Stripe credential pattern', secretScanner, 'stripe_secret_key');
contains('durable value sanitizer', durableSanitizer, 'sanitizeDurableValue');
contains('require existing project', projectManager, 'requireExisting(');
contains('project not initialized contract', projectManager, 'PROJECT_NOT_INITIALIZED');
contains('ask requires existing project', memoryCli, '.requireExisting(');
absent('ask never calls detect', memoryCli, '.detect(');
contains('project instruction risk scanner', projectTrust, 'scanProjectInstructionRisk');
contains('untrusted project data renderer', projectTrust, 'renderUntrustedProjectData');

console.log('');
console.log('=== NO ENCRYPTION KEY CONTRACT ===');
const repositorySecurityText = recursiveText(['src', 'tests', '.env.example']);
for (const forbidden of [
  'TOOLNET_MEMORY_MASTER_KEY',
  'TOOLNET_MEMORY_KEY_ID',
  'TOOLNET_MEMORY_READ_KEYS',
  'TOOLNET_MEMORY_ENCRYPTION_ENABLED',
]) {
  absent(`no ${forbidden}`, repositorySecurityText, forbidden);
}

console.log('');
console.log('=== RELEASE WORKFLOW TRUTH ===');
exact('npm automatic after tag', manifest?.releasePolicy?.npmPublishAutomatic, true);
exact('git tag remains manual', manifest?.releasePolicy?.gitTagAutomatic, false);
contains('release triggered by tags', releaseWorkflow, 'tags:');
contains('trusted publishing workflow', releaseWorkflow, 'Publish to npm with trusted publishing');
contains('v0.3.15 feature gate in final cert', finalCert, '"V0315_FEATURE_CONTRACT"');
contains('10k scanner gate in final cert', finalCert, '"LARGE_REPO_SCAN_10K"');

console.log('');
console.log('=== STORAGE FREEZE ===');
const storage = spawnSync('git', ['status', '--porcelain', '--', 'src/storage'], { encoding: 'utf8' });
if (storage.status === 0 && !(storage.stdout ?? '').trim()) {
  pass('src/storage unchanged');
} else {
  fail('src/storage unchanged', (storage.stdout || storage.stderr || '').trim());
}

console.log('');
console.log('======================================');
if (failures === 0) {
  console.log('V0315_FEATURE_CONTRACT=PASS');
  process.exitCode = 0;
} else {
  console.log(`V0315_FEATURE_CONTRACT=FAIL failures=${failures}`);
  process.exitCode = 1;
}
