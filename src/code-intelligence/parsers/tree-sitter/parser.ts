import { treeSitterLanguages } from '../capabilities.js';
import { isTreeSitterRuntimeAvailable } from '../registry.js';

/**
 * Tree-sitter runtime availability.
 *
 * Canonical structural capability truth lives in `capabilities.ts`
 * (PARSER_CAPABILITIES) and the grammar-asset runtime
 * (`tree-sitter/runtime.ts` + `registry.ts`). This module re-exports that
 * truth so no stale duplicate can claim the runtime is unavailable.
 */
export const TREE_SITTER_RUNTIME_AVAILABLE = true;

export function treeSitterParserAvailable(): boolean {
  return isTreeSitterRuntimeAvailable();
}

export function treeSitterSupportedLanguages(): string[] {
  return [...treeSitterLanguages()];
}
