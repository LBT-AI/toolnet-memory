import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

describe('Production full index', () => {
  const cli = readFileSync('src/production/full-index.ts', 'utf8');

  const pipeline = readFileSync('src/production/index-pipeline.ts', 'utf8');

  it('uses the 7 production stages in order', () => {
    const stages = [
      "'source-index'",
      "'type-resolution'",
      "'rich-graph'",
      "'semantic-index'",
      "'architecture'",
      "'analysis'",
      "'visualization'",
    ];

    let previous = -1;

    for (const stage of stages) {
      const position = pipeline.indexOf(stage, previous + 1);

      expect(position).toBeGreaterThan(previous);

      previous = position;
    }
  });

  it('does not depend on tsx or test entrypoints', () => {
    const source = cli + pipeline;

    expect(source).not.toContain('spawnSync');

    expect(source).not.toContain('node_modules/.bin/tsx');

    expect(source).not.toMatch(
      /test-(index|resolution|rich-graph|semantic|architecture|analysis|visualization)\.ts/
    );
  });

  it('keeps project locking and does not auto snapshot', () => {
    expect(cli).toContain('index.lock');

    expect(cli).toContain("'wx'");

    expect(cli + pipeline).not.toContain('SnapshotManager');
  });
});
