import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const VERSION = fs.existsSync('.release-target')
  ? fs.readFileSync('.release-target', 'utf8').trim()
  : '';

const EXPECTED_AGENTS = {
  agy: {
    displayName: 'Agy / Antigravity',
    refreshMode: 'native-lifecycle',
    bundle: 'agy.js',
    command: 'integrate:agy',
  },

  opencode: {
    displayName: 'OpenCode',
    refreshMode: 'persistent-plugin',
    bundle: 'opencode.js',
    command: 'integrate:opencode',
  },

  codex: {
    displayName: 'Codex',
    refreshMode: 'native-lifecycle',
    bundle: 'codex.js',
    command: 'integrate:codex',
  },

  claude: {
    displayName: 'Claude Code',
    refreshMode: 'native-lifecycle',
    bundle: 'claude.js',
    command: 'integrate:claude',
  },

  kiro: {
    displayName: 'Kiro CLI',
    refreshMode: 'native-lifecycle',
    bundle: 'kiro.js',
    command: 'integrate:kiro',
  },

  cursor: {
    displayName: 'Cursor CLI',
    refreshMode: 'native-lifecycle',
    bundle: 'cursor.js',
    command: 'integrate:cursor',
  },

  copilot: {
    displayName: 'GitHub Copilot CLI',
    refreshMode: 'native-lifecycle',
    bundle: 'copilot.js',
    command: 'integrate:copilot',
  },

  grok: {
    displayName: 'Grok Build',
    refreshMode: 'native-lifecycle',
    bundle: 'grok.js',
    command: 'integrate:grok',
  },

  'toolnet-cli': {
    displayName: 'ToolNet CLI',
    refreshMode: 'native-session',
    bundle: 'toolnet-cli.js',
    command: 'integrate:toolnet-cli',
  },

  kilo: {
    displayName: 'Kilo',
    refreshMode: 'mcp-only',
    bundle: 'kilo.js',
    command: 'integrate:kilo',
  },
};

let failures = 0;

function pass(label) {
  console.log(`PASS  ${label}`);
}

function fail(label, detail = '') {
  failures += 1;

  console.log(`FAIL  ${label}`);

  if (!detail) {
    return;
  }

  console.log(`      ${detail}`);
}

function read(file) {
  if (!fs.existsSync(file)) {
    fail(`required file: ${file}`);
    return '';
  }

  return fs.readFileSync(file, 'utf8');
}

function readJson(file) {
  const raw = read(file);

  if (!raw) {
    return undefined;
  }

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

  fail(label, `missing: ${needle}`);
}

function absent(label, text, needle) {
  if (!text.includes(needle)) {
    pass(label);
    return;
  }

  fail(label, `unexpected: ${needle}`);
}

