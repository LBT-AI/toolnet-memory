import {
  createHash,
} from "node:crypto";

import {
  dirname,
  relative,
  resolve,
} from "node:path";

import * as ts from "typescript";

import type {
  CodeSymbol,
  GraphEdge,
} from "../../core/types.js";

import type {
  CodeGraphStore,
} from "../graph/graph-store.js";

import type {
  TypeResolutionSnapshot,
} from "../resolution/types.js";

function normalize(
  value: string,
): string {
  return value
    .replaceAll("\\", "/")
    .replace(/^\.\//, "");
}

function id(
  ...parts: unknown[]
): string {
  return createHash("sha256")
    .update(
      parts.join(":"),
    )
    .digest("hex")
    .slice(0, 24);
}

function lineOf(
  source: ts.SourceFile,
  node: ts.Node,
): number {
  return source
    .getLineAndCharacterOfPosition(
      node.getStart(source),
    ).line + 1;
}

const ROUTE_METHODS =
  new Set([
    "get",
    "post",
    "put",
    "patch",
    "delete",
    "options",
    "head",
  ]);

const ASSIGNMENTS =
  new Set([
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
  writes: number;
  callReferences: number;
  properties: number;
}

export class RichGraphEnricher {
  constructor(
    private readonly graph:
      CodeGraphStore,
  ) {}

  enrich(
    projectId: string,
    rootPath: string,
    resolution?:
      TypeResolutionSnapshot | null,
  ): RichGraphStats {
    const stats:
      RichGraphStats = {
      routes: 0,
      tests: 0,
      usesType: 0,
      writes: 0,
      callReferences: 0,
      properties: 0,
    };

    const config =
      this.loadConfig(
        rootPath,
      );

    const program =
      ts.createProgram({
        rootNames:
          config.fileNames,

        options:
          config.options,
      });

    const checker =
      program.getTypeChecker();

    for (
      const source
      of program.getSourceFiles()
    ) {
      if (
        source.isDeclarationFile
      ) {
        continue;
      }

      const filePath =
        normalize(
          relative(
            rootPath,
            resolve(
              source.fileName,
            ),
          ),
        );

      if (
        filePath.startsWith("../") ||
        filePath.includes(
          "node_modules/",
        )
      ) {
        continue;
      }

      const fileNode =
        this.fileNode(
          projectId,
          filePath,
        );

      if (!fileNode) {
        continue;
      }

      const visit =
        (node: ts.Node) => {
          if (
            ts.isCallExpression(
              node,
            )
          ) {
            if (
              this.addRoute(
                projectId,
                rootPath,
                source,
                fileNode,
                node,
                checker,
              )
            ) {
              stats.routes++;
            }
          }

          if (
            ts.isTypeReferenceNode(
              node,
            )
          ) {
            if (
              this.addTypeUse(
                projectId,
                rootPath,
                source,
                node,
                checker,
              )
            ) {
              stats.usesType++;
            }
          }

          if (
            ts.isBinaryExpression(
              node,
            ) &&
            ASSIGNMENTS.has(
              node.operatorToken.kind,
            )
          ) {
            const result =
              this.addWrite(
                projectId,
                rootPath,
                source,
                node.left,
                checker,
              );

            if (
              result.added
            ) {
              stats.writes++;

              if (
                result.propertyCreated
              ) {
                stats.properties++;
              }
            }
          }

          if (
            (
              ts.isPrefixUnaryExpression(
                node,
              ) ||
              ts.isPostfixUnaryExpression(
                node,
              )
            ) &&
            (
              node.operator ===
                ts.SyntaxKind.PlusPlusToken ||
              node.operator ===
                ts.SyntaxKind.MinusMinusToken
            )
          ) {
            const result =
              this.addWrite(
                projectId,
                rootPath,
                source,
                node.operand,
                checker,
              );

            if (
              result.added
            ) {
              stats.writes++;

              if (
                result.propertyCreated
              ) {
                stats.properties++;
              }
            }
          }

          ts.forEachChild(
            node,
            visit,
          );
        };

      visit(source);
    }

    stats.tests +=
      this.addTestEdges(
        projectId,
      );

    if (resolution) {
      stats.callReferences +=
        this.addResolvedCalls(
          projectId,
          resolution,
        );
    }

    return stats;
  }

  private addRoute(
    projectId: string,
    rootPath: string,
    source: ts.SourceFile,
    fileNode: CodeSymbol,
    node: ts.CallExpression,
    checker: ts.TypeChecker,
  ): boolean {
    if (
      !ts.isPropertyAccessExpression(
        node.expression,
      )
    ) {
      return false;
    }

    const method =
      node.expression
        .name.text
        .toLowerCase();

    if (
      !ROUTE_METHODS.has(
        method,
      )
    ) {
      return false;
    }

    const first =
      node.arguments[0];

    if (
      !first ||
      !(
        ts.isStringLiteral(first) ||
        ts.isNoSubstitutionTemplateLiteral(
          first,
        )
      )
    ) {
      return false;
    }

    const path =
      first.text;

    if (
      !path.startsWith("/")
    ) {
      return false;
    }

    const sourceLine =
      lineOf(
        source,
        node,
      );

    const routeId =
      id(
        projectId,
        source.fileName,
        sourceLine,
        method,
        path,
      );

    if (
      !this.graph.getSymbol(
        routeId,
      )
    ) {
      this.graph.addSymbol({
        id:
          routeId,

        projectId,

        name:
          `${method.toUpperCase()} ${path}`,

        qualifiedName:
          `${method.toUpperCase()} ${path}`,

        type:
          "route",

        filePath:
          fileNode.filePath,

        startLine:
          sourceLine,

        endLine:
          sourceLine,
      });

      this.graph.addEdge(
        this.edge(
          projectId,
          fileNode.id,
          "DEFINES",
          routeId,
        ),
      );
    }

    const handler =
      node.arguments.at(-1);

    if (handler) {
      const target =
        this.resolveNodeSymbol(
          projectId,
          rootPath,
          handler,
          checker,
        );

      if (target) {
        this.graph.addEdge(
          this.edge(
            projectId,
            routeId,
            "ROUTE",
            target.id,
            {
              method:
                method.toUpperCase(),

              path,
            },
          ),
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
    checker: ts.TypeChecker,
  ): boolean {
    const target =
      this.resolveNodeSymbol(
        projectId,
        rootPath,
        node.typeName,
        checker,
      );

    if (!target) {
      return false;
    }

    const sourceSymbol =
      this.containingSymbol(
        projectId,
        normalize(
          relative(
            rootPath,
            resolve(
              source.fileName,
            ),
          ),
        ),
        lineOf(
          source,
          node,
        ),
      );

    if (
      !sourceSymbol ||
      sourceSymbol.id ===
        target.id
    ) {
      return false;
    }

    this.graph.addEdge(
      this.edge(
        projectId,
        sourceSymbol.id,
        "USES_TYPE",
        target.id,
      ),
    );

    return true;
  }

  private addWrite(
    projectId: string,
    rootPath: string,
    source: ts.SourceFile,
    targetNode: ts.Node,
    checker: ts.TypeChecker,
  ): {
    added: boolean;
    propertyCreated: boolean;
  } {
    const symbol =
      this.resolveTsSymbol(
        targetNode,
        checker,
      );

    const declaration =
      symbol
        ?.valueDeclaration ??
      symbol
        ?.declarations?.[0];

    if (!declaration) {
      return {
        added: false,
        propertyCreated: false,
      };
    }

    const declarationSource =
      declaration
        .getSourceFile();

    if (
      declarationSource
        .isDeclarationFile
    ) {
      return {
        added: false,
        propertyCreated: false,
      };
    }

    const targetFile =
      normalize(
        relative(
          rootPath,
          resolve(
            declarationSource
              .fileName,
          ),
        ),
      );

    if (
      targetFile.startsWith("../") ||
      targetFile.includes(
        "node_modules/",
      )
    ) {
      return {
        added: false,
        propertyCreated: false,
      };
    }

    const targetLine =
      lineOf(
        declarationSource,
        declaration,
      );

    let target =
      this.findSymbolAt(
        projectId,
        targetFile,
        targetLine,
      );

    let propertyCreated =
      false;

    if (
      !target ||
      target.type === "file"
    ) {
      const name =
        symbol?.getName() ??
        targetNode.getText(
          source,
        );

      const propertyId =
        id(
          projectId,
          targetFile,
          "property",
          name,
          targetLine,
        );

      target =
        this.graph.getSymbol(
          propertyId,
        );

      if (!target) {
        target = {
          id:
            propertyId,

          projectId,

          name,

          qualifiedName:
            name,

          type:
            "property",

          filePath:
            targetFile,

          startLine:
            targetLine,

          endLine:
            targetLine,
        };

        this.graph.addSymbol(
          target,
        );

        const targetFileNode =
          this.fileNode(
            projectId,
            targetFile,
          );

        if (targetFileNode) {
          this.graph.addEdge(
            this.edge(
              projectId,
              targetFileNode.id,
              "DEFINES",
              target.id,
            ),
          );
        }

        propertyCreated =
          true;
      }
    }

    if (!target) {
      return {
        added: false,
        propertyCreated,
      };
    }

    const sourceFile =
      normalize(
        relative(
          rootPath,
          resolve(
            source.fileName,
          ),
        ),
      );

    const writer =
      this.containingSymbol(
        projectId,
        sourceFile,
        lineOf(
          source,
          targetNode,
        ),
      );

    if (
      !writer ||
      writer.id === target.id
    ) {
      return {
        added: false,
        propertyCreated,
      };
    }

    this.graph.addEdge(
      this.edge(
        projectId,
        writer.id,
        "WRITES",
        target.id,
        {
          expression:
            targetNode.getText(
              source,
            ),
        },
      ),
    );

    return {
      added: true,
      propertyCreated,
    };
  }

  private addTestEdges(
    projectId: string,
  ): number {
    const edges =
      this.graph.allEdges(
        projectId,
      );

    let added =
      0;

    for (
      const edge
      of edges
    ) {
      if (
        edge.type !==
        "IMPORTS"
      ) {
        continue;
      }

      const from =
        this.graph.getSymbol(
          edge.from,
        );

      const to =
        this.graph.getSymbol(
          edge.to,
        );

      if (
        !from ||
        !to ||
        !this.isTestFile(
          from.filePath,
        ) ||
        this.isTestFile(
          to.filePath,
        )
      ) {
        continue;
      }

      this.graph.addEdge(
        this.edge(
          projectId,
          from.id,
          "TESTS",
          to.id,
        ),
      );

      added++;
    }

    return added;
  }

  private addResolvedCalls(
    projectId: string,
    resolution:
      TypeResolutionSnapshot,
  ): number {
    let added =
      0;

    for (
      const item
      of resolution.resolutions
    ) {
      if (
        item.kind !== "CALL" ||
        !item.targetSymbolId
      ) {
        continue;
      }

      const target =
        this.graph.getSymbol(
          item.targetSymbolId,
        );

      if (!target) {
        continue;
      }

      const source =
        this.containingSymbol(
          projectId,
          item.sourceFile,
          item.sourceLine,
        );

      if (
        !source ||
        source.id === target.id
      ) {
        continue;
      }

      /*
       * Nếu CALLS hiện tại đã đúng target
       * thì không tạo edge trùng.
       */
      const exactAlreadyExists =
        this.graph
          .allEdges(
            projectId,
          )
          .some(
            (edge) =>
              edge.type ===
                "CALLS" &&
              edge.from ===
                source.id &&
              edge.to ===
                target.id,
          );

      if (
        exactAlreadyExists
      ) {
        continue;
      }

      this.graph.addEdge(
        this.edge(
          projectId,
          source.id,
          "CALL_REFERENCE",
          target.id,
          {
            expression:
              item.expression,

            confidence:
              item.confidence,

            resolver:
              item.resolver,
          },
        ),
      );

      added++;
    }

    return added;
  }

  private resolveNodeSymbol(
    projectId: string,
    rootPath: string,
    node: ts.Node,
    checker: ts.TypeChecker,
  ): CodeSymbol | undefined {
    const symbol =
      this.resolveTsSymbol(
        node,
        checker,
      );

    const declaration =
      symbol
        ?.valueDeclaration ??
      symbol
        ?.declarations?.[0];

    if (!declaration) {
      return undefined;
    }

    const targetSource =
      declaration
        .getSourceFile();

    if (
      targetSource
        .isDeclarationFile
    ) {
      return undefined;
    }

    const filePath =
      normalize(
        relative(
          rootPath,
          resolve(
            targetSource
              .fileName,
          ),
        ),
      );

    if (
      filePath.startsWith("../") ||
      filePath.includes(
        "node_modules/",
      )
    ) {
      return undefined;
    }

    return this.findSymbolAt(
      projectId,
      filePath,
      lineOf(
        targetSource,
        declaration,
      ),
      symbol?.getName(),
    );
  }

  private resolveTsSymbol(
    node: ts.Node,
    checker: ts.TypeChecker,
  ): ts.Symbol | undefined {
    let symbol =
      checker.getSymbolAtLocation(
        node,
      );

    if (
      symbol &&
      (
        symbol.flags &
        ts.SymbolFlags.Alias
      )
    ) {
      try {
        symbol =
          checker.getAliasedSymbol(
            symbol,
          );
      } catch {
        // keep original
      }
    }

    return symbol;
  }

  private containingSymbol(
    projectId: string,
    filePath: string,
    line: number,
  ): CodeSymbol | undefined {
    return this.graph
      .allSymbols(
        projectId,
      )
      .filter(
        (symbol) =>
          normalize(
            symbol.filePath,
          ) ===
            normalize(
              filePath,
            ) &&
          typeof symbol.startLine ===
            "number" &&
          typeof symbol.endLine ===
            "number" &&
          symbol.startLine <= line &&
          symbol.endLine >= line,
      )
      .sort(
        (a, b) =>
          (
            (a.endLine ?? 0) -
            (a.startLine ?? 0)
          ) -
          (
            (b.endLine ?? 0) -
            (b.startLine ?? 0)
          ),
      )[0];
  }

  private findSymbolAt(
    projectId: string,
    filePath: string,
    line: number,
    name?: string,
  ): CodeSymbol | undefined {
    const candidates =
      this.graph
        .allSymbols(
          projectId,
        )
        .filter(
          (symbol) =>
            normalize(
              symbol.filePath,
            ) ===
              normalize(
                filePath,
              ) &&
            typeof symbol.startLine ===
              "number" &&
            typeof symbol.endLine ===
              "number" &&
            symbol.startLine <= line &&
            symbol.endLine >= line,
        )
        .sort(
          (a, b) =>
            (
              (a.endLine ?? 0) -
              (a.startLine ?? 0)
            ) -
            (
              (b.endLine ?? 0) -
              (b.startLine ?? 0)
            ),
        );

    if (name) {
      const named =
        candidates.find(
          (symbol) =>
            symbol.name === name ||
            (
              symbol.qualifiedName
                ?.endsWith(
                  `.${name}`,
                ) ?? false
            ),
        );

      if (named) {
        return named;
      }
    }

    return candidates[0];
  }

  private fileNode(
    projectId: string,
    filePath: string,
  ): CodeSymbol | undefined {
    return this.graph
      .allSymbols(
        projectId,
      )
      .find(
        (symbol) =>
          symbol.type ===
            "file" &&
          normalize(
            symbol.filePath,
          ) ===
            normalize(
              filePath,
            ),
      );
  }

  private isTestFile(
    filePath: string,
  ): boolean {
    const path =
      normalize(
        filePath,
      ).toLowerCase();

    return (
      path.startsWith(
        "tests/",
      ) ||
      path.includes(
        "/tests/",
      ) ||
      path.includes(
        "__tests__",
      ) ||
      /\.(test|spec)\.[^.]+$/
        .test(path)
    );
  }

  private edge(
    projectId: string,
    from: string,
    type:
      GraphEdge["type"],
    to: string,
    metadata?: Record<
      string,
      unknown
    >,
  ): GraphEdge {
    return {
      id:
        id(
          projectId,
          from,
          type,
          to,
          JSON.stringify(
            metadata ?? {},
          ),
        ),

      projectId,
      from,
      to,
      type,
      metadata,
    };
  }

  private loadConfig(
    rootPath: string,
  ) {
    const configPath =
      ts.findConfigFile(
        rootPath,
        ts.sys.fileExists,
        "tsconfig.json",
      );

    if (configPath) {
      const raw =
        ts.readConfigFile(
          configPath,
          ts.sys.readFile,
        );

      return ts.parseJsonConfigFileContent(
        raw.config,
        ts.sys,
        dirname(
          configPath,
        ),
      );
    }

    return {
      fileNames:
        ts.sys.readDirectory(
          rootPath,
          [
            ".ts",
            ".tsx",
            ".js",
            ".jsx",
            ".mts",
            ".cts",
            ".mjs",
            ".cjs",
          ],
          [
            "node_modules",
            ".git",
            "dist",
            "build",
            "coverage",
          ],
        ),

      options: {
        allowJs: true,
        noEmit: true,
        skipLibCheck: true,

        target:
          ts.ScriptTarget.ES2022,

        module:
          ts.ModuleKind.NodeNext,

        moduleResolution:
          ts.ModuleResolutionKind
            .NodeNext,
      } satisfies
        ts.CompilerOptions,
    };
  }
}
