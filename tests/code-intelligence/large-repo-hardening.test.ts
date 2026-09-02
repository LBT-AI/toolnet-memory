import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { mapWithConcurrency } from '../../src/code-intelligence/indexer/bounded-concurrency.js';

import { scanRepositoryDetailed } from '../../src/code-intelligence/indexer/repository-scanner.js';

import {
  diffManifest,
  type CodeManifest,
} from '../../src/code-intelligence/incremental/manifest.js';

const roots: string[] = [];

function root(): string {
  const value = mkdtempSync(join(tmpdir(), 'toolnet-large-repo-test-'));

  roots.push(value);

  return value;
}

afterEach(() => {
  for (const value of roots.splice(0)) {
    rmSync(value, {
      recursive: true,
      force: true,
    });
  }
});

describe('large repository hardening', () => {
  it('scanner skips dependencies symlinks generated and oversized code', async () => {
    const directory = root();

    mkdirSync(join(directory, 'src'), {
      recursive: true,
    });

    mkdirSync(join(directory, 'node_modules', 'dep'), {
      recursive: true,
    });

    writeFileSync(join(directory, 'src', 'good.ts'), 'export const good = true;\n');

    writeFileSync(join(directory, 'src', 'app.min.js'), 'minified');

    writeFileSync(join(directory, 'src', 'huge.ts'), 'x'.repeat(1024));

    writeFileSync(
      join(directory, 'node_modules', 'dep', 'ignored.ts'),
      'export const ignored = true;\n'
    );

    symlinkSync(join(directory, 'src', 'good.ts'), join(directory, 'src', 'linked.ts'));

    const scan = await scanRepositoryDetailed(directory, {
      maxFileBytes: 100,
    });

    expect(scan.files).toEqual(['src/good.ts']);

    expect(scan.stats.skippedSymlinks).toBe(1);

    expect(scan.stats.skippedGenerated).toBe(1);

    expect(scan.stats.skippedOversized).toBe(1);
  });

  it('bounded worker pool never exceeds configured concurrency', async () => {
    let active = 0;
    let maximum = 0;

    const result = await mapWithConcurrency(
      Array.from(
        {
          length: 20,
        },
        (_, index) => index
      ),
      async (value) => {
        active += 1;

        maximum = Math.max(maximum, active);

        await new Promise((resolve) => setTimeout(resolve, 5));

        active -= 1;

        return value * 2;
      },
      {
        concurrency: 3,
      }
    );

    expect(maximum).toBeLessThanOrEqual(3);

    expect(result).toHaveLength(20);
  });

  it('detects unique content rename', () => {
    const previous: CodeManifest = {
      version: 1,
      projectId: 'test',
      updatedAt: '',
      files: {
        'src/old.ts': {
          path: 'src/old.ts',
          hash: 'same-hash',
        },
      },
    };

    const current: CodeManifest = {
      version: 1,
      projectId: 'test',
      updatedAt: '',
      files: {
        'src/new.ts': {
          path: 'src/new.ts',
          hash: 'same-hash',
        },
      },
    };

    const diff = diffManifest(previous, current);

    expect(diff.renamed).toEqual([
      {
        from: 'src/old.ts',
        to: 'src/new.ts',
        hash: 'same-hash',
      },
    ]);

    expect(diff.added).toEqual([]);

    expect(diff.deleted).toEqual([]);
  });

  it('does not guess rename when duplicate hashes are ambiguous', () => {
    const previous: CodeManifest = {
      version: 1,
      projectId: 'test',
      updatedAt: '',
      files: {
        'old-a.ts': {
          path: 'old-a.ts',
          hash: 'same',
        },
        'old-b.ts': {
          path: 'old-b.ts',
          hash: 'same',
        },
      },
    };

    const current: CodeManifest = {
      version: 1,
      projectId: 'test',
      updatedAt: '',
      files: {
        'new.ts': {
          path: 'new.ts',
          hash: 'same',
        },
      },
    };

    const diff = diffManifest(previous, current);

    expect(diff.renamed).toEqual([]);

    expect(diff.added).toEqual(['new.ts']);

    expect(diff.deleted).toEqual(['old-a.ts', 'old-b.ts']);
  });
});