function git(args) {
  const result = spawnSync('git', args, {
    encoding: 'utf8',
  });

  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

console.log('=== ToolNet Memory Static Release Contract ===');

const pkg = readJson('package.json');
const lock = readJson('package-lock.json');
const manifest = readJson('release-manifest.json');

const readme = read('README.md');
const changelog = read('CHANGELOG.md');

const capabilities = read('src/session/integration-capabilities.ts');

const help = read('packages/cli/help.ts');

const bin = read('bin/toolnet-memory');

const buildBundle = read('scripts/build-bundle.mjs');

const productionCert = read('src/production/production-certify.ts');

const envExample = read('.env.example');

const finalCert = read('scripts/final-release-certify.sh');

console.log('');
console.log('=== VERSION CONTRACT ===');

exact('package.json version', pkg?.version, VERSION);

exact('package-lock.json version', lock?.version, VERSION);

exact('package-lock root version', lock?.packages?.['']?.version, VERSION);

exact('release manifest version', manifest?.version, VERSION);

contains('README version', readme, `Current release: **v${VERSION}**`);

contains('CHANGELOG version', changelog, `## [${VERSION}]`);

console.log('');
console.log('=== PACKAGE CONTRACT ===');

const packageFiles = Array.isArray(pkg?.files) ? pkg.files : [];

if (packageFiles.includes('release-manifest.json')) {
  pass('release-manifest included in package files');
} else {
  fail('release-manifest included in package files');
}

contains(
  'final certification npm script',
  pkg?.scripts?.['release:certify:final'] ?? '',
  'final-release-certify.sh'
);

contains('production pack requires release manifest', productionCert, "'release-manifest.json'");

console.log('');
console.log('=== AGENT CONTRACT ===');

const manifestAgents =
  manifest?.agents && typeof manifest.agents === 'object' ? manifest.agents : {};

const expectedNames = Object.keys(EXPECTED_AGENTS).sort();

const actualNames = Object.keys(manifestAgents).sort();

exact('manifest agent count', actualNames.length, expectedNames.length);

exact('manifest exact agent set', actualNames.join(','), expectedNames.join(','));

for (const [agent, expected] of Object.entries(EXPECTED_AGENTS)) {
  const actual = manifestAgents[agent];

  if (!actual) {
    fail(`manifest agent: ${agent}`);
    continue;
  }

  exact(`${agent} display name`, actual.displayName, expected.displayName);

  exact(`${agent} refresh mode`, actual.refreshMode, expected.refreshMode);

  contains(`${agent} capability registry`, capabilities, `'${agent}'`);

  contains(`${agent} CLI help`, help, `name: '${expected.command}'`);

  contains(`${agent} CLI dispatcher`, bin, `${expected.command})`);

  contains(`${agent} production package`, productionCert, `'bundle/${expected.bundle}'`);
}

console.log('');
console.log('=== RELEASE POLICY ===');

exact('native CLI E2E non-blocking', manifest?.releasePolicy?.nativeCliE2ERequired, false);

exact(
  'full repository certification required',
  manifest?.releasePolicy?.fullRepositoryCertificationRequired,
  true
);

exact('npm publish automatic after tag push', manifest?.releasePolicy?.npmPublishAutomatic, true);

exact('git tag not automatic', manifest?.releasePolicy?.gitTagAutomatic, false);

console.log('');
console.log('=== CAPABILITY TRUTH ===');

contains(
  'ToolNet CLI native session capability',
  capabilities,
  'NATIVE_SESSION_IMPORT_CAPABILITIES'
);

contains('Kilo MCP-only capability', capabilities, 'MCP_ONLY_CAPABILITIES');

contains('native session refresh mode', capabilities, "'native-session'");

contains('persistent plugin refresh mode', capabilities, "'persistent-plugin'");

absent('unused AI CLI category removed', help, "| 'ai'");

console.log('');
console.log('=== BUILD CONTRACT ===');

for (const expected of [
  "agy: 'src/session/agy/cli.ts'",
  "opencode: 'src/session/opencode/cli.ts'",
  "codex: 'src/session/codex/cli.ts'",
  "claude: 'src/session/claude/cli.ts'",
  "kiro: 'src/session/kiro/cli.ts'",
  "cursor: 'src/session/cursor/cli.ts'",
  "copilot: 'src/session/copilot/cli.ts'",
  "grok: 'src/session/grok/cli.ts'",
  "'toolnet-cli': 'src/session/toolnet-cli/cli.ts'",
  "kilo: 'src/session/kilo/cli.ts'",
  "'background-refresh': 'src/multi-host/background-refresh-cli.ts'",
  "'integration-status': 'src/session/new-agents/scoped-status-cli.ts'",
]) {
  contains(`bundle entry ${expected.split(':')[0]}`, buildBundle, expected);
}

console.log('');
console.log('=== LOCAL-ONLY MEMORY CONTRACT ===');

exact('manifest requiresLlm', manifest?.runtime?.requiresLlm, false);

exact('manifest requiresEmbeddings', manifest?.runtime?.requiresEmbeddings, false);

exact('manifest sharedProjectMemory', manifest?.runtime?.sharedProjectMemory, true);

exact('manifest multiHostConvergence', manifest?.runtime?.multiHostConvergence, true);

exact('storage implementation frozen', manifest?.runtime?.storageImplementationFrozen, true);

absent('stale MEMORY_AUTO_SUMMARIZE removed', envExample, 'MEMORY_AUTO_SUMMARIZE');

console.log('');
console.log('=== README CONTRACT ===');

contains('README 10-agent wording', readme, '10-agent continuity ring');

for (const { displayName } of Object.values(EXPECTED_AGENTS)) {
  contains(`README agent ${displayName}`, readme, displayName);
}

absent('README generated fence id', readme, '```text id=');

console.log('');
console.log('=== PROTECTED SOURCE FREEZE ===');

const storageStatus = git(['status', '--porcelain', '--', 'src/storage']);

if (storageStatus.status === 0 && !storageStatus.stdout.trim()) {
  pass('src/storage frozen');
} else {
  fail('src/storage frozen', storageStatus.stdout.trim() || storageStatus.stderr.trim());
}

const trackedEnv = git(['ls-files']);

const envFiles = trackedEnv.stdout
  .split(/\r?\n/u)
  .filter(Boolean)
  .filter((file) => /(^|\/)\.env$/u.test(file));

if (!envFiles.length) {
  pass('no tracked .env');
} else {
  fail('no tracked .env', envFiles.join(', '));
}

console.log('');
console.log('=== FINAL CERTIFIER CONTRACT ===');

for (const gate of [
  'V0316_FEATURE_CONTRACT',
  'PROJECT_IDENTITY_AUDIT',
  'REPOSITORY_TRUTH_AUDIT',
  'CODE_SEARCH_NAMING_AUDIT',
  'DOCUMENTATION_TRUTH_AUDIT',
  'CONFLICT_V2_AUDIT',
  'FORMAT_CHECK',
  'LINT',
  'TYPECHECK',
  'FULL_TEST_SUITE',
  'BUILD_RELEASE',
  'PRODUCTION_CERTIFY',
]) {
  contains(`final gate ${gate}`, finalCert, `"${gate}"`);
}

const npmTestOccurrences = (finalCert.match(/^\s*npm test\s*$/gmu) ?? []).length;

exact('npm test appears exactly once in final certifier', npmTestOccurrences, 1);

console.log('');
console.log('======================================');

if (failures === 0) {
  console.log('STATIC_RELEASE_CONTRACT=PASS');

  process.exitCode = 0;
} else {
  console.log(`STATIC_RELEASE_CONTRACT=FAIL failures=${failures}`);

  process.exitCode = 1;
}
