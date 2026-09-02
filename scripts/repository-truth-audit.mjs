import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from 'node:fs';

import {
  join,
} from 'node:path';

import {
  spawnSync,
} from 'node:child_process';

const INTENTIONAL_FROZEN_ZERO_BYTE_FILES = new Map([
  [
    'src/storage/google-drive/client.ts',
    'unsupported Google Drive storage placeholder; src/storage is frozen',
  ],
  [
    'src/storage/google-drive/index.ts',
    'unsupported Google Drive storage placeholder; src/storage is frozen',
  ],
  [
    'src/storage/github/client.ts',
    'unsupported GitHub storage placeholder; src/storage is frozen',
  ],
  [
    'src/storage/github/index.ts',
    'unsupported GitHub storage placeholder; src/storage is frozen',
  ],
]);

const REMOVED_DEAD_SCAFFOLDS = [
  'src/sync/compressor.ts',
  'src/sync/conflict-resolver.ts',
  'src/sync/downloader.ts',
  'src/sync/index.ts',
  'src/sync/sync-engine.ts',
  'src/sync/upload-queue.ts',

  'src/retrieval/context-budget.ts',
  'src/retrieval/query-classifier.ts',
  'src/retrieval/query-expansion.ts',

  'src/retrieval/bm25/index.ts',
  'src/retrieval/bm25/search.ts',

  'src/retrieval/hybrid/index.ts',
  'src/retrieval/hybrid/hybrid-search.ts',

  'src/retrieval/graph/index.ts',
  'src/retrieval/graph/search.ts',

  'src/retrieval/reranker/index.ts',
  'src/retrieval/reranker/reranker.ts',

  'src/mcp/tools/index-repository.ts',
  'src/mcp/tools/memory-rules.ts',
  'src/mcp/tools/memory-todos.ts',
  'src/mcp/tools/memory-decisions.ts',
  'src/mcp/tools/memory-recent.ts',

  'src/security/encryption.ts',

  'packages/cli/commands.ts',
  'packages/cli/index.ts',

  'src/code-intelligence/graph/index.ts',
  'src/code-intelligence/graph/relationships.ts',
  'src/code-intelligence/indexer/file-watcher.ts',
  'src/code-intelligence/indexer/incremental-indexer.ts',
  'src/code-intelligence/indexer/index.ts',
  'src/code-intelligence/symbols/index.ts',
  'src/code-intelligence/symbols/symbol-extractor.ts',

  'src/memory/summaries.ts',
];

const REQUIRED_NONEMPTY_IMPLEMENTATIONS = [
  'src/retrieval/bm25.ts',
  'src/retrieval/hybrid-search.ts',
  'src/retrieval/query-analyzer.ts',
  'src/retrieval/retrieval-engine.ts',

  'src/mcp/tools/index.ts',

  'src/security/secret-scanner.ts',
  'src/security/sanitizer.ts',
  'src/security/durable-sanitizer.ts',

  'src/core/repository-capabilities.ts',
];

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

function gitTrackedFiles() {
  const result = spawnSync('git', ['ls-files', '-z'], {
    encoding: 'utf8',
  });

  if (result.error || result.status !== 0) {
    fail(
      'git ls-files',
      result.stderr || result.error?.message || 'unknown error',
    );
    return [];
  }

  return result.stdout
    .split('\0')
    .map((file) => file.trim())
    .filter(Boolean);
}

function sourceLike(file) {
  return (
    (file.startsWith('src/') || file.startsWith('packages/')) &&
    /\.(?:ts|tsx|js|mjs|cjs)$/u.test(file)
  );
}

function containsNonemptyTsFile(root) {
  if (!existsSync(root)) {
    return false;
  }

  const stack = [root];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(path);
        continue;
      }
      if (
        entry.isFile() &&
        entry.name.endsWith('.ts') &&
        statSync(path).size > 0
      ) {
        return true;
      }
    }
  }

  return false;
}

console.log('=== ToolNet Repository Truth Audit ===');

const tracked = gitTrackedFiles();

