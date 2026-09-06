import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('v0.4.2 production hotfix', () => {
  it('restores npm shell Task route parity', () => {
    const source = readFileSync('bin/toolnet-memory', 'utf8');
    for (const route of [
      'task:sync)',
      'task:conflicts)',
      'task:resume-context)',
      'task:conflict-resolve)',
    ])
      expect(source).toContain(route);
  });

  it('resolves shimmer worker by executing module extension', () => {
    const source = readFileSync('src/production/ui/shimmer-progress.ts', 'utf8');
    expect(source).toContain("path.extname(modulePath) === '.ts' ? '.ts' : '.js'");
    expect(source).not.toContain("currentDir.includes('/bundle/')");
  });

  it('packages the worker as a separate bundle entry', () => {
    const source = readFileSync('scripts/build-bundle.mjs', 'utf8');
    expect(source).toContain("'shimmer-worker': 'src/production/ui/shimmer-worker.ts'");
  });
});
