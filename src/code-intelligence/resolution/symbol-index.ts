import type { CodeSymbol, GraphEdge } from '../../core/types.js';
import type { ParsedImport } from '../types.js';

export interface SymbolIndexes {
  symbolById: Map<string, CodeSymbol>;
  symbolsByFile: Map<string, CodeSymbol[]>;
  symbolsByQualifiedName: Map<string, CodeSymbol[]>;
  symbolsBySimpleName: Map<string, CodeSymbol[]>;
  membersByType: Map<string, CodeSymbol[]>;
  symbolsByLexicalParent: Map<string, CodeSymbol[]>;
  exportsByModule: Map<string, CodeSymbol[]>;
  importsByFile: Map<string, ParsedImport[]>;
}

function normalize(value: string): string {
  return value.replaceAll('\\', '/');
}

export function buildSymbolIndexes(
  projectId: string,
  graphSymbols: Iterable<CodeSymbol>,
  parsedFiles: Iterable<{ filePath: string; imports: ParsedImport[] }>
): SymbolIndexes {
  const symbolById = new Map<string, CodeSymbol>();
  const symbolsByFile = new Map<string, CodeSymbol[]>();
  const symbolsByQualifiedName = new Map<string, CodeSymbol[]>();
  const symbolsBySimpleName = new Map<string, CodeSymbol[]>();
  const membersByType = new Map<string, CodeSymbol[]>();
  const symbolsByLexicalParent = new Map<string, CodeSymbol[]>();
  const exportsByModule = new Map<string, CodeSymbol[]>();
  const importsByFile = new Map<string, ParsedImport[]>();

  const allSymbols = [...graphSymbols];

  for (const symbol of allSymbols) {
    if (symbol.projectId !== projectId) {
      continue;
    }

    symbolById.set(symbol.id, symbol);

    const file = normalize(symbol.filePath);
    const fileList = symbolsByFile.get(file);
    if (fileList) {
      fileList.push(symbol);
    } else {
      symbolsByFile.set(file, [symbol]);
    }

    const simple = symbol.name;
    const simpleList = symbolsBySimpleName.get(simple);
    if (simpleList) {
      simpleList.push(symbol);
    } else {
      symbolsBySimpleName.set(simple, [symbol]);
    }

    if (symbol.qualifiedName) {
      const qnList = symbolsByQualifiedName.get(symbol.qualifiedName);
      if (qnList) {
        qnList.push(symbol);
      } else {
        symbolsByQualifiedName.set(symbol.qualifiedName, [symbol]);
      }
    }
  }

  /*
   * Member linkage.
   *
   * CodeSymbol has no explicit parent id, so members are linked to their
   * owning type deterministically through the qualified name produced by each
   * parser (`User.greet`, `Service.Create`, `User::new`, `api::UserService`).
   * Same file only, so two identically named types in different modules never
   * share members.
   */
  for (const owner of allSymbols) {
    if (owner.projectId !== projectId) {
      continue;
    }
    if (owner.type !== 'class' && owner.type !== 'interface' && owner.type !== 'module') {
      continue;
    }

    const ownerName = owner.qualifiedName ?? owner.name;
    if (!ownerName) {
      continue;
    }

    const prefixes = [`${ownerName}.`, `${ownerName}::`];
    const sameFile = symbolsByFile.get(normalize(owner.filePath)) ?? [];
    const members: CodeSymbol[] = [];

    for (const candidate of sameFile) {
      if (candidate.id === owner.id || !candidate.qualifiedName) {
        continue;
      }
      if (prefixes.some((prefix) => candidate.qualifiedName?.startsWith(prefix))) {
        members.push(candidate);
      }
    }

    if (members.length > 0) {
      membersByType.set(owner.id, members);
    }
  }

  for (const parsed of parsedFiles) {
    const file = normalize(parsed.filePath);
    importsByFile.set(file, parsed.imports);
  }

  return {
    symbolById,
    symbolsByFile,
    symbolsByQualifiedName,
    symbolsBySimpleName,
    membersByType,
    symbolsByLexicalParent,
    exportsByModule,
    importsByFile,
  };
}
