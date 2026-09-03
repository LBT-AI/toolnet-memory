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

console.log('=== Phase 27 Remote Encryption Audit ===');

const crypto = read('src/security/remote-encryption.ts');
const wrapper = read('src/storage/encrypted-provider.ts');
const provider = read('src/storage/provider.ts');
const capabilities = read('src/core/repository-capabilities.ts');
const docs = read('docs/remote-encryption.md');
const envExample = read('.env.example');

console.log('');
console.log('=== CRYPTO ===');

contains('AES-256-GCM', crypto, "'aes-256-gcm'");
contains('32-byte key constant', crypto, 'REMOTE_ENCRYPTION_KEY_BYTES');
contains('12-byte nonce constant', crypto, 'NONCE_LENGTH');
contains('random nonce per write', crypto, 'randomBytes');
contains('GCM auth tag emitted', crypto, 'getAuthTag');
contains('GCM auth tag verified', crypto, 'setAuthTag');
contains('object-key AAD', crypto, 'aadForKey');
contains('constant-time key-id compare', crypto, 'timingSafeEqual');

console.log('');
console.log('=== DEFAULT-OFF CONTRACT ===');

contains('opt-in env var', crypto, 'TOOLNET_REMOTE_ENCRYPTION');
contains('inline key env var', crypto, 'TOOLNET_REMOTE_ENCRYPTION_KEY');
contains('key file env var', crypto, 'TOOLNET_REMOTE_ENCRYPTION_KEY_FILE');
contains('key required only in enabled wrapper', wrapper, 'options.enabled &&');
contains('local provider bypass', wrapper, "provider.name === 'local'");
contains('env example documents opt-in', envExample, 'TOOLNET_REMOTE_ENCRYPTION=on');

console.log('');
console.log('=== BACKWARD COMPATIBILITY ===');

contains('plaintext remains readable', wrapper, 'plaintext remote objects remain');
contains('encrypted read while disabled fails clearly', wrapper, 'REMOTE_ENCRYPTION_REQUIRED');
contains('wrong key fails clearly', crypto, 'REMOTE_ENCRYPTION_KEY_MISMATCH');
contains('docs no silent bucket migration', docs, 'does not silently bulk-rewrite');

console.log('');
console.log('=== PROVIDER WIRING ===');

contains('central wrapper applied in factory', provider, 'withOptionalRemoteEncryption');
contains('R2 still supported', provider, "config.provider === 'r2'");
contains('S3 still supported', provider, "config.provider === 's3'");
contains('Hugging Face still supported', provider, "config.provider === 'huggingface'");

console.log('');
console.log('=== CAPABILITY TRUTH ===');

contains('capability supported', capabilities, "'security.client-side-encryption'");
contains('real implementation path', capabilities, "'src/storage/encrypted-provider.ts'");
contains('docs default disabled', docs, 'It is disabled by default.');

console.log('');
console.log('=== NO KEY LEAK CONTRACT ===');

absent(
  'no hard-coded encryption key',
  crypto + wrapper + provider,
  '0123456789abcdef0123456789abcdef'
);
absent('no automatic passphrase fallback', crypto, "createHash('sha256').update(passphrase");

console.log('');
console.log('=== ARCHITECTURE LOCKS ===');

absent('no LLM provider', crypto + wrapper, 'OpenAI');
absent('no embedding provider', crypto + wrapper, 'EmbeddingProvider');
absent('no vector database', crypto + wrapper, 'VectorDatabase');

console.log('');
console.log('=== STORAGE SCOPE ===');

const scope = spawnSync(process.execPath, ['scripts/storage-scope-audit.mjs'], {
  encoding: 'utf8',
});

if (scope.status === 0) {
  pass('storage modifications limited to Phase 27 scope');
} else {
  fail(
    'storage modifications limited to Phase 27 scope',
    (scope.stdout || scope.stderr || '').trim()
  );
}

console.log('');
console.log(`FAILURES=${failures}`);

if (failures === 0) {
  console.log('REMOTE_ENCRYPTION_AUDIT=PASS');
  process.exitCode = 0;
} else {
  console.log('REMOTE_ENCRYPTION_AUDIT=FAIL');
  process.exitCode = 1;
}
