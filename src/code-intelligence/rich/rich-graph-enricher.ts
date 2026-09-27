import { createHash } from 'node:crypto';

import { dirname, relative, resolve } from 'node:path';

import * as ts from 'typescript';

import type { CodeSymbol, GraphEdge } from '../../core/types.js';

import type { CodeGraphStore } from '../graph/graph-store.js';

import { canonicalResolutionKind } from '../resolution/legacy.js';

import type { ResolutionSnapshot, ResolutionResult } from '../resolution/types.js';
import type { TypeResolutionSnapshot } from '../resolution/types.js';

import type { StageProgressCallback } from '../types.js';

import { createGraphEdge } from '../graph/edge-factory.js';
import { createEdgeProvenance } from '../graph/edge-provenance.js';
import {
  getEdgeSemanticDefinition,
  isEdgeTypeAllowed,
  type GraphEdgeType,
} from '../graph/edge-semantic-registry.js';

const WRITABLE_TARGET_TYPES: readonly CodeSymbol['type'][] =
  getEdgeSemanticDefinition('WRITES')?.allowedTargetTypes ?? [];

function normalize(value: string): string {
  return value.replaceAll('\\', '/').replace(/^\.\//, '');
}

function id(...parts: unknown[]): string {
  return createHash('sha256').update(parts.join(':')).digest('hex').slice(0, 24);
}

function lineOf(source: ts.SourceFile, node: ts.Node): number {
  return source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
}

const ROUTE_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head']);

const ASSIGNMENTS = new Set([
  ts.SyntaxKind.EqualsToken,
  ts.SyntaxKind.PlusEqualsToken,
  ts.SyntaxKind.MinusEqualsToken,
  ts.SyntaxKind.AsteriskEqualsToken,
  ts.SyntaxKind.SlashEqualsToken,
  ts.SyntaxKind.PercentEqualsToken,
  ts.SyntaxKind.QuestionQuestionEqualsToken,
  ts.SyntaxKind.AmpersandAmpersandEqualsToken,
  ts.SyntaxKind.BarBarEqualsToken,
]);

export interface RichGraphStats {
  routes: number;
  tests: number;
  usesType: number;
  reads: number;
  writes: number;
  callReferences: number;
  properties: number;
}

export class RichGraphEnricher {
  constructor(private readonly graph: CodeGraphStore) {}

  enrich(
    projectId: string,
    rootPath: string,
    resolution?: ResolutionSnapshot | TypeResolutionSnapshot | null,
    onProgress?: StageProgressCallback
  ): RichGraphStats {
    const stats: RichGraphStats = {
      routes: 0,
      tests: 0,
      usesType: 0,
      reads: 0,
      writes: 0,
      callReferences: 0,
      properties: 0,
    };

    const config = this.loadConfig(rootPath);

    const program = ts.createProgram({
      rootNames: config.fileNames,
      options: config.options,
    });

    const checker = program.getTypeChecker();

    const validSources = program.getSourceFiles().filter((source) => {
      if (source.isDeclarationFile) {
        return false;
      }

      const filePath = normalize(relative(rootPath, resolve(source.fileName)));

      if (filePath.startsWith('../') || filePath.includes('node_modules/')) {
        return false;
      }

      return true;
    });

    let processedFiles = 0;

    for (const source of validSources) {
      const filePath = normalize(relative(rootPath, resolve(source.fileName)));

      const fileNode = this.fileNode(projectId, filePath);

      if (!fileNode) {
        continue;
      }

      /*
       * Write targets are tracked so `this.value = x` produces a WRITES edge
       * without a duplicate READS edge for the same property access.
       */
      const writeTargets = new Set<ts.Node>();

      const visit = (node: ts.Node) => {
        if (ts.isCallExpression(node)) {
          if (this.addRoute(projectId, rootPath, source, fileNode, node, checker)) {
            stats.routes++;
          }
        }

        if (ts.isTypeReferenceNode(node)) {
          if (this.addTypeUse(projectId, rootPath, source, node, checker)) {
            stats.usesType++;
          }
        }

        if (ts.isBinaryExpression(node) && ASSIGNMENTS.has(node.operatorToken.kind)) {
          writeTargets.add(node.left);

          const result = this.addWrite(projectId, rootPath, source, node.left, checker);

          if (result.added) {
            stats.writes++;

            if (result.propertyCreated) {
              stats.properties++;
            }
          }
        }

        if (
          (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) &&
          (node.operator === ts.SyntaxKind.PlusPlusToken ||
            node.operator === ts.SyntaxKind.MinusMinusToken)
        ) {
          writeTargets.add(node.operand);

          const result = this.addWrite(projectId, rootPath, source, node.operand, checker);

          if (result.added) {
            stats.writes++;

            if (result.propertyCreated) {
              stats.properties++;
            }
          }
        }

        if (ts.isPropertyAccessExpression(node) && !writeTargets.has(node)) {
          const result = this.addRead(projectId, rootPath, source, node, checker);

          if (result.added) {
            stats.reads++;

            if (result.propertyCreated) {
              stats.properties++;
            }
          }
        }

        ts.forEachChild(node, visit);
      };

      visit(source);

      processedFiles++;
      onProgress?.({
        current: processedFiles,
        total: validSources.length,
        detail: filePath,
      });
    }

    stats.tests += this.addTestEdges(projectId);

    if (resolution) {
      stats.callReferences += this.addResolvedCalls(projectId, resolution);
    }

    return stats;
  }

  private addRoute(
    projectId: string,
    rootPath: string,
    source: ts.SourceFile,
    fileNode: CodeSymbol,
    node: ts.CallExpression,
    checker: ts.TypeChecker
  ): boolean {
    if (!ts.isPropertyAccessExpression(node.expression)) {
      return false;
    }

    const method = node.expression.name.text.toLowerCase();

    if (!ROUTE_METHODS.has(method)) {
      return false;
    }

    const first = node.arguments[0];

    if (!first || !(ts.isStringLiteral(first) || ts.isNoSubstitutionTemplateLiteral(first))) {
      return false;
    }

    const path = first.text;

    if (!path.startsWith('/')) {
      return false;
    }

    const sourceLine = lineOf(source, node);

    const routeId = id(projectId, source.fileName, sourceLine, method, path);

    if (!this.graph.getSymbol(routeId)) {
      this.graph.addSymbol({
        id: routeId,
        projectId,
        name: `${method.toUpperCase()} ${path}`,
        qualifiedName: `${method.toUpperCase()} ${path}`,
        type: 'route',
        filePath: fileNode.filePath,
        startLine: sourceLine,
        endLine: sourceLine,
      });

      this.graph.addEdge(
        createGraphEdge({
          projectId,
          from: fileNode.id,
          to: routeId,
          type: 'DEFINES',
          provenance: createEdgeProvenance('parser', 'syntax', 'deterministic', {
            filePath: fileNode.filePath,
          }),
        })
      );
    }

    const handler = node.arguments.at(-1);

    if (handler) {
      const target = this.resolveNodeSymbol(projectId, rootPath, handler, checker);

      if (target) {
        this.graph.addEdge(
          createGraphEdge({
            projectId,
            from: routeId,
            to: target.id,
            type: 'ROUTE',
            provenance: createEdgeProvenance('enricher', 'route_declaration', 'deterministic', {
              filePath: fileNode.filePath,
            }),
            metadata: {
              method: method.toUpperCase(),
              path,
            },
          })
        );
      }
    }

    return true;
  }

  private addTypeUse(
    projectId: string,
    rootPath: string,
    source: ts.SourceFile,
    node: ts.TypeReferenceNode,
    checker: ts.TypeChecker
  ): boolean {
    const target = this.resolveNodeSymbol(projectId, rootPath, node.typeName, checker);

    if (!target) {
      return false;
    }

    const sourceSymbol = this.containingSymbol(
      projectId,
      normalize(relative(rootPath, resolve(source.fileName))),
      lineOf(source, node)
    );

    if (!sourceSymbol || sourceSymbol.id === target.id) {
      return false;
    }

    /*
     * Semantic contract: USES_TYPE is a symbol-level type relationship.
     * File-scoped type references (type aliases, ambient declarations) are not
     * a proven symbol relationship, so the edge is dropped rather than written
     * with a source/target that the registry forbids.
     */
    if (!isEdgeTypeAllowed('USES_TYPE', sourceSymbol.type, target.type)) {
      return false;
    }

    this.graph.addEdge(
      createGraphEdge({
        projectId,
        from: sourceSymbol.id,
        to: target.id,
        type: 'USES_TYPE',
        provenance: createEdgeProvenance('enricher', 'resolved_symbol', 'deterministic', {
          filePath: sourceSymbol.filePath,
          line: lineOf(source, node),
        }),
      })
    );

    return true;
  }

  /**
   * Resolve a property/field/variable target for READS/WRITES.
   *
   * Returns null when no project-local declaration can be proven. A line
   * lookup can land on the enclosing class because fields are not always
   * modelled as symbols, so any non-writable hit falls through to a
   * deterministic synthetic property symbol instead of a forbidden edge.
   */
  private resolveDataTarget(
    projectId: string,
    rootPath: string,
    source: ts.SourceFile,
    targetNode: ts.Node,
    checker: ts.TypeChecker
  ): { target: CodeSymbol; propertyCreated: boolean } | null {
    const symbol = this.resolveTsSymbol(targetNode, checker);

    const declaration = symbol?.valueDeclaration ?? symbol?.declarations?.[0];

    if (!declaration) {
      return null;
    }

    const declarationSource = declaration.getSourceFile();

    if (declarationSource.isDeclarationFile) {
      return null;
    }

    const targetFile = normalize(relative(rootPath, resolve(declarationSource.fileName)));

    if (targetFile.startsWith('../') || targetFile.includes('node_modules/')) {
      return null;
    }

    const targetLine = lineOf(declarationSource, declaration);

    let target = this.findSymbolAt(projectId, targetFile, targetLine);

    let propertyCreated = false;

    if (!target || !WRITABLE_TARGET_TYPES.includes(target.type)) {
      const name = symbol?.getName() ?? targetNode.getText(source);

      const propertyId = id(projectId, targetFile, 'property', name, targetLine);

      target = this.graph.getSymbol(propertyId);

      if (!target) {
        target = {
          id: propertyId,
          projectId,
          name,
          qualifiedName: name,
          type: 'property',
          filePath: targetFile,
          startLine: targetLine,
          endLine: targetLine,
        };

        this.graph.addSymbol(target);

        const targetFileNode = this.fileNode(projectId, targetFile);

        if (targetFileNode) {
          this.graph.addEdge(
            createGraphEdge({
              projectId,
              from: targetFileNode.id,
              to: target.id,
              type: 'DEFINES',
              provenance: createEdgeProvenance('enricher', 'declaration', 'deterministic', {
                filePath: targetFile,
              }),
            })
          );
        }

        propertyCreated = true;
      }
    }

    if (!target) {
      return null;
    }

    return { target, propertyCreated };
  }

  private addWrite(
    projectId: string,
    rootPath: string,
    source: ts.SourceFile,
    targetNode: ts.Node,
    checker: ts.TypeChecker
  ): {
    added: boolean;
    propertyCreated: boolean;
  } {
    const resolved = this.resolveDataTarget(projectId, rootPath, source, targetNode, checker);

    if (!resolved) {
      return { added: false, propertyCreated: false };
    }

    const { target, propertyCreated } = resolved;

    const sourceFile = normalize(relative(rootPath, resolve(source.fileName)));

    const writer = this.containingSymbol(projectId, sourceFile, lineOf(source, targetNode));

    if (!writer || writer.id === target.id) {
      return { added: false, propertyCreated };
    }

    /*
     * WRITES targets a property/field/variable. If resolution produced a
     * type symbol instead, the assignment relationship is not proven, so the
     * edge is dropped rather than emitted against a forbidden target type.
     */
    if (!isEdgeTypeAllowed('WRITES', writer.type, target.type)) {
      return { added: false, propertyCreated };
    }

    this.graph.addEdge(
      createGraphEdge({
        projectId,
        from: writer.id,
        to: target.id,
        type: 'WRITES',
        provenance: createEdgeProvenance('enricher', 'assignment', 'deterministic', {
          filePath: sourceFile,
          line: lineOf(source, targetNode),
        }),
        metadata: {
          expression: targetNode.getText(source),
        },
      })
    );

    return { added: true, propertyCreated };
  }

  private addRead(
    projectId: string,
    rootPath: string,
    source: ts.SourceFile,
    targetNode: ts.Node,
    checker: ts.TypeChecker
  ): {
    added: boolean;
    propertyCreated: boolean;
  } {
    const resolved = this.resolveDataTarget(projectId, rootPath, source, targetNode, checker);

    if (!resolved) {
      return { added: false, propertyCreated: false };
    }

    const { target, propertyCreated } = resolved;

    const sourceFile = normalize(relative(rootPath, resolve(source.fileName)));

    const reader = this.containingSymbol(projectId, sourceFile, lineOf(source, targetNode));

    if (!reader || reader.id === target.id) {
      return { added: false, propertyCreated };
    }

    if (!isEdgeTypeAllowed('READS', reader.type, target.type)) {
      return { added: false, propertyCreated };
    }

    this.graph.addEdge(
      createGraphEdge({
        projectId,
        from: reader.id,
        to: target.id,
        type: 'READS',
        provenance: createEdgeProvenance('enricher', 'resolved_symbol', 'deterministic', {
          filePath: sourceFile,
          line: lineOf(source, targetNode),
        }),
      })
    );

    return { added: true, propertyCreated };
  }

  private addTestEdges(projectId: string): number {
    const edges = this.graph.allEdges(projectId);

    let added = 0;

    for (const edge of edges) {
      if (edge.type !== 'IMPORTS') {
        continue;
      }

      const from = this.graph.getSymbol(edge.from);

      const to = this.graph.getSymbol(edge.to);

      if (!from || !to || !this.isTestFile(from.filePath) || this.isTestFile(to.filePath)) {
        continue;
      }

      this.graph.addEdge(
        createGraphEdge({
          projectId,
          from: from.id,
          to: to.id,
          type: 'TESTS',
          provenance: createEdgeProvenance('enricher', 'explicit_import', 'reference', {
            filePath: from.filePath,
          }),
        })
      );

      added++;
    }

    return added;
  }

  private addResolvedCalls(
    projectId: string,
    resolution: ResolutionSnapshot | TypeResolutionSnapshot
  ): number {
    let added = 0;

    const items: Array<{
      sourceFile?: string;
      sourceLine?: number;
      targetSymbolId?: string;
      expression?: string;
    }> = [];

    if ('results' in resolution && Array.isArray(resolution.results)) {
      for (const item of resolution.results as ResolutionResult[]) {
        if (item.status !== 'resolved' || !item.targetSymbolId) {
          continue;
        }
        items.push({
          sourceFile: item.sourceFile,
          sourceLine: item.sourceLine,
          targetSymbolId: item.targetSymbolId,
          expression: item.expression,
        });
      }
    }

    if (
      'resolutions' in resolution &&
      Array.isArray((resolution as TypeResolutionSnapshot).resolutions)
    ) {
      for (const item of (resolution as TypeResolutionSnapshot).resolutions) {
        /* The archived vocabulary (CALL/...) is resolved through the shared
         * normalizer so a legacy snapshot can never be skipped silently. */
        if (canonicalResolutionKind(item.kind) !== 'call' || !item.targetSymbolId) {
          continue;
        }
        items.push({
          sourceFile: item.sourceFile,
          sourceLine: item.sourceLine,
          targetSymbolId: item.targetSymbolId,
          expression: item.expression,
        });
      }
    }

    for (const item of items) {
      if (!item.targetSymbolId) {
        continue;
      }

      const target = this.graph.getSymbol(item.targetSymbolId);

      if (!target) {
        continue;
      }

      let sourceSymbol: CodeSymbol | undefined;
      if (item.sourceFile && item.sourceLine) {
        sourceSymbol = this.containingSymbol(projectId, item.sourceFile, item.sourceLine);
      }

      if (!sourceSymbol || sourceSymbol.id === target.id) {
        continue;
      }

      /*
       * Deterministic resolved target -> CALLS.
       *
       * A target that is only a declaration/interface does not prove a runtime
       * implementation, so it stays CALL_REFERENCE. Nothing is created for
       * ambiguous or unresolved references.
       */
      const callableSource =
        sourceSymbol.type === 'function' ||
        sourceSymbol.type === 'method' ||
        sourceSymbol.type === 'class' ||
        sourceSymbol.type === 'route';

      /*
       * A file/module is not a caller. Top-level call sites that resolve to a
       * file symbol are not a proven call relationship and are dropped.
       */
      if (!callableSource) {
        continue;
      }

      const concreteTarget =
        target.type === 'function' || target.type === 'method' || target.type === 'class';
      const edgeType: GraphEdgeType =
        target.type === 'interface' || !concreteTarget ? 'CALL_REFERENCE' : 'CALLS';

      if (!isEdgeTypeAllowed(edgeType, sourceSymbol.type, target.type)) {
        continue;
      }

      const exactAlreadyExists = this.graph
        .allEdges(projectId)
        .some(
          (edge) => edge.type === edgeType && edge.from === sourceSymbol.id && edge.to === target.id
        );

      if (exactAlreadyExists) {
        continue;
      }

      this.graph.addEdge(
        createGraphEdge({
          projectId,
          from: sourceSymbol.id,
          to: target.id,
          type: edgeType,
          provenance: createEdgeProvenance('resolver', 'resolved_symbol', 'deterministic', {
            filePath: item.sourceFile,
            line: item.sourceLine,
          }),
          metadata: {
            expression: item.expression,
            resolver: 'deterministic',
          },
        })
      );

      added++;
    }

    return added;
  }

  private resolveNodeSymbol(
    projectId: string,
    rootPath: string,
    node: ts.Node,
    checker: ts.TypeChecker
  ): CodeSymbol | undefined {
    const symbol = this.resolveTsSymbol(node, checker);

    const declaration = symbol?.valueDeclaration ?? symbol?.declarations?.[0];

    if (!declaration) {
      return undefined;
    }

    const targetSource = declaration.getSourceFile();

    if (targetSource.isDeclarationFile) {
      return undefined;
    }

    const filePath = normalize(relative(rootPath, resolve(targetSource.fileName)));

    if (filePath.startsWith('../') || filePath.includes('node_modules/')) {
      return undefined;
    }

    return this.findSymbolAt(
      projectId,
      filePath,
      lineOf(targetSource, declaration),
      symbol?.getName()
    );
  }

  private resolveTsSymbol(node: ts.Node, checker: ts.TypeChecker): ts.Symbol | undefined {
    let symbol = checker.getSymbolAtLocation(node);

    if (symbol && symbol.flags & ts.SymbolFlags.Alias) {
      try {
        symbol = checker.getAliasedSymbol(symbol);
      } catch {
        // keep original
      }
    }

    return symbol;
  }

  private containingSymbol(
    projectId: string,
    filePath: string,
    line: number
  ): CodeSymbol | undefined {
    return this.graph
      .allSymbols(projectId)
      .filter(
        (symbol) =>
          normalize(symbol.filePath) === normalize(filePath) &&
          typeof symbol.startLine === 'number' &&
          typeof symbol.endLine === 'number' &&
          symbol.startLine <= line &&
          symbol.endLine >= line
      )
      .sort(
        (a, b) => (a.endLine ?? 0) - (a.startLine ?? 0) - ((b.endLine ?? 0) - (b.startLine ?? 0))
      )[0];
  }

  private findSymbolAt(
    projectId: string,
    filePath: string,
    line: number,
    name?: string
  ): CodeSymbol | undefined {
    const candidates = this.graph
      .allSymbols(projectId)
      .filter(
        (symbol) =>
          normalize(symbol.filePath) === normalize(filePath) &&
          typeof symbol.startLine === 'number' &&
          typeof symbol.endLine === 'number' &&
          symbol.startLine <= line &&
          symbol.endLine >= line
      )
      .sort(
        (a, b) => (a.endLine ?? 0) - (a.startLine ?? 0) - ((b.endLine ?? 0) - (b.startLine ?? 0))
      );

    if (name) {
      const named = candidates.find(
        (symbol) => symbol.name === name || (symbol.qualifiedName?.endsWith(`.${name}`) ?? false)
      );

      if (named) {
        return named;
      }
    }

    return candidates[0];
  }

  private fileNode(projectId: string, filePath: string): CodeSymbol | undefined {
    return this.graph
      .allSymbols(projectId)
      .find(
        (symbol) => symbol.type === 'file' && normalize(symbol.filePath) === normalize(filePath)
      );
  }

  private isTestFile(filePath: string): boolean {
    const path = normalize(filePath).toLowerCase();

    return (
      path.startsWith('tests/') ||
      path.includes('/tests/') ||
      path.includes('__tests__') ||
      /\.(test|spec)\.[^.]+$/.test(path)
    );
  }

  private edge(
    projectId: string,
    from: string,
    type: GraphEdge['type'],
    to: string,
    metadata?: Record<string, unknown>
  ): GraphEdge {
    const provenance = createEdgeProvenance('enricher', 'syntax', 'deterministic');
    return createGraphEdge({
      projectId,
      from,
      to,
      type: type as GraphEdgeType,
      provenance,
      metadata,
    });
  }

  private loadConfig(rootPath: string) {
    const configPath = ts.findConfigFile(rootPath, ts.sys.fileExists, 'tsconfig.json');

    if (configPath) {
      const raw = ts.readConfigFile(configPath, ts.sys.readFile);

      return ts.parseJsonConfigFileContent(raw.config, ts.sys, dirname(configPath));
    }

    return {
      fileNames: ts.sys.readDirectory(
        rootPath,
        ['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts', '.mjs', '.cjs'],
        ['node_modules', '.git', 'dist', 'build', 'coverage']
      ),

      options: {
        allowJs: true,
        noEmit: true,
        skipLibCheck: true,
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.NodeNext,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
      } satisfies ts.CompilerOptions,
    };
  }
}
