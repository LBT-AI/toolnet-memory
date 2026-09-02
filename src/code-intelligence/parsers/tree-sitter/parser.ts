export const TREE_SITTER_RUNTIME_AVAILABLE = false;

export function treeSitterParserAvailable(): false {
  return false;
}

export function parseWithTreeSitter(): never {
  throw new Error('Tree-sitter parser is not implemented in this release');
}
