import { existsSync, readFileSync } from 'node:fs';

let failures = 0;

function read(file) {
  if (!existsSync(file)) {
    failures += 1;
    console.log(`FAIL  missing ${file}`);
    return '';
  }
  return readFileSync(file, 'utf8');
}

function pass(label) {
  console.log(`PASS  ${label}`);
}

function fail(label) {
  failures += 1;
  console.log(`FAIL  ${label}`);
}

function exact(label, actual, expected) {
  if (actual === expected) {
    pass(label);
    return;
  }
  fail(`${label} expected=${String(expected)} actual=${String(actual)}`);
}

function contains(label, text, needle) {
  if (text.includes(needle)) {
    pass(label);
    return;
  }
  fail(label);
}

const VERSION = '0.3.17';

const pkg = JSON.parse(read('package.json'));
const lock = JSON.parse(read('package-lock.json'));
const manifest = JSON.parse(read('release-manifest.json'));
const readme = read('README.md');
const graph = read('src/visualization/security.ts');
const dockerfile = read('Dockerfile');
const encryption = read('src/security/remote-encryption.ts');
const standalone = read('src/standalone/cli.ts');
const audit = read('src/audit/log.ts');
const scheduler = read('src/retention/scheduler.ts');
const parsers = read('src/code-intelligence/parsers/capabilities.ts');
const dispatcher = read('src/code-intelligence/parsers/parse-code-file.ts');
const lsp = read('src/code-intelligence/parsers/lsp-capabilities.ts');

console.log('=== ToolNet Memory v0.3.17 Contract ===');

exact('package version', pkg.version, VERSION);
exact('lock version', lock.version, VERSION);
exact('lock root version', lock.packages?.['']?.version, VERSION);
exact('manifest version', manifest.version, VERSION);

contains('README release', readme, 'Current release: v0.3.17');
contains('Graph bearer security', graph, 'graphBearerAuthorized');
contains('Docker non-root', dockerfile, 'USER node');
contains('AES-256-GCM', encryption, "'aes-256-gcm'");
contains('standalone router', standalone, 'TOOLNET_STANDALONE');
contains('audit SHA chain', audit, 'previousHash');
contains('auto-GC opt-in', scheduler, 'TOOLNET_AUTO_GC');

for (const language of ["'python'", "'go'", "'rust'", "'c'", "'cpp'"]) {
  contains(`non-TS ${language}`, parsers, language);
}

contains('file lexical parser', dispatcher, 'parseLexicalOnlyFile');
contains('LSP pyright', lsp, 'pyright-langserver');
contains('LSP gopls', lsp, "'gopls'");
contains('LSP rust-analyzer', lsp, 'rust-analyzer');
contains('LSP clangd', lsp, "'clangd'");

exact('no LLM runtime', manifest?.runtime?.requiresLlm, false);
exact('no embedding runtime', manifest?.runtime?.requiresEmbeddings, false);
exact('encryption default off', manifest?.hardening?.remoteEncryption?.defaultEnabled, false);
exact(
  'encryption key not mandatory',
  manifest?.hardening?.remoteEncryption?.keyRequiredByDefault,
  false
);
exact('auto-GC default off', manifest?.hardening?.autoGc?.enabledByDefault, false);
exact(
  'non-TS structural unsupported truth',
  manifest?.hardening?.nonTsIntelligence?.structuralParserSupport,
  false
);

console.log(`FAILURES=${failures}`);
if (failures === 0) {
  console.log('V0317_FEATURE_CONTRACT=PASS');
  process.exitCode = 0;
} else {
  console.log('V0317_FEATURE_CONTRACT=FAIL');
  process.exitCode = 1;
}
