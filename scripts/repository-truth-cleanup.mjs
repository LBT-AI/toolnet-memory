import { existsSync, readFileSync, rmSync, statSync } from 'node:fs';

import { dirname, extname, normalize, resolve } from 'node:path';

import { spawnSync } from 'node:child_process';

const DEAD_ZERO_BYTE_SCAFFOLDS = [
  // Legacy sync scaffold.
  'src/sync/compressor.ts',
  'src/sync/conflict-resolver.ts',
  'src/sync/downloader.ts',
  'src/sync/index.ts',
  'src/sync/sync-engine.ts',
  'src/sync/upload-queue.ts',

  // Retrieval scaffolds replaced by active top-level modules.
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

  // Never-exported MCP placeholders.
  'src/mcp/tools/index-repository.ts',
  'src/mcp/tools/memory-rules.ts',
  'src/mcp/tools/memory-todos.ts',
  'src/mcp/tools/memory-decisions.ts',
  'src/mcp/tools/memory-recent.ts',

  // No encryption implementation or export exists.
  'src/security/encryption.ts',

  // Empty CLI scaffolds. Actual CLI metadata lives in help.ts
  // and execution routing lives in bin/toolnet-memory.
  'packages/cli/commands.ts',
  'packages/cli/index.ts',

  // Dead code-intelligence scaffolds. Active implementations live in
  // incremental/, graph/graph-builder.ts, symbols/reference-resolver.ts.
  'src/code-intelligence/graph/index.ts',
  'src/code-intelligence/graph/relationships.ts',
  'src/code-intelligence/indexer/file-watcher.ts',
  'src/code-intelligence/indexer/incremental-indexer.ts',
  'src/code-intelligence/indexer/index.ts',
  'src/code-intelligence/symbols/index.ts',
  'src/code-intelligence/symbols/symbol-extractor.ts',

  // Dead memory scaffold.
  'src/memory/summaries.ts',
];

const REFERENCE_SCAN_EXCLUDES = new Set([
  'scripts/repository-truth-cleanup.mjs',
  'scripts/repository-truth-audit.mjs',
  'tests/repository-truth/repository-truth.test.ts',
  'docs/repository-capabilities.md',
]);

function slash(value) {
  return normalize(value).replaceAll('\\', '/');
}

function trackedFiles() {
  const result = spawnSync('git', ['ls-files', '-z'], {
    encoding: 'utf8',
  });

  if (result.error || result.status !== 0) {
    throw new Error(result.stderr || result.error?.message || 'git ls-files failed');
  }

  return result.stdout
    .split('\0')
    .map((file) => file.trim())
    .filter(Boolean);
}

function textFile(file) {
  return /\.(?:ts|tsx|js|mjs|cjs|json)$/u.test(file);
}

function possibleTargets(sourceFile, specifier) {
  if (!specifier.startsWith('.')) {
    return [];
  }

  const absoluteBase = slash(resolve(dirname(sourceFile), specifier));
  const cwd = slash(resolve('.'));

  let relative = absoluteBase;

  if (relative.startsWith(`${cwd}/`)) {
    relative = relative.slice(cwd.length + 1);
  }

  const extension = extname(relative);

  if (extension === '.js') {
    return [relative.slice(0, -3) + '.ts', relative.slice(0, -3) + '.tsx'];
  }

  if (extension === '.mjs') {
    return [relative.slice(0, -4) + '.mts', relative.slice(0, -4) + '.ts'];
  }

  if (extension === '.cjs') {
    return [relative.slice(0, -4) + '.cts', relative.slice(0, -4) + '.ts'];
  }

  if (extension) {
    return [relative];
  }

  return [`${relative}.ts`, `${relative}.tsx`, `${relative}/index.ts`];
}

function importSpecifiers(text) {
  const values = [];

  const regex = /(?:from\s+|import\s*\()\s*['"]([^'"]+)['"]/gu;

  for (const match of text.matchAll(regex)) {
    if (match[1]) {
      values.push(match[1]);
    }
  }

  const exportRegex = /export\s+(?:\*|\{[^}]*\})\s+from\s*['"]([^'"]+)['"]/gu;

  for (const match of text.matchAll(exportRegex)) {
    if (match[1]) {
      values.push(match[1]);
    }
  }

  return values;
}

function referencesTo(candidate, files) {
  const references = [];

  for (const sourceFile of files) {
    if (
      sourceFile === candidate ||
      REFERENCE_SCAN_EXCLUDES.has(sourceFile) ||
      !textFile(sourceFile) ||
      !existsSync(sourceFile)
    ) {
      continue;
    }

    let text;
    try {
      text = readFileSync(sourceFile, 'utf8');
    } catch {
      continue;
    }

    for (const specifier of importSpecifiers(text)) {
      const targets = possibleTargets(sourceFile, specifier);
      if (targets.includes(candidate)) {
        references.push(`${sourceFile} -> ${specifier}`);
      }
    }

    /*
     * Catch non-import entrypoint references in package/build
     * configuration without treating the cleanup inventory itself
     * as a reference.
     */
    if (
      sourceFile.endsWith('package.json') &&
      (text.includes(candidate) || text.includes(candidate.replace(/\.ts$/u, '.js')))
    ) {
      references.push(`${sourceFile} -> literal path`);
    }
  }

  return references;
}

const files = trackedFiles();

let deleted = 0;
let absent = 0;
let blocked = 0;

console.log('=== Repository Truth Cleanup ===');

for (const candidate of DEAD_ZERO_BYTE_SCAFFOLDS) {
  if (candidate.startsWith('src/storage/')) {
    blocked += 1;
    console.log(`BLOCK STORAGE ${candidate}`);
    continue;
  }

  if (!existsSync(candidate)) {
    absent += 1;
    console.log(`ABSENT        ${candidate}`);
    continue;
  }

  const stats = statSync(candidate);

  if (!stats.isFile()) {
    blocked += 1;
    console.log(`BLOCK NONFILE ${candidate}`);
    continue;
  }

  if (stats.size !== 0) {
    blocked += 1;
    console.log(`BLOCK NONEMPTY ${candidate} size=${stats.size}`);
    continue;
  }

  const references = referencesTo(candidate, files);

  if (references.length > 0) {
    blocked += 1;
    console.log(`BLOCK REFERENCED ${candidate}`);
    for (const reference of references) {
      console.log(`  ${reference}`);
    }
    continue;
  }

  rmSync(candidate);
  deleted += 1;
  console.log(`DELETE        ${candidate}`);
}

console.log('');
console.log(`DELETED=${deleted}`);
console.log(`ALREADY_ABSENT=${absent}`);
console.log(`BLOCKED=${blocked}`);

if (blocked > 0) {
  console.log('REPOSITORY_TRUTH_CLEANUP=BLOCKED');
  process.exitCode = 1;
} else {
  console.log('REPOSITORY_TRUTH_CLEANUP=PASS');
}
