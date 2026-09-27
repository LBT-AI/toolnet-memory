import { existsSync, readFileSync, readdirSync } from 'node:fs';

import { dirname, extname, join, posix, relative } from 'node:path';

import type { ResolutionReason } from './types.js';

export interface ModuleResolution {
  status: 'resolved' | 'ambiguous' | 'external' | 'unresolved';
  files?: string[];
  reason?: ResolutionReason;
}

export interface LanguageModuleResolver {
  resolveImport(importerFile: string, specifier: string): ModuleResolution;
}

function cleanPath(value: string): string {
  return value.replaceAll('\\', '/').replace(/^\.\//u, '');
}

function posixJoin(...parts: string[]): string {
  return cleanPath(posix.join(...parts));
}

const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  'vendor',
  'target',
  '__pycache__',
  '.git',
  'dist',
  'build',
  'out',
]);

/**
 * Shared, cached project-local module resolution.
 *
 * The file inventory is walked once per resolver instance and reused for every
 * import, so resolution stays close to O(symbols + references) instead of
 * re-walking the repository per reference.
 */
abstract class LocalModuleResolver implements LanguageModuleResolver {
  private inventory: Set<string> | null = null;

  constructor(protected readonly rootPath: string) {}

  protected abstract languageExtensions(): readonly string[];

  /**
   * Returns the project-relative base path to match, or null when the
   * specifier is external to this project.
   */
  protected abstract plan(importerFile: string, specifier: string): string | null;

  /** Optional override for package/directory-style languages (e.g. Go). */
  protected matchPlan(plan: string): string[] {
    return this.matchFiles(plan, this.languageExtensions());
  }

  /**
   * Whether a specifier that matches no project file should be treated as an
   * external dependency (stdlib/third-party) instead of an unresolved import.
   */
  protected externalWhenUnmatched(): boolean {
    return false;
  }

  protected files(): Set<string> {
    if (!this.inventory) {
      this.inventory = new Set(this.walk(this.rootPath, this.rootPath));
    }
    return this.inventory;
  }

  private walk(dir: string, root: string): string[] {
    const output: string[] = [];
    if (!existsSync(dir)) {
      return output;
    }
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || IGNORED_DIRECTORIES.has(entry.name)) {
        continue;
      }
      const full = join(dir, entry.name);
      if (entry.isSymbolicLink()) {
        continue;
      }
      if (entry.isDirectory()) {
        output.push(...this.walk(full, root));
      } else if (entry.isFile()) {
        const rel = cleanPath(relative(root, full));
        if (this.languageExtensions().some((extension) => rel.endsWith(extension))) {
          output.push(rel);
        }
      }
    }
    return output;
  }

  protected matchFiles(relativeBase: string, extensions: readonly string[]): string[] {
    const files = this.files();
    const base = cleanPath(relativeBase);
    const matched: string[] = [];

    const push = (candidate: string): void => {
      const cleaned = cleanPath(candidate);
      if (files.has(cleaned) && !matched.includes(cleaned)) {
        matched.push(cleaned);
      }
    };

    if (extname(base)) {
      push(base);
    } else {
      for (const extension of extensions) {
        push(`${base}${extension}`);
      }
      for (const extension of extensions) {
        push(`${base}/index${extension}`);
      }
      /* Rust module layout: `mod foo;` -> foo.rs | foo/mod.rs */
      push(`${base}/mod.rs`);
    }

    return matched.sort();
  }

  protected resolveOne(relativeBase: string): ModuleResolution {
    const matched = this.matchPlan(relativeBase);
    if (matched.length === 0) {
      if (this.externalWhenUnmatched()) {
        return { status: 'external' };
      }
      return { status: 'unresolved', reason: 'UNRESOLVED_IMPORT' };
    }
    return { status: 'resolved', files: matched };
  }

  resolveImport(importerFile: string, specifier: string): ModuleResolution {
    const plan = this.plan(cleanPath(importerFile), specifier);
    if (plan === null) {
      return { status: 'external' };
    }
    return this.resolveOne(plan);
  }
}

function stripExtension(value: string): string {
  const extension = extname(value);
  return extension ? value.slice(0, -extension.length) : value;
}

