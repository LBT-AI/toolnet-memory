import type { ParserCapability, ParserLanguage } from './capabilities.js';
import { PARSER_CAPABILITIES } from './capabilities.js';
import type { detectLspCapabilities } from './lsp-capabilities.js';

export type LspCapability = ReturnType<typeof detectLspCapabilities>[number];

export interface CapabilityReport {
  structuralLanguages: ParserLanguage[];
  treeSitterAvailable: boolean;
  treeSitterLanguages: string[];
  treeSitterUnavailable: string[];
  textLines: string[];
}

/**
 * Pure capability report.
 *
 * PARSER_CAPABILITIES declares what the software supports; `treeSitter` is
 * the set of tree-sitter languages whose grammar assets actually resolved
 * in this runtime. No filesystem, no clock, no I/O — fully deterministic
 * for a given input set, which is what makes the standalone fallback
 * rendering testable without a single-binary build.
 */
export function isStructurallyAvailable(
  capability: ParserCapability,
  treeSitter: ReadonlySet<string>
): boolean {
  if (!capability.structural) {
    return false;
  }

  if (capability.engine !== 'tree-sitter') {
    return true;
  }

  return treeSitter.has(capability.language);
}

export function buildCapabilityReport(
  treeSitter: ReadonlySet<string>,
  lsp: LspCapability[]
): CapabilityReport {
  const structuralLanguages = PARSER_CAPABILITIES.filter((item) =>
    isStructurallyAvailable(item, treeSitter)
  ).map((item) => item.language);

  const treeSitterDeclared = PARSER_CAPABILITIES.filter(
    (item) => item.engine === 'tree-sitter'
  ).map((item) => item.language);

  const treeSitterUnavailable = treeSitterDeclared.filter((language) => !treeSitter.has(language));

  const textLines = [
    'ToolNet Code Intelligence Capabilities',
    '',
    'Structural parser: TypeScript Compiler API',
    ...PARSER_CAPABILITIES.map((capability) =>
      [
        capability.language.padEnd(12),
        isStructurallyAvailable(capability, treeSitter) ? 'structural=yes' : 'structural=no',
        capability.lexicalSearch ? 'lexical=yes' : 'lexical=no',
        capability.lspServer ? `lsp=${capability.lspServer}` : '',
      ]
        .filter(Boolean)
        .join('  ')
    ),
  ];

  if (treeSitterUnavailable.length > 0) {
    textLines.push(
      '',
      `Tree-sitter grammars unavailable in this runtime (${treeSitterUnavailable.join(', ')}):`,
      'structural parsing falls back to lexical search for those languages.'
    );
  }

  textLines.push(
    '',
    'LSP detection:',
    ...lsp.map((server) =>
      [
        server.language.padEnd(12),
        server.command.padEnd(22),
        server.installed ? 'available' : 'not-installed',
      ].join(' ')
    )
  );

  return {
    structuralLanguages,
    treeSitterAvailable: treeSitterUnavailable.length === 0,
    treeSitterLanguages: [...treeSitter].sort(),
    treeSitterUnavailable: [...treeSitterUnavailable].sort(),
    textLines,
  };
}
