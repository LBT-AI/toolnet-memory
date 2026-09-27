import * as ts from 'typescript';

import { dirname, relative } from 'node:path';

import type { ParsedCall } from '../../types.js';

import type { ResolutionEvidence } from '../types.js';

function normalize(value: string): string {
  return value.replaceAll('\\', '/').replace(/^\.\//, '');
}

export function resolveTypeScriptCall(
  projectId: string,
  rootPath: string,
  filePath: string,
  call: ParsedCall,
  checker: ts.TypeChecker,
  sourceFiles: readonly ts.SourceFile[]
): { symbolId?: string; evidence: ResolutionEvidence[] } | null {
  const found = sourceFiles.find((sf) => normalize(sf.fileName) === normalize(filePath));
  if (!found) {
    return null;
  }
  const source = found;

  const line = call.line ?? 1;
  let node: ts.Node | undefined;

  function visit(n: ts.Node): boolean {
    const pos = source.getLineAndCharacterOfPosition(n.getStart(source)).line + 1;
    if (pos !== line) {
      return false;
    }
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) {
      if (n.expression.text === call.calleeName && !call.qualifier) {
        node = n;
        return true;
      }
    }
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)) {
      if (
        n.expression.name.text === call.calleeName &&
        n.expression.expression.getText(source) === (call.qualifier ?? '')
      ) {
        node = n;
        return true;
      }
    }
    return false;
  }

  function walk(n: ts.Node): void {
    if (visit(n)) {
      return;
    }
    ts.forEachChild(n, walk);
  }

  walk(source);
  if (!node || !ts.isCallExpression(node)) {
    return null;
  }

  const callExpr = node as ts.CallExpression;
  const signature = checker.getResolvedSignature(callExpr);
  let declaration = signature?.declaration as ts.Declaration | undefined;
  if (!declaration) {
    const symbol = checker.getSymbolAtLocation(callExpr.expression);
    declaration = symbol?.valueDeclaration ?? symbol?.declarations?.[0];
  }

  if (!declaration) {
    return null;
  }

  const declarationSource = declaration.getSourceFile();
  if (declarationSource.isDeclarationFile) {
    return null;
  }

  return {
    symbolId: undefined,
    evidence: call.qualifier
      ? [{ kind: 'receiver_type', typeSymbolId: call.qualifier }]
      : [{ kind: 'same_lexical_scope', scopeSymbolId: filePath }],
  };
}