const zeroByteSource = tracked.filter(
  (file) =>
    sourceLike(file) &&
    existsSync(file) &&
    statSync(file).isFile() &&
    statSync(file).size === 0,
);

const unclassified = zeroByteSource.filter(
  (file) => !INTENTIONAL_FROZEN_ZERO_BYTE_FILES.has(file),
);

if (unclassified.length === 0) {
  pass('no unclassified zero-byte source files');
} else {
  fail(
    'no unclassified zero-byte source files',
    unclassified.join(', '),
  );
}

for (const [file, reason] of INTENTIONAL_FROZEN_ZERO_BYTE_FILES) {
  if (!existsSync(file)) {
    fail(`frozen placeholder remains untouched: ${file}`, 'file missing');
    continue;
  }
  if (statSync(file).size !== 0) {
    fail(
      `frozen placeholder remains classified: ${file}`,
      'placeholder is no longer zero-byte; capability truth must be updated',
    );
    continue;
  }
  pass(`classified unsupported: ${file} — ${reason}`);
}

for (const file of REMOVED_DEAD_SCAFFOLDS) {
  if (existsSync(file)) {
    fail(`dead scaffold removed: ${file}`);
    continue;
  }
  pass(`dead scaffold removed: ${file}`);
}

for (const file of REQUIRED_NONEMPTY_IMPLEMENTATIONS) {
  if (!existsSync(file)) {
    fail(`real implementation exists: ${file}`, 'missing');
    continue;
  }
  if (statSync(file).size === 0) {
    fail(`real implementation nonempty: ${file}`, 'zero byte');
    continue;
  }
  pass(`real implementation nonempty: ${file}`);
}

if (containsNonemptyTsFile('src/multi-host')) {
  pass('multi-host replacement implementation exists');
} else {
  fail('multi-host replacement implementation exists');
}

const mcpIndex = readFileSync('src/mcp/tools/index.ts', 'utf8');

for (const removedExport of [
  'memory-rules',
  'memory-todos',
  'memory-decisions',
  'memory-recent',
  'index-repository',
]) {
  if (mcpIndex.includes(removedExport)) {
    fail(`dead MCP tool not exported: ${removedExport}`);
  } else {
    pass(`dead MCP tool not exported: ${removedExport}`);
  }
}

const securityIndex = readFileSync('src/security/index.ts', 'utf8');

if (securityIndex.includes('encryption')) {
  fail('unsupported encryption module not exported');
} else {
  pass('unsupported encryption module not exported');
}

const capabilityText = readFileSync(
  'src/core/repository-capabilities.ts',
  'utf8',
);

for (const capability of [
  'storage.google-drive',
  'storage.github',
  'security.client-side-encryption',
  'sync.legacy-engine',
  'retrieval.query-expansion',
]) {
  if (capabilityText.includes(capability)) {
    pass(`capability truth declared: ${capability}`);
  } else {
    fail(`capability truth declared: ${capability}`);
  }
}

const storageStatus = spawnSync(
  'git',
  ['status', '--porcelain', '--', 'src/storage'],
  { encoding: 'utf8' },
);

if (storageStatus.status === 0 && !storageStatus.stdout.trim()) {
  pass('src/storage unchanged');
} else {
  fail(
    'src/storage unchanged',
    (storageStatus.stdout || storageStatus.stderr || '').trim(),
  );
}

console.log('');
console.log(`ZERO_BYTE_SOURCE_TOTAL=${zeroByteSource.length}`);
console.log(
  `CLASSIFIED_FROZEN_ZERO_BYTE=${zeroByteSource.length - unclassified.length}`,
);
console.log(`UNCLASSIFIED_ZERO_BYTE_SOURCE_FILES=${unclassified.length}`);
console.log(`FAILURES=${failures}`);

if (failures === 0) {
  console.log('REPOSITORY_TRUTH_AUDIT=PASS');
  process.exitCode = 0;
} else {
  console.log('REPOSITORY_TRUTH_AUDIT=FAIL');
  process.exitCode = 1;
}
