import type { ParsedFile } from '../../types.js';
import type { StructuralParseInput } from '../engine.js';
import { BaseStructuralAdapter, addSymbol, makeFileSymbol } from '../adapter.js';
import {
  TreeSitterRuntime,
  fieldOf,
  findDescendantByType,
  findNamedChildrenByType,
  hasErrorNode,
  lineOf,
  textOf,
} from './runtime.js';

const GO_GRAMMAR = 'go';

export class TreeSitterGoAdapter extends BaseStructuralAdapter {
  readonly id = 'tree-sitter-go';
  readonly languages = ['go'] as const;
  readonly engine = 'tree-sitter' as const;

  constructor(private readonly runtime: TreeSitterRuntime) {
    super();
  }

  async parse(input: StructuralParseInput): Promise<ParsedFile> {
    const { projectId, filePath, source, language } = input;
    const parser = await this.runtime.getParser(GO_GRAMMAR);
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

    function parseImportDeclaration(node: any): void {
      const specList = findNamedChildrenByType(node, 'import_spec_list')[0];
      if (specList) {
        for (const spec of findNamedChildrenByType(specList, 'import_spec')) {
          const str = findNamedChildrenByType(spec, 'interpreted_string_literal')[0];
          const pkg = findNamedChildrenByType(spec, 'package_identifier')[0];
          if (str) {
            const raw = textOf(str, source);
            const source2 = raw.replace(/^"|"$/g, '');
            const alias = pkg ? textOf(pkg, source) : '';
            imports.push({
              source: source2,
              bindings: [
                {
                  localName: alias || source2.split('/').pop() || source2,
                  importedName: source2,
                  kind: 'named',
                },
              ],
            });
          }
        }
      } else {
        const spec = findNamedChildrenByType(node, 'import_spec')[0];
        if (spec) {
          const str = findNamedChildrenByType(spec, 'interpreted_string_literal')[0];
          const pkg = findNamedChildrenByType(spec, 'package_identifier')[0];
          if (str) {
            const raw = textOf(str, source);
            const source2 = raw.replace(/^"|"$/g, '');
            const alias = pkg ? textOf(pkg, source) : '';
            imports.push({
              source: source2,
              bindings: [
                {
                  localName: alias || source2.split('/').pop() || source2,
                  importedName: source2,
                  kind: 'named',
                },
              ],
            });
          }
        }
      }
    }

    const visit = (node: any): void => {
      let pushedCallable = false;

      if (node.type === 'import_declaration') {
        parseImportDeclaration(node);
      }

      if (node.type === 'type_declaration') {
        for (const spec of findNamedChildrenByType(node, 'type_spec')) {
          const nameNode = findNamedChildrenByType(spec, 'type_identifier')[0];
          const name = nameNode ? textOf(nameNode, source) : '';
          if (!name) {
            continue;
          }
          const structType = findNamedChildrenByType(spec, 'struct_type')[0];
          const interfaceType = findNamedChildrenByType(spec, 'interface_type')[0];
          if (structType) {
            addSymbol(
              symbols,
              projectId,
              filePath,
              name,
              'class',
              name,
              lineOf(spec, source),
              lineOf(spec, source) + spec.endPosition.row - spec.startPosition.row,
              {
                kind: 'struct',
              }
            );
          }
          if (interfaceType) {
            addSymbol(
              symbols,
              projectId,
              filePath,
              name,
              'interface',
              name,
              lineOf(spec, source),
              lineOf(spec, source) + spec.endPosition.row - spec.startPosition.row
            );
          }
        }
      }

      if (node.type === 'function_declaration') {
        const nameNode = findNamedChildrenByType(node, 'identifier')[0];
        const name = nameNode ? textOf(nameNode, source) : '';
        if (name) {
          const id = addSymbol(
            symbols,
            projectId,
            filePath,
            name,
            'function',
            name,
            lineOf(node, source),
            lineOf(node, source) + node.endPosition.row - node.startPosition.row
          );
          callableStack.push(id);
          pushedCallable = true;
        }
      }

      if (node.type === 'method_declaration') {
        const fieldIdNode =
          fieldOf(node, 'name') ?? findNamedChildrenByType(node, 'field_identifier')[0];
        const receiver = fieldOf(node, 'receiver');
        /*
         * Receiver type is nested (parameter_list > parameter_declaration >
         * pointer_type > type_identifier), so a descendant lookup is required
         * to keep `func (s *Service) Create()` normalised as Service.Create.
         */
        const typeNode = receiver
          ? findDescendantByType(receiver, 'type_identifier')
          : findDescendantByType(node, 'type_identifier');
        const name = fieldIdNode ? textOf(fieldIdNode, source) : '';
        const owner = typeNode ? textOf(typeNode, source) : '';
        if (name) {
          const qualifiedName = owner ? `${owner}.${name}` : name;
          const id = addSymbol(
            symbols,
            projectId,
            filePath,
            name,
            'method',
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
        const selector = findNamedChildrenByType(node, 'selector_expression')[0];
        if (func && !selector) {
          calls.push({
            callerId: callableStack.at(-1),
            calleeName: textOf(func, source),
            line: lineOf(node, source),
          });
        } else if (selector) {
          const obj = findNamedChildrenByType(selector, 'identifier')[0];
          const field = findNamedChildrenByType(selector, 'field_identifier')[0];
          calls.push({
            callerId: callableStack.at(-1),
            qualifier: obj ? textOf(obj, source) : undefined,
            calleeName: field ? textOf(field, source) : '',
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
