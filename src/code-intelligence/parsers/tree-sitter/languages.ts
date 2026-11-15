import { treeSitterLanguages } from '../capabilities.js';

/**
 * Tree-sitter language support.
 *
 * Derived from the canonical PARSER_CAPABILITIES so this map can never drift
 * from the languages the runtime actually parses. Every entry is true when
 * the grammar asset resolves; per-language availability is decided by the
 * grammar inventory (`verifyGrammarAssets`), not by this table.
 */
const SUPPORTED = new Set<string>(treeSitterLanguages());

function supportFor(language: string): boolean {
  return SUPPORTED.has(language);
}

export const TREE_SITTER_LANGUAGE_SUPPORT = {
  get python(): boolean {
    return supportFor('python');
  },
  get go(): boolean {
    return supportFor('go');
  },
  get rust(): boolean {
    return supportFor('rust');
  },
  get c(): boolean {
    return supportFor('c');
  },
  get cpp(): boolean {
    return supportFor('cpp');
  },
} as const;