const TS_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'] as const;

export class TypeScriptModuleResolver extends LocalModuleResolver {
  protected languageExtensions(): readonly string[] {
    return TS_EXTENSIONS;
  }

  protected plan(importerFile: string, specifier: string): string | null {
    if (!specifier.startsWith('.')) {
      /* Path aliases (tsconfig paths) are not guessed in this phase. */
      return null;
    }
    const base = posixJoin(dirname(importerFile), specifier);
    const extension = extname(base);

    if (extension === '.js') {
      return stripExtension(base);
    }
    if (extension === '.mjs') {
      return stripExtension(base);
    }
    if (extension === '.cjs') {
      return stripExtension(base);
    }
    if (base.endsWith('.d.ts')) {
      return base.slice(0, -5);
    }
    return base;
  }

  protected matchPlan(plan: string): string[] {
    return this.matchFiles(plan, TS_EXTENSIONS);
  }
}

export class PythonModuleResolver extends LocalModuleResolver {
  protected languageExtensions(): readonly string[] {
    return ['.py'];
  }

  protected plan(importerFile: string, specifier: string): string | null {
    if (specifier.startsWith('.')) {
      let dots = 0;
      while (specifier[dots] === '.') {
        dots += 1;
      }
      const rest = specifier.slice(dots).replaceAll('.', '/');
      let directory = dirname(importerFile);
      for (let level = 1; level < dots; level += 1) {
        directory = dirname(directory);
      }
      return rest ? posixJoin(directory, rest) : directory;
    }

    if (!specifier) {
      return null;
    }

    return specifier.replaceAll('.', '/');
  }

  protected matchPlan(plan: string): string[] {
    const matched = this.matchFiles(plan, ['.py']);
    const initializer = cleanPath(`${plan}/__init__.py`);
    if (this.files().has(initializer) && !matched.includes(initializer)) {
      matched.push(initializer);
    }
    return matched.sort();
  }

  /**
   * `import os` / `from requests import get` are stdlib/third-party when they
   * do not match a project file. Relative imports (`.foo`) stay unresolved.
   */
  protected externalWhenUnmatched(): boolean {
    return true;
  }

  override resolveImport(importerFile: string, specifier: string): ModuleResolution {
    if (specifier.startsWith('.')) {
      const plan = this.plan(cleanPath(importerFile), specifier);
      if (plan === null) {
        return { status: 'external' };
      }
      const matched = this.matchPlan(plan);
      if (matched.length === 0) {
        return { status: 'unresolved', reason: 'UNRESOLVED_IMPORT' };
      }
      return { status: 'resolved', files: matched };
    }
    return super.resolveImport(importerFile, specifier);
  }
}

export class GoModuleResolver extends LocalModuleResolver {
  private moduleName: string | null | undefined;

  protected languageExtensions(): readonly string[] {
    return ['.go'];
  }

  private module(): string | null {
    if (this.moduleName !== undefined) {
      return this.moduleName;
    }
    this.moduleName = null;
    const goMod = join(this.rootPath, 'go.mod');
    if (existsSync(goMod)) {
      try {
        const match = readFileSync(goMod, 'utf8').match(/^\s*module\s+(\S+)/mu);
        if (match) {
          this.moduleName = match[1];
        }
      } catch {
        this.moduleName = null;
      }
    }
    return this.moduleName;
  }

  protected plan(importerFile: string, specifier: string): string | null {
    /* Go has no relative imports in module mode; keep local-dot support for GOPATH-style trees. */
    if (specifier.startsWith('.')) {
      return posixJoin(dirname(importerFile), specifier);
    }

    const module = this.module();
    if (module && (specifier === module || specifier.startsWith(`${module}/`))) {
      const rest = specifier.slice(module.length).replace(/^\//u, '');
      return rest || '.';
    }

    /* Standard library and third-party modules stay external. */
    return null;
  }

  protected matchPlan(plan: string): string[] {
    const prefix = plan === '.' ? '' : `${cleanPath(plan)}/`;
    return [...this.files()]
      .filter((candidate) => (plan === '.' ? true : candidate.startsWith(prefix)))
      .filter((candidate) => !candidate.slice(prefix.length).includes('/'))
      .sort();
  }
}

export class RustModuleResolver extends LocalModuleResolver {
  protected languageExtensions(): readonly string[] {
    return ['.rs'];
  }

