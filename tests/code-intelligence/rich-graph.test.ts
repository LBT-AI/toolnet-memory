import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { RepositoryIndexer, RichGraphEnricher } from '../../src/code-intelligence/index.js';

describe('Rich Graph', () => {
  it('creates route, test, type and write relationships', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'toolnet-rich-'));

    try {
      await mkdir(join(dir, 'src'), {
        recursive: true,
      });

      await mkdir(join(dir, 'tests'), {
        recursive: true,
      });

      await writeFile(
        join(dir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            target: 'ES2022',

            module: 'NodeNext',

            moduleResolution: 'NodeNext',

            allowJs: true,
          },

          include: ['src/**/*.ts', 'tests/**/*.ts'],
        })
      );

      await writeFile(
        join(dir, 'src/app.ts'),
        `
export interface User {
  id: string;
}

export class Store {
  value = 0;

  setValue(value: number) {
    this.value = value;
  }
}

export function getUsers(): User[] {
  return [];
}

declare const app: any;

app.get("/users", getUsers);
`
      );

      await writeFile(
        join(dir, 'tests/app.test.ts'),
        `
import { getUsers } from "../src/app.js";

getUsers();
`
      );

      const indexed = await new RepositoryIndexer().index('test', dir);

      const stats = new RichGraphEnricher(indexed.graph).enrich('test', dir, null);

      const edges = indexed.graph.allEdges('test');

      expect(stats.routes).toBeGreaterThan(0);

      expect(edges.some((edge) => edge.type === 'ROUTE')).toBe(true);

      expect(edges.some((edge) => edge.type === 'TESTS')).toBe(true);

      expect(edges.some((edge) => edge.type === 'USES_TYPE')).toBe(true);

      expect(edges.some((edge) => edge.type === 'WRITES')).toBe(true);
    } finally {
      await rm(dir, {
        recursive: true,
        force: true,
      });
    }
  });
});
