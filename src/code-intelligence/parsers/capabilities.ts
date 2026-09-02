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

export interface ParserCapability {
  language: ParserLanguage;
  extensions: readonly string[];
  supported: boolean;
  engine: ParserEngine;
}

export const PARSER_CAPABILITIES: readonly ParserCapability[] = [
  {
    language: 'typescript',
    extensions: ['.ts'],
    supported: true,
    engine: 'typescript-compiler-api',
  },
  {
    language: 'tsx',
    extensions: ['.tsx'],
    supported: true,
    engine: 'typescript-compiler-api',
  },
  {
    language: 'javascript',
    extensions: ['.js'],
    supported: true,
    engine: 'typescript-compiler-api',
  },
  {
    language: 'jsx',
    extensions: ['.jsx'],
    supported: true,
    engine: 'typescript-compiler-api',
  },
  {
    language: 'mts',
    extensions: ['.mts'],
    supported: true,
    engine: 'typescript-compiler-api',
  },
  {
    language: 'cts',
    extensions: ['.cts'],
    supported: true,
    engine: 'typescript-compiler-api',
  },
  {
    language: 'mjs',
    extensions: ['.mjs'],
    supported: true,
    engine: 'typescript-compiler-api',
  },
  {
    language: 'cjs',
    extensions: ['.cjs'],
    supported: true,
    engine: 'typescript-compiler-api',
  },
  {
    language: 'python',
    extensions: ['.py'],
    supported: false,
    engine: 'unsupported',
  },
  {
    language: 'go',
    extensions: ['.go'],
    supported: false,
    engine: 'unsupported',
  },
  {
    language: 'rust',
    extensions: ['.rs'],
    supported: false,
    engine: 'unsupported',
  },
  {
    language: 'c',
    extensions: ['.c', '.h'],
    supported: false,
    engine: 'unsupported',
  },
  {
    language: 'cpp',
    extensions: ['.cc', '.cpp', '.cxx', '.hpp', '.hh'],
    supported: false,
    engine: 'unsupported',
  },
];

export function parserCapabilityForPath(filePath: string): ParserCapability | undefined {
  const extension = extname(filePath).toLowerCase();

  return PARSER_CAPABILITIES.find((capability) => capability.extensions.includes(extension));
}

export function parserSupportsPath(filePath: string): boolean {
  return parserCapabilityForPath(filePath)?.supported ?? false;
}

export function supportedParserExtensions(): string[] {
  return PARSER_CAPABILITIES.filter((capability) => capability.supported).flatMap(
    (capability) => capability.extensions
  );
}
