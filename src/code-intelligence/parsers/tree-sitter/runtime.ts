import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

import { Language, Parser, type Node } from 'web-tree-sitter';

/**
 * Tree-sitter runtime.
 *
 * Deterministic, offline, package-owned grammar assets.
 * No first-run download, no network access.
 */
export interface TreeSitterGrammar {
  readonly language: string;
  readonly wasmPath: string;
  readonly sha256: string;
  readonly version: number;
}

export interface TreeSitterRuntime {
  readonly available: boolean;
  readonly grammars: Readonly<Record<string, TreeSitterGrammar>>;
  getLanguage(language: string): Promise<Language | null>;
  getParser(language: string): Promise<Parser | null>;
  dispose(): void;
}

class TreeSitterRuntimeImpl implements TreeSitterRuntime {
  private initialized = false;
  private languages = new Map<string, Language>();
  private parsers = new Map<string, Parser>();

  constructor(
    public readonly available: boolean,
    public readonly grammars: Readonly<Record<string, TreeSitterGrammar>>
  ) {}

  async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return;
    }
    await Parser.init();
    this.initialized = true;
  }

  async getLanguage(language: string): Promise<Language | null> {
    await this.ensureInitialized();
    const cached = this.languages.get(language);
    if (cached) {
      return cached;
    }
    const grammar = this.grammars[language];
    if (!grammar) {
      return null;
    }
    const lang = await Language.load(grammar.wasmPath);
    this.languages.set(language, lang);
    return lang;
  }

  async getParser(language: string): Promise<Parser | null> {
    await this.ensureInitialized();
    const cached = this.parsers.get(language);
    if (cached) {
      return cached;
    }
    const lang = await this.getLanguage(language);
    if (!lang) {
      return null;
    }
    const parser = new Parser();
    parser.setLanguage(lang);
    this.parsers.set(language, parser);
    return parser;
  }

  dispose(): void {
    for (const parser of this.parsers.values()) {
      try {
        parser.delete();
      } catch {
        // best-effort cleanup
      }
    }
    this.parsers.clear();
    this.languages.clear();
  }
}

export interface TreeSitterRuntimeConfig {
  grammars: Record<string, { wasmPath: string; sha256?: string; version?: number }>;
}

let cachedRuntime: TreeSitterRuntimeImpl | null = null;

export function createTreeSitterRuntime(config: TreeSitterRuntimeConfig): TreeSitterRuntime {
  if (cachedRuntime) {
    return cachedRuntime;
  }

  const grammars: Record<string, TreeSitterGrammar> = {};
  for (const [language, grammar] of Object.entries(config.grammars)) {
    grammars[language] = {
      language,
      wasmPath: grammar.wasmPath,
      sha256: grammar.sha256 ?? '',
      version: grammar.version ?? 0,
    };
  }

  cachedRuntime = new TreeSitterRuntimeImpl(Object.keys(grammars).length > 0, grammars);
  return cachedRuntime;
}

export function treeSitterRuntimeAvailable(): boolean {
  return cachedRuntime?.available === true;
}

export function getTreeSitterRuntime(): TreeSitterRuntime | null {
  return cachedRuntime;
}

/**
 * Grammar package + wasm asset per tree-sitter language.
 *
 * The wasm files ship inside the grammar npm packages (production
 * dependencies), so they are installed beside toolnet-memory in every layout:
 * source checkout, global `npm install -g`, or mirrored packaged runtime.
 */
const GRAMMAR_PACKAGES: Readonly<Record<string, { package: string; asset: string }>> = {
  python: { package: 'tree-sitter-python', asset: 'tree-sitter-python.wasm' },
  go: { package: 'tree-sitter-go', asset: 'tree-sitter-go.wasm' },
  rust: { package: 'tree-sitter-rust', asset: 'tree-sitter-rust.wasm' },
  c: { package: 'tree-sitter-c', asset: 'tree-sitter-c.wasm' },
  cpp: { package: 'tree-sitter-cpp', asset: 'tree-sitter-cpp.wasm' },
};

/**
 * Resolve one grammar wasm path from the installed package tree.
 *
 * Resolution is package-relative (via the importing module), never
 * `process.cwd()`-relative: a globally installed CLI runs with the user's
 * project as cwd, where no grammar assets exist.
 */
function resolveGrammarWasm(language: string): string | null {
  const spec = GRAMMAR_PACKAGES[language];

  if (!spec) {
    return null;
  }

  try {
    const require = createRequire(import.meta.url);
    return require.resolve(`${spec.package}/${spec.asset}`);
  } catch {
    // fall through to legacy cwd-relative lookup below
  }

  const legacy = join(process.cwd(), 'node_modules', spec.package, spec.asset);
  return existsSync(legacy) ? legacy : null;
}

/**
 * Resolve grammar wasm paths relative to the installed packages.
 *
 * Grammar assets are package-owned and resolved offline. No grammar is ever
 * downloaded from the network during indexing.
 *
 * Languages whose asset cannot be resolved are absent from the map: a
 * missing grammar must make the language unavailable rather than silently
 * pretending structural support.
 */
