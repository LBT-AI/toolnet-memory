import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  parserCapabilityForPath,
  parserSupportsPath,
} from '../../src/code-intelligence/parsers/capabilities.js';

import { TypeScriptModulePathResolver } from '../../src/code-intelligence/resolution/typescript-module-resolver.js';

import {
  buildStableSymbolRemap,
  repairPreservedEdges,
} from '../../src/code-intelligence/graph/graph-repair.js';

import type { CodeSymbol, GraphEdge } from '../../src/core/types.js';

const roots: string[] = [];

function root(): string {
  const value = mkdtempSync(join(tmpdir(), 'toolnet-phase14-'));

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

describe('Phase 14 code intelligence correctness', () => {
  it('reports parser capabilities truthfully', () => {
    expect(parserSupportsPath('src/app.ts')).toBe(true);

    expect(parserSupportsPath('src/app.jsx')).toBe(true);

    expect(parserSupportsPath('main.py')).toBe(false);

    expect(parserSupportsPath('main.go')).toBe(false);

    expect(parserCapabilityForPath('main.rs')?.engine).toBe('unsupported');
  });

  it('resolves tsconfig path aliases', () => {
    const directory = root();

    mkdirSync(join(directory, 'src', 'components'), {
      recursive: true,
    });

    mkdirSync(join(directory, 'packages', 'utils', 'src'), {
      recursive: true,
    });

    writeFileSync(
      join(directory, 'tsconfig.json'),
      JSON.stringify(
        {
          compilerOptions: {
            baseUrl: '.',
            paths: {
              '@/*': ['src/*'],
              '#utils': ['packages/utils/src/index.ts'],
            },
            module: 'NodeNext',
            moduleResolution: 'NodeNext',
          },
        },
        null,
        2
      )
    );

    writeFileSync(join(directory, 'src', 'app.ts'), '');

    writeFileSync(join(directory, 'src', 'components', 'button.ts'), '');

    writeFileSync(join(directory, 'packages', 'utils', 'src', 'index.ts'), '');

    const available = new Set([
      'src/app.ts',
      'src/components/button.ts',
      'packages/utils/src/index.ts',
    ]);

    const resolver = new TypeScriptModulePathResolver(directory);

    expect(resolver.resolve('src/app.ts', '@/components/button', available)).toBe(
      'src/components/button.ts'
    );

    expect(resolver.resolve('src/app.ts', '#utils', available)).toBe('packages/utils/src/index.ts');
  });

  it('resolves workspace package source without node_modules dependency', () => {
    const directory = root();

    mkdirSync(join(directory, 'apps', 'web', 'src'), {
      recursive: true,
    });

    mkdirSync(join(directory, 'packages', 'utils', 'src'), {
      recursive: true,
    });

    writeFileSync(join(directory, 'apps', 'web', 'src', 'app.ts'), '');

    writeFileSync(
      join(directory, 'packages', 'utils', 'package.json'),
      JSON.stringify({
        name: '@repo/utils',
        source: './src/index.ts',
      })
    );

    writeFileSync(join(directory, 'packages', 'utils', 'src', 'index.ts'), '');

    const resolver = new TypeScriptModulePathResolver(directory);

    expect(
      resolver.resolve(
        'apps/web/src/app.ts',
        '@repo/utils',
        new Set(['apps/web/src/app.ts', 'packages/utils/src/index.ts'])
      )
    ).toBe('packages/utils/src/index.ts');
  });

  it('remaps incoming graph edge after symbol position changes', () => {
    const oldCaller: CodeSymbol = {
      id: 'caller',
      projectId: 'p',
      name: 'caller',
      qualifiedName: 'caller',
      type: 'function',
      filePath: 'caller.ts',
    };

    const oldTarget: CodeSymbol = {
      id: 'old-target',
      projectId: 'p',
      name: 'target',
      qualifiedName: 'target',
      type: 'function',
      filePath: 'target.ts',
    };

    const newTarget: CodeSymbol = {
      ...oldTarget,
      id: 'new-target',
    };

    const edge: GraphEdge = {
      id: 'old-edge',
      projectId: 'p',
      from: oldCaller.id,
      to: oldTarget.id,
      type: 'CALLS',
    };

    const remap = buildStableSymbolRemap([oldCaller, oldTarget], [oldCaller, newTarget]);

    expect(remap.get(oldTarget.id)).toBe(newTarget.id);

    const repaired = repairPreservedEdges({
      projectId: 'p',
      previousSymbols: [oldCaller, oldTarget],
      previousEdges: [edge],
      currentSymbols: [oldCaller, newTarget],
      rebuiltSourceFiles: new Set(['target.ts']),
      removedFiles: new Set(),
    });

    expect(repaired).toHaveLength(1);

    expect(repaired[0]?.from).toBe('caller');

    expect(repaired[0]?.to).toBe('new-target');
  });

  it('drops edge when target identity no longer exists', () => {
    const caller: CodeSymbol = {
      id: 'caller',
      projectId: 'p',
      name: 'caller',
      type: 'function',
      filePath: 'caller.ts',
    };

    const removed: CodeSymbol = {
      id: 'removed',
      projectId: 'p',
      name: 'removed',
      type: 'function',
      filePath: 'target.ts',
    };

    const repaired = repairPreservedEdges({
      projectId: 'p',
      previousSymbols: [caller, removed],
      previousEdges: [
        {
          id: 'edge',
          projectId: 'p',
          from: caller.id,
          to: removed.id,
          type: 'CALLS',
        },
      ],
      currentSymbols: [caller],
      rebuiltSourceFiles: new Set(['target.ts']),
      removedFiles: new Set(),
    });

    expect(repaired).toEqual([]);
  });
});
