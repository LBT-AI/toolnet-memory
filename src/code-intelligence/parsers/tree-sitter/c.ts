import type { ParsedFile } from '../../types.js';
import type { StructuralParseInput } from '../engine.js';
import { BaseStructuralAdapter, addSymbol, makeFileSymbol } from '../adapter.js';
import {
  TreeSitterRuntime,
  findNamedChildrenByType,
  hasErrorNode,
  lineOf,
  textOf,
} from './runtime.js';

const C_GRAMMAR = 'c';

export class TreeSitterCAdapter extends BaseStructuralAdapter {
  readonly id = 'tree-sitter-c';
  readonly languages = ['c'] as const;
  readonly engine = 'tree-sitter' as const;

  constructor(private readonly runtime: TreeSitterRuntime) {
    super();
  }

  async parse(input: StructuralParseInput): Promise<ParsedFile> {
    const { projectId, filePath, source, language } = input;
    const parser = await this.runtime.getParser(C_GRAMMAR);
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

    const visit = (node: any): void => {
      let pushedCallable = false;

      if (node.type === 'preproc_include') {
        const str = findNamedChildrenByType(node, 'string_literal')[0];
        const systemStr = findNamedChildrenByType(node, 'system_lib_string')[0];
        if (str) {
          const raw = textOf(str, source);
          const source2 = raw.replace(/^"|"$/g, '');
          imports.push({
            source: source2,
            bindings: [
              {
                localName: source2.split('/').pop() || source2,
                importedName: source2,
                kind: 'named',
              },
            ],
          });
        } else if (systemStr) {
          const source2 = textOf(systemStr, source).replace(/^<|>$/g, '');
          imports.push({
            source: source2,
            bindings: [
              {
                localName: source2.split('/').pop() || source2,
                importedName: source2,
                kind: 'named',
              },
            ],
          });
        }
      }

      if (node.type === 'type_definition') {
        const typeId = findNamedChildrenByType(node, 'type_identifier')[0];
        const name = typeId ? textOf(typeId, source) : '';
        if (name) {
          const typedefType = findNamedChildrenByType(node, 'primitive_type')[0];
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
              kind: typedefType ? 'typedef' : 'type',
            }
          );
        }
      }

      if (node.type === 'struct_specifier') {
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

      if (node.type === 'enum_specifier') {
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

      if (node.type === 'function_definition') {
        const declarator = findNamedChildrenByType(node, 'function_declarator')[0];
        if (declarator) {
          const nameNode = findNamedChildrenByType(declarator, 'identifier')[0];
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
      }

      /*
       * Function prototypes (`int create_order(void);`) are declarations, not
       * definitions. They are recorded so cross-file calls can resolve to a
       * project-local header declaration.
       */
      if (node.type === 'declaration') {
        const declarator = findNamedChildrenByType(node, 'function_declarator')[0];
        const nameNode = declarator
          ? findNamedChildrenByType(declarator, 'identifier')[0]
          : undefined;
        const name = nameNode ? textOf(nameNode, source) : '';
        if (name) {
          addSymbol(
            symbols,
            projectId,
            filePath,
            name,
            'function',
            name,
            lineOf(node, source),
            lineOf(node, source) + node.endPosition.row - node.startPosition.row,
            {
              kind: 'declaration',
            }
          );
        }
      }

      if (node.type === 'call_expression') {
        const func = findNamedChildrenByType(node, 'identifier')[0];
        if (func) {
          calls.push({
            callerId: callableStack.at(-1),
            calleeName: textOf(func, source),
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
