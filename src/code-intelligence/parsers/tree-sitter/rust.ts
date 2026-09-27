import { createHash } from 'node:crypto';

import type { ParsedFile } from '../../types.js';
import type { StructuralParseInput } from '../engine.js';
import { BaseStructuralAdapter, addSymbol, makeFileSymbol, makeSymbolId } from '../adapter.js';
import {
  TreeSitterRuntime,
  fieldOf,
  findNamedChildrenByType,
  hasErrorNode,
  lineOf,
  textOf,
} from './runtime.js';

const RUST_GRAMMAR = 'rust';

export class TreeSitterRustAdapter extends BaseStructuralAdapter {
  readonly id = 'tree-sitter-rust';
  readonly languages = ['rust'] as const;
  readonly engine = 'tree-sitter' as const;

  constructor(private readonly runtime: TreeSitterRuntime) {
    super();
  }

  async parse(input: StructuralParseInput): Promise<ParsedFile> {
    const { projectId, filePath, source, language } = input;
    const parser = await this.runtime.getParser(RUST_GRAMMAR);
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

    const callableStack: string[] = [];
    const implStack: string[] = [];
    const moduleStack: string[] = [];

    function parseUseDeclaration(node: any): void {
      const scoped = findNamedChildrenByType(node, 'scoped_identifier')[0];
      const useList = findNamedChildrenByType(node, 'scoped_use_list')[0];
      if (useList) {
        const idNode = findNamedChildrenByType(useList, 'identifier')[0];
        const list = findNamedChildrenByType(useList, 'use_list')[0];
        const source2 = idNode ? textOf(idNode, source) : '';
        const bindings: ParsedFile['imports'][number]['bindings'] = [];
        if (list) {
          for (const item of findNamedChildrenByType(list, 'identifier')) {
            bindings.push({
              localName: textOf(item, source),
              importedName: textOf(item, source),
              kind: 'named',
            });
          }
        }
        if (bindings.length) {
          imports.push({ source: source2, bindings });
        }
      } else if (scoped) {
        const full = textOf(scoped, source);
        const parts = full.split('::');
        const source2 = parts.slice(0, -1).join('::');
        const importedName = parts[parts.length - 1] || '';
        imports.push({
          source: source2,
          bindings: [
            {
              localName: importedName,
              importedName,
              kind: 'named',
            },
          ],
        });
      }
    }

    const visit = (node: any): void => {
      let pushedCallable = false;
      let pushedImpl = false;
      let pushedModule = false;

      if (node.type === 'use_declaration') {
        parseUseDeclaration(node);
      }

      if (node.type === 'mod_item') {
        const nameNode = fieldOf(node, 'name') ?? findNamedChildrenByType(node, 'identifier')[0];
        const name = nameNode ? textOf(nameNode, source) : '';
        if (name) {
          addSymbol(
            symbols,
            projectId,
            filePath,
            name,
            'module',
            name,
            lineOf(node, source),
            lineOf(node, source) + node.endPosition.row - node.startPosition.row
          );

          const hasBody = findNamedChildrenByType(node, 'declaration_list').length > 0;
          if (hasBody) {
            moduleStack.push(name);
            pushedModule = true;
          } else {
            /*
             * `mod orders;` declares an external module file. It is modelled
             * as a namespace import so module-qualified calls resolve through
             * the module resolver instead of by simple name.
             */
            imports.push({
              source: `self::${name}`,
              bindings: [{ localName: name, importedName: name, kind: 'namespace' }],
            });
          }
        }
      }

      if (node.type === 'struct_item') {
        const nameNode = findNamedChildrenByType(node, 'type_identifier')[0];
        const name = nameNode ? textOf(nameNode, source) : '';
        if (name) {
          addSymbol(
            symbols,
            projectId,
            filePath,
            name,
            'class',
            name,
            lineOf(node, source),
            lineOf(node, source) + node.endPosition.row - node.startPosition.row,
            {
              kind: 'struct',
            }
          );
        }
      }

      if (node.type === 'enum_item') {
        const nameNode = findNamedChildrenByType(node, 'type_identifier')[0];
        const name = nameNode ? textOf(nameNode, source) : '';
        if (name) {
          addSymbol(
            symbols,
            projectId,
            filePath,
            name,
            'class',
            name,
            lineOf(node, source),
            lineOf(node, source) + node.endPosition.row - node.startPosition.row,
            {
              kind: 'enum',
            }
          );
        }
      }

      if (node.type === 'trait_item') {
        const nameNode = findNamedChildrenByType(node, 'type_identifier')[0];
        const name = nameNode ? textOf(nameNode, source) : '';
        if (name) {
          addSymbol(
            symbols,
            projectId,
            filePath,
            name,
            'interface',
            name,
            lineOf(node, source),
            lineOf(node, source) + node.endPosition.row - node.startPosition.row
          );
        }
      }

      if (node.type === 'impl_item') {
        /*
         * `impl Trait for Type` -> Type IMPLEMENTS Trait.
         *
         * Fields are authoritative: `trait:` comes first in source order,
         * so positional children would invert the relationship.
         */
        const typeNode =
          fieldOf(node, 'type') ?? findNamedChildrenByType(node, 'type_identifier').at(-1);
        const traitNode =
          fieldOf(node, 'trait') ?? findNamedChildrenByType(node, 'type_identifier')[0];
        const typeName = typeNode ? textOf(typeNode, source) : '';
        const traitName = traitNode ? textOf(traitNode, source) : '';

        if (typeName && traitName && traitName !== typeName) {
          heritage.push({
            fromId: makeSymbolId(projectId, filePath, 'class', typeName),
            targetName: traitName,
            type: 'IMPLEMENTS',
          });
        }

        if (typeName) {
          implStack.push(typeName);
          pushedImpl = true;
        }
      }

      if (node.type === 'function_item') {
        const nameNode = fieldOf(node, 'name') ?? findNamedChildrenByType(node, 'identifier')[0];
        const name = nameNode ? textOf(nameNode, source) : '';
        if (name) {
          const owner = implStack.at(-1) ?? moduleStack.at(-1);
          const type = implStack.at(-1) ? 'method' : 'function';
          const qualifiedName = owner ? `${owner}::${name}` : name;
          const id = addSymbol(
            symbols,
            projectId,
            filePath,
            name,
            type,
            qualifiedName,
            lineOf(node, source),
            lineOf(node, source) + node.endPosition.row - node.startPosition.row
          );
          callableStack.push(id);
          pushedCallable = true;
        }
      }

      if (node.type === 'call_expression') {
        const func = findNamedChildrenByType(node, 'identifier')[0];
        const scoped = findNamedChildrenByType(node, 'scoped_identifier')[0];
        const field = findNamedChildrenByType(node, 'field_expression')[0];
        if (func && !scoped && !field) {
          calls.push({
            callerId: callableStack.at(-1),
            calleeName: textOf(func, source),
            line: lineOf(node, source),
          });
        } else if (scoped) {
          const scopedName = textOf(scoped, source);
          calls.push({
            callerId: callableStack.at(-1),
            calleeName: scopedName.split('::').pop() || '',
            qualifier: scopedName.split('::').slice(0, -1).join('::'),
            line: lineOf(node, source),
          });
        } else if (field) {
          const obj = findNamedChildrenByType(field, 'identifier')[0];
          const fieldId = findNamedChildrenByType(field, 'identifier').slice(-1)[0];
          calls.push({
            callerId: callableStack.at(-1),
            qualifier: obj ? textOf(obj, source) : undefined,
            calleeName: fieldId ? textOf(fieldId, source) : '',
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
      }
      if (pushedImpl) {
        implStack.pop();
      }
      if (pushedModule) {
        moduleStack.pop();
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