export function resolveGrammarWasmPaths(): Record<string, string> {
  const paths: Record<string, string> = {};

  for (const language of Object.keys(GRAMMAR_PACKAGES)) {
    const resolved = resolveGrammarWasm(language);

    if (resolved) {
      paths[language] = resolved;
    }
  }

  return paths;
}

/**
 * Integrity check for a single grammar asset.
 *
 * Returns the SHA-256 of the asset when it is present and readable, or
 * null when it is missing/corrupt. A missing grammar must make the parser
 * unavailable rather than silently pretending structural support.
 */
export function hashGrammarAsset(wasmPath: string): string | null {
  try {
    if (!existsSync(wasmPath)) {
      return null;
    }
    return createHash('sha256').update(readFileSync(wasmPath)).digest('hex');
  } catch {
    return null;
  }
}

export interface GrammarAssetStatus {
  language: string;
  wasmPath: string;
  available: boolean;
  sha256: string | null;
}

/**
 * Deterministic grammar asset inventory used by both the runtime and the
 * parser fingerprint. No network access.
 *
 * Every known language is always listed: an unresolvable asset is reported
 * as unavailable rather than hidden, so structural gaps stay visible.
 */
export function verifyGrammarAssets(): GrammarAssetStatus[] {
  return Object.keys(GRAMMAR_PACKAGES)
    .map((language) => {
      const wasmPath = resolveGrammarWasm(language);
      const sha256 = wasmPath ? hashGrammarAsset(wasmPath) : null;
      return { language, wasmPath: wasmPath ?? '', available: sha256 !== null, sha256 };
    })
    .sort((left, right) => left.language.localeCompare(right.language));
}

export function initializeTreeSitterRuntime(): TreeSitterRuntime | null {
  if (cachedRuntime) {
    return cachedRuntime;
  }

  const paths = resolveGrammarWasmPaths();
  const grammars: Record<string, TreeSitterGrammar> = {};

  for (const [language, path] of Object.entries(paths)) {
    const sha256 = hashGrammarAsset(path);
    if (!sha256) {
      /* Missing/corrupt grammar: the language stays unavailable. */
      continue;
    }
    grammars[language] = {
      language,
      wasmPath: path,
      sha256,
      version: 1,
    };
  }

  cachedRuntime = new TreeSitterRuntimeImpl(Object.keys(grammars).length > 0, grammars);
  return cachedRuntime;
}

export function isTreeSitterRuntimeInitialized(): boolean {
  return cachedRuntime !== null;
}

export function resetTreeSitterRuntime(): void {
  if (cachedRuntime) {
    cachedRuntime.dispose();
    cachedRuntime = null;
  }
}

/**
 * Extract named children of a node by type.
 */
export function findChildByType(node: Node, type: string): Node | null {
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child && child.type === type) {
      return child;
    }
  }
  return null;
}

export function findChildrenByType(node: Node, type: string): Node[] {
  const results: Node[] = [];
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child && child.type === type) {
      results.push(child);
    }
  }
  return results;
}

export function findNamedChildrenByType(node: Node, type: string): Node[] {
  const results: Node[] = [];
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child && child.isNamed && child.type === type) {
      results.push(child);
    }
  }
  return results;
}

/**
 * Grammar-aware field access.
 *
 * Field names are the only stable way to read e.g. Rust `impl Trait for Type`
 * (`trait:` / `type:`) or Python `from x import y` (`module_name:` / `name:`),
 * where positional children are otherwise ambiguous.
 */
export function fieldOf(node: Node, name: string): Node | null {
  const candidate = node as unknown as { childForFieldName?: (value: string) => Node | null };
  if (typeof candidate.childForFieldName !== 'function') {
    return null;
  }
  return candidate.childForFieldName(name) ?? null;
}

/**
 * First descendant (depth-first, source order) of a node type.
 */
export function findDescendantByType(node: Node, type: string): Node | null {
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (!child) {
      continue;
    }
    if (child.type === type) {
      return child;
    }
    const nested = findDescendantByType(child, type);
    if (nested) {
      return nested;
    }
  }
  return null;
}

export function textOf(node: Node, source: string): string {
  return source.slice(node.startIndex, node.endIndex);
}

export function lineOf(node: Node, source: string): number {
  const before = source.slice(0, node.startIndex);
  return before.split(/\r?\n/u).length;
}

export function isMissingNode(node: Node): boolean {
  return node.isMissing;
}

export function hasErrorNode(node: Node): boolean {
  /*
   * Tree-sitter marks recovered tokens with `isMissing`; the node type is the
   * expected token type (e.g. `)`), never the literal string 'MISSING'.
   * Checking the type alone silently accepted partial ASTs.
   */
  if (node.type === 'ERROR' || node.isMissing) {
    return true;
  }
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child && hasErrorNode(child)) {
      return true;
    }
  }
  return false;
}
