import type { ParserLanguage } from './capabilities.js';
import type { ParsedFile, ParserDiagnostic } from '../types.js';
import type { StructuralParserAdapter, StructuralParseInput } from './engine.js';
import { TreeSitterPythonAdapter } from './tree-sitter/python.js';
import { TreeSitterGoAdapter } from './tree-sitter/go.js';
import { TreeSitterRustAdapter } from './tree-sitter/rust.js';
import { TreeSitterCAdapter } from './tree-sitter/c.js';
import { TreeSitterCppAdapter } from './tree-sitter/cpp.js';
import {
  initializeTreeSitterRuntime,
  type TreeSitterRuntime,
  resetTreeSitterRuntime,
} from './tree-sitter/runtime.js';

/**
 * Bounded diagnostics per file.
 *
 * Diagnostics never carry source content, secrets, or stack dumps.
 */
export const MAX_PARSER_DIAGNOSTICS = 20;

const PARSE_DIAGNOSTIC_CODES = new Set<ParserDiagnostic['code']>([
  'SYNTAX_ERROR',
  'PARTIAL_AST',
  'UNSUPPORTED_CONSTRUCT',
  'GRAMMAR_UNAVAILABLE',
]);

export function isStructuralDiagnostic(diagnostic: ParserDiagnostic): boolean {
  return diagnostic.severity === 'error' || PARSE_DIAGNOSTIC_CODES.has(diagnostic.code);
}

export function capParserDiagnostics(
  diagnostics: readonly ParserDiagnostic[] | undefined,
  max = MAX_PARSER_DIAGNOSTICS
): ParserDiagnostic[] {
  if (!diagnostics?.length) {
    return [];
  }
  const capped = diagnostics.slice(0, max).filter(isStructuralDiagnostic);
  if (diagnostics.length > max) {
    capped.push({
      code: 'PARTIAL_AST',
      severity: 'warning',
      filePath: diagnostics[0].filePath,
      message: `Diagnostics truncated at ${max}`,
    });
  }
  return capped;
}

let cachedAdapters: StructuralParserAdapter[] | null = null;
let cachedRuntime: TreeSitterRuntime | null = null;

function ensureRuntime(): TreeSitterRuntime | null {
  if (cachedRuntime) {
    return cachedRuntime;
  }
  cachedRuntime = initializeTreeSitterRuntime();
  return cachedRuntime;
}

export function getStructuralParserAdapters(): StructuralParserAdapter[] {
  if (cachedAdapters) {
    return cachedAdapters;
  }

  const runtime = ensureRuntime();
  const adapters: StructuralParserAdapter[] = [];

  /*
   * An adapter is registered only when its grammar asset is present in the
   * runtime. A missing grammar fails closed: no adapter, structural parse
   * returns null, the caller falls back to lexical indexing and graph
   * coverage records the gap — never a fake structural success.
   */
  if (runtime?.available) {
    const grammars = runtime.grammars;
    if (grammars['python']) {
      adapters.push(new TreeSitterPythonAdapter(runtime));
    }
    if (grammars['go']) {
      adapters.push(new TreeSitterGoAdapter(runtime));
    }
    if (grammars['rust']) {
      adapters.push(new TreeSitterRustAdapter(runtime));
    }
    if (grammars['c']) {
      adapters.push(new TreeSitterCAdapter(runtime));
    }
    if (grammars['cpp']) {
      adapters.push(new TreeSitterCppAdapter(runtime));
    }
  }

  cachedAdapters = adapters;
  return adapters;
}

export function findStructuralAdapter(language: ParserLanguage): StructuralParserAdapter | null {
  return getStructuralParserAdapters().find((adapter) => adapter.supports(language)) ?? null;
}

export function resetParserRegistry(): void {
  cachedAdapters = null;
  cachedRuntime = null;
  resetTreeSitterRuntime();
}

export async function parseWithStructuralAdapter(
  input: StructuralParseInput
): Promise<ParsedFile | null> {
  const adapter = findStructuralAdapter(input.language);
  if (!adapter) {
    return null;
  }

  try {
    const parsed = await adapter.parse(input);
    return {
      ...parsed,
      diagnostics: capParserDiagnostics(parsed.diagnostics),
    };
  } catch {
    /*
     * Grammar unavailable or catastrophic parse failure.
     *
     * The caller falls back to lexical indexing for this file and the
     * structural gap is recorded in graph coverage. A fallback is never
     * reported as a successful structural parse.
     */
    return null;
  }
}

export function structuralAdapterIds(): string[] {
  return getStructuralParserAdapters().map((adapter) => adapter.id);
}

export function treeSitterRuntime(): TreeSitterRuntime | null {
  return cachedRuntime;
}

export function isTreeSitterRuntimeAvailable(): boolean {
  ensureRuntime();
  return cachedRuntime?.available === true;
}
