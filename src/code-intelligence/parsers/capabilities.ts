import { extname } from 'node:path';

export type ParserLanguage =
  | 'typescript'
  | 'tsx'
  | 'javascript'
  | 'jsx'
  | 'mts'
  | 'cts'
  | 'mjs'
  | 'cjs'
  | 'python'
  | 'go'
  | 'rust'
  | 'c'
  | 'cpp';

export type ParserEngine = 'typescript-compiler-api' | 'unsupported';

export type LexicalEngine = 'file-chunk-fts5-bm25';

export interface ParserCapability {
  language: ParserLanguage;
  extensions: readonly string[];
  /*
   * Backward-compatible meaning:
   * true only when ToolNet has structural parsing.
   */
  supported: boolean;
  engine: ParserEngine;
  structural: boolean;
  lexicalSearch: boolean;
  lexicalEngine?: LexicalEngine;
  lspServer?: string;
}

const STRUCTURAL_LEXICAL: Pick<
  ParserCapability,
  'supported' | 'structural' | 'lexicalSearch' | 'engine' | 'lexicalEngine'
> = {
  supported: true,
  structural: true,
  lexicalSearch: true,
  engine: 'typescript-compiler-api',
  lexicalEngine: 'file-chunk-fts5-bm25',
};

const LEXICAL_ONLY: Pick<
  ParserCapability,
  'supported' | 'structural' | 'lexicalSearch' | 'engine' | 'lexicalEngine'
> = {
  supported: false,
  structural: false,
  lexicalSearch: true,
  engine: 'unsupported',
  lexicalEngine: 'file-chunk-fts5-bm25',
};

export const PARSER_CAPABILITIES: readonly ParserCapability[] = [
  {
    language: 'typescript',
    extensions: ['.ts'],
    ...STRUCTURAL_LEXICAL,
  },
  {
    language: 'tsx',
    extensions: ['.tsx'],
    ...STRUCTURAL_LEXICAL,
  },
  {
    language: 'javascript',
    extensions: ['.js'],
    ...STRUCTURAL_LEXICAL,
  },
  {
    language: 'jsx',
    extensions: ['.jsx'],
    ...STRUCTURAL_LEXICAL,
  },
  {
    language: 'mts',
    extensions: ['.mts'],
    ...STRUCTURAL_LEXICAL,
  },
  {
    language: 'cts',
    extensions: ['.cts'],
    ...STRUCTURAL_LEXICAL,
  },
  {
    language: 'mjs',
    extensions: ['.mjs'],
    ...STRUCTURAL_LEXICAL,
  },
  {
    language: 'cjs',
    extensions: ['.cjs'],
    ...STRUCTURAL_LEXICAL,
  },
  {
    language: 'python',
    extensions: ['.py'],
    ...LEXICAL_ONLY,
    lspServer: 'pyright-langserver',
  },
  {
    language: 'go',
    extensions: ['.go'],
    ...LEXICAL_ONLY,
    lspServer: 'gopls',
  },
  {
    language: 'rust',
    extensions: ['.rs'],
    ...LEXICAL_ONLY,
    lspServer: 'rust-analyzer',
  },
  {
    language: 'c',
    extensions: ['.c', '.h'],
    ...LEXICAL_ONLY,
    lspServer: 'clangd',
  },
  {
    language: 'cpp',
    extensions: ['.cc', '.cpp', '.cxx', '.hpp', '.hh'],
    ...LEXICAL_ONLY,
    lspServer: 'clangd',
  },
];

export function parserCapabilityForPath(filePath: string): ParserCapability | undefined {
  const extension = extname(filePath).toLowerCase();
  return PARSER_CAPABILITIES.find((capability) => capability.extensions.includes(extension));
}

export function parserSupportsPath(filePath: string): boolean {
  return parserCapabilityForPath(filePath)?.supported ?? false;
}

export function parserLexicallySearchesPath(filePath: string): boolean {
  return parserCapabilityForPath(filePath)?.lexicalSearch ?? false;
}

export function supportedParserExtensions(): string[] {
  return PARSER_CAPABILITIES.filter((capability) => capability.supported).flatMap(
    (capability) => capability.extensions
  );
}

export function searchableParserExtensions(): string[] {
  return [
    ...new Set(
      PARSER_CAPABILITIES.filter((capability) => capability.lexicalSearch).flatMap(
        (capability) => capability.extensions
      )
    ),
  ];
}
