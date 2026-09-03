import { spawnSync } from 'node:child_process';

const APPROVED = new Set([
  'src/storage/provider.ts',
  'src/storage/index.ts',
  'src/storage/encrypted-provider.ts',
]);

const result = spawnSync('git', ['status', '--porcelain', '--', 'src/storage'], {
  encoding: 'utf8',
});

if (result.error || result.status !== 0) {
  console.error(result.stderr || result.error?.message || 'git status failed');
  process.exitCode = 1;
} else {
  const lines = result.stdout
    .split(/\r?\n/u)
    .map((line) => line.trimEnd())
    .filter(Boolean);

  const changed = lines.map((line) => {
    const path = line.slice(3).trim();
    const rename = path.includes(' -> ') ? path.split(' -> ').pop() : path;
    return rename;
  });

  const unapproved = changed.filter((file) => !APPROVED.has(file));

  console.log('=== Phase 27 Storage Scope ===');

  for (const file of changed) {
    console.log(`${APPROVED.has(file) ? 'PASS' : 'FAIL'}  ${file}`);
  }

  if (unapproved.length === 0) {
    console.log('STORAGE_SCOPE_AUDIT=PASS');
    process.exitCode = 0;
  } else {
    console.log(`UNAPPROVED_STORAGE_CHANGES=${unapproved.join(',')}`);
    console.log('STORAGE_SCOPE_AUDIT=FAIL');
    process.exitCode = 1;
  }
}