  protected plan(importerFile: string, specifier: string): string | null {
    const normalized = specifier.replaceAll('::', '/').replace(/\/$/u, '');
    const directory = dirname(importerFile);

    if (normalized.startsWith('crate/')) {
      const rest = normalized.slice('crate/'.length);
      /* crate root: src/main.rs | src/lib.rs | main.rs | lib.rs */
      const roots = ['src', '.'];
      for (const root of roots) {
        const candidate = root === '.' ? rest : `${root}/${rest}`;
        if (this.matchPlan(candidate).length > 0) {
          return candidate;
        }
      }
      return `src/${rest}`;
    }

    if (normalized.startsWith('self/')) {
      return posixJoin(directory, normalized.slice('self/'.length));
    }

    if (normalized.startsWith('super/')) {
      let up = normalized;
      let base = directory;
      while (up.startsWith('super/')) {
        up = up.slice('super/'.length);
        base = dirname(base);
      }
      return posixJoin(base, up);
    }

    /* Bare `mod x;` / `use x;` resolves relative to the declaring file. */
    return posixJoin(directory, normalized);
  }

  /**
   * `std::`, `core::`, and third-party crates are external.
   * `crate::`/`self::`/`super::` that match no project module are genuine
   * unresolved imports.
   */
  override resolveImport(importerFile: string, specifier: string): ModuleResolution {
    const isLocal =
      specifier === 'crate' ||
      specifier.startsWith('crate::') ||
      specifier.startsWith('self::') ||
      specifier.startsWith('super::') ||
      specifier.startsWith('.');

    if (!isLocal) {
      return { status: 'external' };
    }

    return super.resolveImport(importerFile, specifier);
  }
}

export class CModuleResolver extends LocalModuleResolver {
  protected languageExtensions(): readonly string[] {
    return ['.c', '.h'];
  }

  protected plan(importerFile: string, specifier: string): string | null {
    if (!specifier) {
      return null;
    }
    return cleanPath(specifier);
  }

  protected matchPlan(plan: string): string[] {
    return this.matchFiles(plan, this.languageExtensions());
  }

  /**
   * `#include "orders.h"` is importer-directory relative first, then
   * project-root relative. An include that matches no project file is a
   * system/third-party header (external) — no compiler or system header crawl
   * is performed.
   */
  override resolveImport(importerFile: string, specifier: string): ModuleResolution {
    if (!specifier) {
      return { status: 'external' };
    }

    const importerDir = dirname(cleanPath(importerFile));
    const candidates = specifier.startsWith('.')
      ? [posixJoin(importerDir, specifier)]
      : [posixJoin(importerDir, specifier), cleanPath(specifier)];

    for (const candidate of candidates) {
      const matched = this.matchPlan(candidate);
      if (matched.length === 0) {
        continue;
      }
      return { status: 'resolved', files: matched };
    }

    return { status: 'external' };
  }
}

export class CppModuleResolver extends CModuleResolver {
  protected languageExtensions(): readonly string[] {
    return ['.h', '.hpp', '.hh', '.c', '.cpp', '.cc', '.cxx'];
  }
}

export function resolverForLanguage(
  language: string,
  rootPath: string
): LanguageModuleResolver | undefined {
  switch (language) {
    case 'typescript':
    case 'tsx':
    case 'javascript':
    case 'jsx':
    case 'mts':
    case 'cts':
    case 'mjs':
    case 'cjs':
      return new TypeScriptModuleResolver(rootPath);
    case 'python':
      return new PythonModuleResolver(rootPath);
    case 'go':
      return new GoModuleResolver(rootPath);
    case 'rust':
      return new RustModuleResolver(rootPath);
    case 'c':
      return new CModuleResolver(rootPath);
    case 'cpp':
      return new CppModuleResolver(rootPath);
    default:
      return undefined;
  }
}
