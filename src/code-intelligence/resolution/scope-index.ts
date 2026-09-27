import type { CodeSymbol } from '../../core/types.js';

export type BindingKind = 'function' | 'variable' | 'import' | 'parameter' | 'class';

export interface ScopeBinding {
  name: string;
  symbolId: string;
  kind: BindingKind;
}

export interface LexicalScope {
  symbolId: string;
  filePath: string;
  parentScopeId?: string;
  bindings: Map<string, ScopeBinding>;
}

export interface ScopeIndex {
  scopesBySymbol: Map<string, LexicalScope>;
  scopesByFile: Map<string, LexicalScope[]>;
  fileSymbolScopes: Map<string, LexicalScope>;
}

function normalize(value: string): string {
  return value.replaceAll('\\', '/');
}

function fileScopeId(filePath: string): string {
  return `file:${normalize(filePath)}`;
}

export function buildScopeIndex(projectId: string, symbols: Iterable<CodeSymbol>): ScopeIndex {
  const scopesBySymbol = new Map<string, LexicalScope>();
  const scopesByFile = new Map<string, LexicalScope[]>();
  const fileSymbolScopes = new Map<string, LexicalScope>();

  for (const symbol of symbols) {
    if (symbol.projectId !== projectId) {
      continue;
    }

    const file = normalize(symbol.filePath);
    const scopeId = symbol.id;

    const isFile = symbol.type === 'file';
    const parentScopeId = isFile ? undefined : fileScopeId(file);

    const scope: LexicalScope = {
      symbolId: scopeId,
      filePath: file,
      parentScopeId,
      bindings: new Map(),
    };

    scopesBySymbol.set(scopeId, scope);

    const fileList = scopesByFile.get(file);
    if (fileList) {
      fileList.push(scope);
    } else {
      scopesByFile.set(file, [scope]);
    }

    if (isFile) {
      fileSymbolScopes.set(file, scope);
    }
  }

  return {
    scopesBySymbol,
    scopesByFile,
    fileSymbolScopes,
  };
}
