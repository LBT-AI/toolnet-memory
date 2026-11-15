/*
 * Phase 86E.7A P0-B — packaged npm runtime parser proof (P12–P16).
 *
 * Proves the PACKAGED production runtime structurally parses Python, Go,
 * Rust, C and C++ — not just the source checkout. Uses the repo's accepted
 * "packaged runtime" mirror (bin + bundle + package files beside an
 * installed node_modules, no src/ — same trick as production-certify's
 * runPackagedRuntimeInit), runs from a foreign cwd, and asserts structural
 * symbols per language from the persisted graph.
 *
 * Lexical-only fallback would persist exactly one `file` symbol per input
 * with zero edges; anything more is structural proof.
 *
 * PASS marker: PACKAGED_PARSER_TRUTH=PASS
 */

import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  cpSync,
  existsSync,
  globSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const MARKER = 'PACKAGED_PARSER_TRUTH=PASS';

const REPO_ROOT = process.cwd();

const SAMPLES: Record<string, string> = {
  'src/a.py': [
    'import os',
    'from sys import path',
    '',
    'class Greeter(Base):',
    '    def greet(self, name):',
    '        return helper(name)',
    '',
  ].join('\n'),
  'src/b.go': [
    'package main',
    '',
    'import (',
    '"fmt"',
    '"os"',
    ')',
    '',
    'func main() { fmt.Println(os.Args) }',
    '',
  ].join('\n'),
  'src/c.rs': [
    'use std::collections::HashMap;',
    '',
    'struct Config { name: String }',
    '',
    'impl Config {',
    '    fn run(&self) { helper(); }',
    '}',
    '',
  ].join('\n'),
  'src/d.c': ['#include <stdio.h>', '', 'int add(int a, int b) { return helper(a) + a; }', ''].join(
    '\n'
  ),
  'src/e.cpp': [
    '#include <iostream>',
    '',
    'class Widget : public Base {',
    'public:',
    '    void render() { helper(); }',
    '};',
    '',
  ].join('\n'),
};

interface RunOutcome {
  status: number | null;
  stdout: string;
  stderr: string;
}

function runPackaged(
  binary: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv
): RunOutcome {
  const result = spawnSync(binary, args, {
    cwd,
    env,
    encoding: 'utf8',
    timeout: 90_000,
    maxBuffer: 10 * 1024 * 1024,
  });

  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

describe('Phase 86E.7A — packaged npm runtime parser proof', () => {
  it('P12–P16: packed bundle structurally parses py/go/rs/c/cpp', () => {
    const base = mkdtempSync(join(tmpdir(), 'toolnet-packed-parser-'));
    const mirror = join(base, 'package');
    const project = join(base, 'project');
    const storage = join(base, 'storage');

    try {
      mkdirSync(mirror, { recursive: true });
      mkdirSync(project, { recursive: true });

      for (const file of [
        'bin/toolnet-memory',
        'bundle',
        'package.json',
        '.release-target',
        'release-manifest.json',
      ]) {
        cpSync(join(REPO_ROOT, file), join(mirror, file), { recursive: true });
      }
      chmodSync(join(mirror, 'bin', 'toolnet-memory'), 0o755);

      // Deps installed beside the package, as in a global install. No src/.
      symlinkSync(join(REPO_ROOT, 'node_modules'), join(mirror, 'node_modules'), 'dir');
      expect(existsSync(join(mirror, 'src'))).toBe(false);

      const binary = join(mirror, 'bin', 'toolnet-memory');
      const env: NodeJS.ProcessEnv = {
        ...process.env,
        TOOLNET_PACKAGE_ROOT: mirror,
        TOOLNET_MEMORY_BIN: binary,
        MEMORY_LOCAL_STORAGE_PATH: storage,
      };

      const init = runPackaged(
        binary,
        ['init', '--project', project, '--json', '--no-integrate'],
        project,
        env
      );
      expect(init.status).toBe(0);

      for (const [relative, content] of Object.entries(SAMPLES)) {
        const file = join(project, relative);
        mkdirSync(join(project, 'src'), { recursive: true });
        writeFileSync(file, content);
      }

      // Foreign cwd proof happens implicitly: the project dir is outside the
      // package, so cwd-relative grammar resolution cannot see the assets.
      const index = runPackaged(binary, ['index:graph'], project, env);
      expect(index.status).toBe(0);

      const graphs = globSync('projects/*/code/graph/current.json', { cwd: storage });
      // Fall back to a recursive search if the scoped layout ever changes.
      const found =
        graphs.length > 0
          ? graphs
          : globSync('**/current.json', { cwd: storage }).filter((entry) =>
              entry.includes('graph')
            );
      expect(found.length).toBeGreaterThan(0);

      const graph = JSON.parse(readFileSync(join(storage, found[0]), 'utf8')) as {
        symbols: Array<{ filePath: string; type: string; name: string }>;
        edges: unknown[];
      };

      const byFile = new Map<string, string[]>();
      for (const symbol of graph.symbols) {
        const entry = byFile.get(symbol.filePath) ?? [];
        entry.push(symbol.type);
        byFile.set(symbol.filePath, entry);
      }

      // Every sample file must carry extracted structural symbols, not just
      // the lexical file symbol.
      for (const relative of Object.keys(SAMPLES)) {
        const types = byFile.get(relative) ?? [];
        expect(types.length).toBeGreaterThan(1);
        expect(types.some((type) => type !== 'file')).toBe(true);
      }

      const names = graph.symbols.map((symbol) => symbol.name);
      for (const expected of ['Greeter', 'greet', 'main', 'Config', 'add', 'Widget']) {
        expect(names).toContain(expected);
      }
      expect(graph.edges.length).toBeGreaterThan(0);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }

    expect(MARKER).toBe('PACKAGED_PARSER_TRUTH=PASS');
  }, 170_000);
});
