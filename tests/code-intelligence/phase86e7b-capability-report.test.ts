/*
 * Phase 86E.7B — capability reporting truth (standalone fallback path).
 *
 * The report is pure: given the set of tree-sitter languages whose grammar
 * assets resolved in this runtime, it derives exactly what
 * `code:capabilities` prints. An empty set is the standalone single-binary
 * case (no embeddable wasm): structural=no for Python/Go/Rust/C/C++ with an
 * explicit lexical-fallback note, never a false structural=yes.
 */

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  buildCapabilityReport,
  isStructurallyAvailable,
} from '../../src/code-intelligence/parsers/capability-report.js';
import { parserCapabilityForPath } from '../../src/code-intelligence/parsers/capabilities.js';

const FULL = new Set(['python', 'go', 'rust', 'c', 'cpp']);
const EMPTY = new Set<string>();

describe('Phase 86E.7B — capability report truth', () => {
  it('reports full structural support when all grammars resolve (npm runtime)', () => {
    const report = buildCapabilityReport(FULL, []);

    expect(report.treeSitterAvailable).toBe(true);
    expect(report.treeSitterUnavailable).toEqual([]);
    expect(report.structuralLanguages).toContain('python');
    expect(report.structuralLanguages).toContain('cpp');
    expect(
      report.textLines.some((line) => line.includes('python') && line.includes('structural=yes'))
    ).toBe(true);
    expect(report.textLines.some((line) => line.includes('unavailable in this runtime'))).toBe(
      false
    );
  });

  it('reports structural=no with an explicit fallback note when grammars are missing (standalone)', () => {
    const report = buildCapabilityReport(EMPTY, []);

    expect(report.treeSitterAvailable).toBe(false);
    expect(report.treeSitterUnavailable).toEqual(['c', 'cpp', 'go', 'python', 'rust']);

    // TypeScript family is unaffected: compiler API needs no assets.
    for (const language of ['typescript', 'javascript'] as const) {
      const capability = parserCapabilityForPath(language === 'typescript' ? 'a.ts' : 'a.js');
      expect(isStructurallyAvailable(capability!, EMPTY)).toBe(true);
    }

    for (const language of ['python', 'go', 'rust', 'c', 'cpp'] as const) {
      const capability = parserCapabilityForPath(
        `a.${language === 'python' ? 'py' : language === 'go' ? 'go' : language === 'rust' ? 'rs' : language === 'c' ? 'c' : 'cpp'}`
      );
      expect(isStructurallyAvailable(capability!, EMPTY)).toBe(false);
      expect(isStructurallyAvailable(capability!, FULL)).toBe(true);
    }

    expect(report.structuralLanguages).not.toContain('python');
    const text = report.textLines.join('\n');
    expect(text).toContain('python        structural=no');
    expect(text).toContain('Tree-sitter grammars unavailable in this runtime');
    expect(text).toContain('falls back to lexical search');
  });

  it('keeps lexical search available in every runtime', () => {
    const fullText = buildCapabilityReport(FULL, []).textLines.join('\n');
    expect(fullText).toContain('python        structural=yes  lexical=yes');

    const standaloneText = buildCapabilityReport(EMPTY, []).textLines.join('\n');
    expect(standaloneText).toContain('python        structural=no  lexical=yes');
  });

  it('documents the standalone structural limitation where users will look', () => {
    const standalone = readFileSync('docs/standalone.md', 'utf8');
    expect(standalone).toContain('## Parser capability');
    expect(standalone).toContain('structural parsing is intentionally');
    expect(standalone).toContain('unsupported in the standalone binary');
    expect(standalone).toContain('lexically searchable');
    expect(standalone).toContain('code:capabilities');
    expect(standalone).not.toMatch(/standalone.*structural=yes/i);
  });

  it('release manifest claims no standalone parser parity', () => {
    const manifest = JSON.parse(readFileSync('release-manifest.json', 'utf8')) as {
      hardening?: { standalone?: Record<string, unknown> };
    };
    const standalone = manifest.hardening?.standalone ?? {};
    const text = JSON.stringify(standalone).toLowerCase();
    expect(text).not.toContain('parser');
    expect(text).not.toContain('tree-sitter');
    expect(text).not.toContain('structural');
  });
});
