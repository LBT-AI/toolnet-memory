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

const CPP_GRAMMAR = 'cpp';

export class TreeSitterCppAdapter extends BaseStructuralAdapter {
  readonly id = 'tree-sitter-cpp';
  readonly languages = ['cpp'] as const;
  readonly engine = 'tree-sitter' as const;

  constructor(private readonly runtime: TreeSitterRuntime) {
    super();
  }

  async parse(input: StructuralParseInput): Promise<ParsedFile> {
    const { projectId, filePath, source, language } = input;
    const parser = await this.runtime.getParser(CPP_GRAMMAR);
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

    const namespaceStack: string[] = [];
    const classStack: string[] = [];
    const callableStack: string[] = [];

    const qualifiedPrefix = (): string => namespaceStack.join('::');

    const visit = (node: any): void => {
      let pushedCallable = false;
      let pushedClass = false;
      let pushedNamespace = false;

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

      if (node.type === 'namespace_definition') {
        const nameNode = findNamedChildrenByType(node, 'namespace_identifier')[0];
        const name = nameNode ? textOf(nameNode, source) : '';
        if (name) {
          namespaceStack.push(name);
          pushedNamespace = true;
        }
      }

      if (node.type === 'class_specifier') {
        const nameNode = findNamedChildrenByType(node, 'type_identifier')[0];
        const name = nameNode ? textOf(nameNode, source) : '';
        if (name) {
          const ns = qualifiedPrefix();
          const qualifiedName = ns ? `${ns}::${name}` : name;
          const id = addSymbol(
            symbols,
            projectId,
            filePath,
            name,
            'class',
            qualifiedName,
            lineOf(node, source),
            lineOf(node, source) + node.endPosition.row - node.startPosition.row
          );
          /* Owner stack holds qualified names so members link to their type. */
          classStack.push(qualifiedName);
          pushedClass = true;

          // Heritage: class UserService : public Service
          const baseClause = findNamedChildrenByType(node, 'base_class_clause')[0];
          if (baseClause) {
            for (const base of findNamedChildrenByType(baseClause, 'type_identifier')) {
              heritage.push({
                fromId: id,
                targetName: textOf(base, source),
                type: 'INHERITS',
              });
            }
          }
        }
      }

      if (
        node.type === 'function_definition' ||
        node.type === 'function_declaration' ||
        (node.type === 'field_declaration' &&
          findNamedChildrenByType(node, 'function_declarator').length > 0)
      ) {
        const declarator = findNamedChildrenByType(node, 'function_declarator')[0];
        const nameNode = findNamedChildrenByType(declarator, 'identifier')[0];
        const fieldNode = findNamedChildrenByType(declarator, 'field_identifier')[0];
        const destructorNode = findNamedChildrenByType(declarator, 'destructor_name')[0];
        const name = nameNode
          ? textOf(nameNode, source)
          : fieldNode
            ? textOf(fieldNode, source)
            : destructorNode
              ? textOf(destructorNode, source)
              : '';
        if (name) {
          const owner = classStack.at(-1);
          const ns = qualifiedPrefix();
          let qualifiedName: string;
          let type: ParsedFile['symbols'][number]['type'];
          if (owner) {
            qualifiedName = `${owner}::${name}`;
            type = 'method';
          } else {
            qualifiedName = ns ? `${ns}::${name}` : name;
            type = 'function';
          }
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

      /*
       * Free-function prototypes at namespace/global scope are `declaration`
       * nodes in this grammar. Record them so cross-file calls can resolve to
       * a project-local declaration.
       */
      if (node.type === 'declaration') {
        const declarator = findNamedChildrenByType(node, 'function_declarator')[0];
        const nameNode = declarator
          ? findNamedChildrenByType(declarator, 'identifier')[0]
          : undefined;
        const name = nameNode ? textOf(nameNode, source) : '';
        if (name) {
          const namespacePrefix = qualifiedPrefix();
          addSymbol(
            symbols,
            projectId,
            filePath,
            name,
            'function',
            namespacePrefix ? `${namespacePrefix}::${name}` : name,
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
        const qualified = findNamedChildrenByType(node, 'qualified_identifier')[0];
        const field = findNamedChildrenByType(node, 'field_expression')[0];
        if (func && !qualified && !field) {
          calls.push({
            callerId: callableStack.at(-1),
            calleeName: textOf(func, source),
            line: lineOf(node, source),
          });
        } else if (qualified) {
          const parts = textOf(qualified, source).split('::');
          calls.push({
            callerId: callableStack.at(-1),
            qualifier: parts.slice(0, -1).join('::'),
            calleeName: parts[parts.length - 1] || '',
            line: lineOf(node, source),
          });
        } else if (field) {
          const objs = findNamedChildrenByType(field, 'identifier');
          const fieldId = findNamedChildrenByType(field, 'field_identifier')[0];
          calls.push({
            callerId: callableStack.at(-1),
            qualifier: objs.length ? textOf(objs[objs.length - 1], source) : undefined,
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
      if (pushedClass) {
        classStack.pop();
      }
      if (pushedNamespace) {
        namespaceStack.pop();
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
