import type { ParsedFile } from '../../types.js';
import type { StructuralParseInput } from '../engine.js';
import { BaseStructuralAdapter, addSymbol, makeFileSymbol } from '../adapter.js';
import {
  TreeSitterRuntime,
  fieldOf,
  findNamedChildrenByType,
  hasErrorNode,
  lineOf,
  textOf,
} from './runtime.js';

const PYTHON_GRAMMAR = 'python';

export class TreeSitterPythonAdapter extends BaseStructuralAdapter {
  readonly id = 'tree-sitter-python';
  readonly languages = ['python'] as const;
  readonly engine = 'tree-sitter' as const;

  constructor(private readonly runtime: TreeSitterRuntime) {
    super();
  }

  async parse(input: StructuralParseInput): Promise<ParsedFile> {
    const { projectId, filePath, source, language } = input;
    const parser = await this.runtime.getParser(PYTHON_GRAMMAR);
    if (!parser) {
      throw new Error(`Tree-sitter grammar unavailable for: ${language}`);
    }

    const tree = parser.parse(source);
    if (!tree) {
      throw new Error(`Tree-sitter parse failed for: ${filePath}`);
    }

    const symbols: ParsedFile['symbols'] = [];
    const imports: ParsedFile['imports'] = [];
    const calls: ParsedFile['calls'] = [];
    const heritage: ParsedFile['heritage'] = [];

    const lineCount = Math.max(1, source.split(/\r?\n/u).length);
    symbols.push(makeFileSymbol(projectId, filePath, language, lineCount));

    const root = tree.rootNode;

    /* Ids drive call edges; name stacks drive human-readable qualified names. */
    const callableStack: string[] = [];
    const classStack: string[] = [];
    const functionStack: string[] = [];

    function parseImportStatement(node: any): void {
      const name =
        fieldOf(node, 'name') ??
        findNamedChildrenByType(node, 'aliased_import')[0] ??
        findNamedChildrenByType(node, 'dotted_name')[0];

      if (!name) {
        return;
      }

      if (name.type === 'aliased_import') {
        const target = fieldOf(name, 'name') ?? findNamedChildrenByType(name, 'dotted_name')[0];
        const alias = fieldOf(name, 'alias') ?? findNamedChildrenByType(name, 'identifier').at(-1);
        if (!target) {
          return;
        }
        const targetPath = textOf(target, source);
        imports.push({
          source: targetPath,
          bindings: [
            {
              localName: alias ? textOf(alias, source) : targetPath.split('.').pop() || targetPath,
              importedName: targetPath,
              kind: 'namespace',
            },
          ],
        });
        return;
      }

      const targetPath = textOf(name, source);
      imports.push({
        source: targetPath,
        bindings: [
          {
            localName: targetPath.split('.').pop() || targetPath,
            importedName: targetPath,
            kind: 'namespace',
          },
        ],
      });
    }

    function parseFromImportStatement(node: any): void {
      const moduleNode =
        fieldOf(node, 'module_name') ?? findNamedChildrenByType(node, 'dotted_name')[0];
      const moduleName = moduleNode ? textOf(moduleNode, source) : '';

      const bindings: ParsedFile['imports'][number]['bindings'] = [];

      const pushImported = (target: any): void => {
        if (!target) {
          return;
        }

        if (target.type === 'wildcard_import') {
          bindings.push({ localName: '*', importedName: '*', kind: 'namespace' });
          return;
        }

        if (target.type === 'aliased_import') {
          const imported =
            fieldOf(target, 'name') ?? findNamedChildrenByType(target, 'dotted_name')[0];
          const alias =
            fieldOf(target, 'alias') ?? findNamedChildrenByType(target, 'identifier').at(-1);
          if (!imported) {
            return;
          }
          const full = textOf(imported, source);
          const importedName = full.split('.').pop() || full;
          bindings.push({
            localName: alias ? textOf(alias, source) : importedName,
            importedName,
            kind: 'named',
          });
          return;
        }

        if (target.type === 'dotted_name' || target.type === 'identifier') {
          const full = textOf(target, source);
          bindings.push({
            localName: full.split('.').pop() || full,
            importedName: full.split('.').pop() || full,
            kind: 'named',
          });
        }
      };

      const nameNode = fieldOf(node, 'name');

      if (nameNode) {
        pushImported(nameNode);
      } else {
        /* Parenthesized `from x import (a, b)` form. */
        for (let i = 0; i < node.childCount; i++) {
          const child = node.child(i);
          if (!child || !child.isNamed || child === moduleNode) {
            continue;
          }
          if (child.type === 'named_imports') {
            for (let j = 0; j < child.childCount; j++) {
              const inner = child.child(j);
              if (inner && inner.isNamed) {
                pushImported(inner);
              }
            }
          } else {
            pushImported(child);
          }
        }
      }

      if (bindings.length && moduleName) {
        imports.push({ source: moduleName, bindings });
      }
    }

    const visit = (node: any): void => {
      let pushedCallable = false;
      let pushedClass = false;

      if (node.type === 'import_statement') {
        parseImportStatement(node);
      }

      if (node.type === 'import_from_statement') {
        parseFromImportStatement(node);
      }

      if (node.type === 'class_definition') {
        const nameNode = findNamedChildrenByType(node, 'identifier')[0];
        const name = nameNode ? textOf(nameNode, source) : '';
        if (name) {
          const parent = classStack.at(-1);
          const qualifiedName = parent ? `${parent}.${name}` : name;
          const id = addSymbol(
            symbols,
            projectId,
            filePath,
            name,
            'class',
            qualifiedName,
            lineOf(node, source),
            lineOf(node, source) + node.endPosition.row - node.startPosition.row,
            {
              structuralParser: true,
            }
          );
          functionStack.push(qualifiedName);
          classStack.push(qualifiedName);
          pushedClass = true;

          const argList = findNamedChildrenByType(node, 'argument_list')[0];
          if (argList) {
            for (const base of findNamedChildrenByType(argList, 'identifier')) {
              heritage.push({
                fromId: id,
                targetName: textOf(base, source),
                type: 'INHERITS',
              });
            }
            for (const base of findNamedChildrenByType(argList, 'attribute')) {
              heritage.push({
                fromId: id,
                targetName: textOf(base, source),
                type: 'INHERITS',
              });
            }
          }
        }
      }

      if (node.type === 'function_definition') {
        const nameNode = fieldOf(node, 'name') ?? findNamedChildrenByType(node, 'identifier')[0];
        const name = nameNode ? textOf(nameNode, source) : '';
        if (name) {
          const classParent = classStack.at(-1);
          const functionParent = functionStack.at(-1);
          const parent = classParent ?? functionParent;
          const qualifiedName = parent ? `${parent}.${name}` : name;
          const type = classParent ? 'method' : 'function';
          const id = addSymbol(
            symbols,
            projectId,
            filePath,
            name,
            type,
            qualifiedName,
            lineOf(node, source),
            lineOf(node, source) + node.endPosition.row - node.startPosition.row,
            {
              structuralParser: true,
            }
          );
          callableStack.push(id);
          functionStack.push(qualifiedName);
          pushedCallable = true;
        }
      }

      if (node.type === 'call') {
        const func = findNamedChildrenByType(node, 'identifier')[0];
        const attr = findNamedChildrenByType(node, 'attribute')[0];
        if (func && !attr) {
          calls.push({
            callerId: callableStack.at(-1),
            calleeName: textOf(func, source),
            line: lineOf(node, source),
          });
        } else if (attr) {
          const obj = fieldOf(attr, 'object');
          const attrName = textOf(attr, source).split('.').pop() || '';
          const qualifier =
            obj && (obj.type === 'identifier' || obj.type === 'attribute')
              ? textOf(obj, source)
              : undefined;
          calls.push({
            callerId: callableStack.at(-1),
            qualifier,
            calleeName: attrName,
            line: lineOf(node, source),
          });
        }
      }

      for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (child && child.isNamed) {
          visit(child);
        }
      }

      if (pushedCallable) {
        callableStack.pop();
        functionStack.pop();
      }
      if (pushedClass) {
        classStack.pop();
        functionStack.pop();
      }
    };

    visit(root);

    const hasErrors = hasErrorNode(root);

    return {
      filePath,
      symbols,
      imports,
      calls,
      heritage,
      parser: {
        id: this.id,
        engine: this.engine,
        language,
        structural: true,
      },
      diagnostics: hasErrors
        ? [
            {
              code: 'PARTIAL_AST',
              severity: 'warning',
              filePath,
              message: 'Parse tree contains error nodes',
            },
          ]
        : [],
    };
  }
}
