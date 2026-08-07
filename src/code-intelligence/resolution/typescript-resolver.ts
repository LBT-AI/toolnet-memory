import {
  createHash,
} from "node:crypto";

import {
  existsSync,
} from "node:fs";

import {
  dirname,
  relative,
  resolve,
} from "node:path";

import * as ts from "typescript";

import type {
  CodeGraphStore,
} from "../graph/graph-store.js";

import type {
  CodeSymbol,
} from "../../core/types.js";

import type {
  TypeResolution,
  TypeResolutionSnapshot,
} from "./types.js";

function normalize(
  value: string,
): string {
  return value
    .replaceAll("\\", "/")
    .replace(/^\.\//, "");
}

function hash(
  value: string,
): string {
  return createHash("sha256")
    .update(value)
    .digest("hex")
    .slice(0, 24);
}

function lineOf(
  source:
    ts.SourceFile,

  node:
    ts.Node,
): number {
  return source
    .getLineAndCharacterOfPosition(
      node.getStart(source),
    ).line + 1;
}

function declarationName(
  declaration:
    ts.Declaration,
): string | undefined {
  const named =
    declaration as
      ts.NamedDeclaration;

  if (
    named.name &&
    ts.isIdentifier(
      named.name,
    )
  ) {
    return named.name.text;
  }

  return undefined;
}

export class TypeScriptTypeResolver {
  constructor(
    private readonly graph:
      CodeGraphStore,
  ) {}

  async resolveProject(
    projectId:
      string,

    rootPath:
      string,
  ): Promise<
    TypeResolutionSnapshot
  > {
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

    const output:
      TypeResolution[] = [];

    for (
      const source
      of program.getSourceFiles()
    ) {
      if (
        source.isDeclarationFile
      ) {
        continue;
      }

      const absolute =
        resolve(
          source.fileName,
        );

      const relativePath =
        normalize(
          relative(
            rootPath,
            absolute,
          ),
        );

      /*
       * Không index node_modules hoặc file ngoài project.
       */
      if (
        relativePath.startsWith(
          "../",
        ) ||
        relativePath.includes(
          "node_modules/",
        )
      ) {
        continue;
      }

      const visit =
        (
          node: ts.Node,
        ) => {
          if (
            ts.isCallExpression(
              node,
            )
          ) {
            const result =
              this.resolveCall({
                projectId,
                rootPath,
                source,
                node,
                checker,
              });

            if (result) {
              output.push(
                result,
              );
            }
          }

          if (
            ts.isClassDeclaration(
              node,
            )
          ) {
            output.push(
              ...this.resolveHeritage({
                projectId,
                rootPath,
                source,
                node,
                checker,
              }),
            );
          }

          ts.forEachChild(
            node,
            visit,
          );
        };

      visit(source);
    }

    return {
      version: 1,

      projectId,

      updatedAt:
        new Date()
          .toISOString(),

      total:
        output.length,

      exact:
        output.filter(
          (item) =>
            item.confidence ===
            "exact",
        ).length,

      high:
        output.filter(
          (item) =>
            item.confidence ===
            "high",
        ).length,

      fallback:
        output.filter(
          (item) =>
            item.confidence ===
            "fallback",
        ).length,

      resolutions:
        output,
    };
  }

  private resolveCall(
    input: {
      projectId: string;
      rootPath: string;

      source:
        ts.SourceFile;

      node:
        ts.CallExpression;

      checker:
        ts.TypeChecker;
    },
  ):
    TypeResolution |
    null {
    const {
      projectId,
      rootPath,
      source,
      node,
      checker,
    } = input;

    let declaration:
      ts.Declaration |
      undefined;

    /*
     * Đây là phần quan trọng:
     * TypeChecker resolve signature thực tế của obj.method().
     */
    const signature =
      checker.getResolvedSignature(
        node,
      );

    declaration =
      signature?.declaration;

    if (
      !declaration
    ) {
      const symbol =
        checker.getSymbolAtLocation(
          node.expression,
        );

      declaration =
        symbol
          ?.valueDeclaration ??
        symbol
          ?.declarations?.[0];
    }

    if (
      !declaration
    ) {
      return this.fallbackCall(
        projectId,
        rootPath,
        source,
        node,
      );
    }

    return this.fromDeclaration({
      projectId,
      rootPath,
      source,

      sourceNode:
        node,

      declaration,

      expression:
        node.expression
          .getText(source),

      kind:
        "CALL",
    });
  }

  private resolveHeritage(
    input: {
      projectId: string;
      rootPath: string;

      source:
        ts.SourceFile;

      node:
        ts.ClassDeclaration;

      checker:
        ts.TypeChecker;
    },
  ): TypeResolution[] {
    const {
      projectId,
      rootPath,
      source,
      node,
      checker,
    } = input;

    const output:
      TypeResolution[] =
      [];

    for (
      const clause
      of node.heritageClauses ??
      []
    ) {
      for (
        const item
        of clause.types
      ) {
        const symbol =
          checker.getSymbolAtLocation(
            item.expression,
          );

        const declaration =
          symbol
            ?.valueDeclaration ??
          symbol
            ?.declarations?.[0];

        if (
          !declaration
        ) {
          continue;
        }

        const result =
          this.fromDeclaration({
            projectId,
            rootPath,
            source,

            sourceNode:
              item,

            declaration,

            expression:
              item.getText(
                source,
              ),

            kind:
              clause.token ===
              ts.SyntaxKind
                .ExtendsKeyword
                ? "EXTENDS"
                : "IMPLEMENTS",
          });

        if (result) {
          output.push(
            result,
          );
        }
      }
    }

    return output;
  }

  private fromDeclaration(
    input: {
      projectId: string;
      rootPath: string;

      source:
        ts.SourceFile;

      sourceNode:
        ts.Node;

      declaration:
        ts.Declaration;

      expression:
        string;

      kind:
        TypeResolution["kind"];
    },
  ):
    TypeResolution |
    null {
    const declarationSource =
      input.declaration
        .getSourceFile();

    if (
      declarationSource
        .isDeclarationFile
    ) {
      return null;
    }

    const targetFile =
      normalize(
        relative(
          input.rootPath,
          resolve(
            declarationSource
              .fileName,
          ),
        ),
      );

    if (
      targetFile.startsWith(
        "../",
      ) ||
      targetFile.includes(
        "node_modules/",
      )
    ) {
      return null;
    }

    const targetLine =
      lineOf(
        declarationSource,
        input.declaration,
      );

    const targetName =
      declarationName(
        input.declaration,
      ) ??
      input.expression
        .split(".")
        .at(-1);

    const graphSymbol =
      this.findGraphSymbol(
        input.projectId,
        targetFile,
        targetLine,
        targetName,
      );

    const sourceFile =
      normalize(
        relative(
          input.rootPath,
          resolve(
            input.source
              .fileName,
          ),
        ),
      );

    return {
      id:
        hash(
          [
            input.projectId,
            sourceFile,
            lineOf(
              input.source,
              input.sourceNode,
            ),
            input.kind,
            targetFile,
            targetLine,
          ].join(":"),
        ),

      projectId:
        input.projectId,

      kind:
        input.kind,

      sourceFile,

      sourceLine:
        lineOf(
          input.source,
          input.sourceNode,
        ),

      expression:
        input.expression,

      targetFile,
      targetLine,

      targetName,

      targetQualifiedName:
        graphSymbol
          ?.qualifiedName,

      targetSymbolId:
        graphSymbol?.id,

      confidence:
        graphSymbol
          ? "exact"
          : "high",

      resolver:
        "typescript-checker",
    };
  }

  private fallbackCall(
    projectId:
      string,

    rootPath:
      string,

    source:
      ts.SourceFile,

    node:
      ts.CallExpression,
  ):
    TypeResolution |
    null {
    const name =
      node.expression
        .getText(source)
        .split(".")
        .at(-1);

    if (!name) {
      return null;
    }

    const candidates =
      this.graph
        .findByName(
          projectId,
          name,
        )
        .filter(
          (symbol) =>
            symbol.type ===
              "function" ||
            symbol.type ===
              "method",
        );

    if (
      candidates.length !== 1
    ) {
      return null;
    }

    const target =
      candidates[0];

    const sourceFile =
      normalize(
        relative(
          rootPath,
          resolve(
            source.fileName,
          ),
        ),
      );

    return {
      id:
        hash(
          `${projectId}:${sourceFile}:${lineOf(source, node)}:${target.id}`,
        ),

      projectId,

      kind:
        "CALL",

      sourceFile,

      sourceLine:
        lineOf(
          source,
          node,
        ),

      expression:
        node.expression
          .getText(source),

      targetFile:
        target.filePath,

      targetLine:
        target.startLine,

      targetName:
        target.name,

      targetQualifiedName:
        target.qualifiedName,

      targetSymbolId:
        target.id,

      confidence:
        "fallback",

      resolver:
        "graph-fallback",
    };
  }

  private findGraphSymbol(
    projectId:
      string,

    filePath:
      string,

    line:
      number,

    name?:
      string,
  ): CodeSymbol | undefined {
    const symbols =
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
            ),
        );

    /*
     * Ưu tiên symbol chứa declaration line.
     */
    const containing =
      symbols.filter(
        (symbol) =>
          typeof symbol.startLine ===
            "number" &&
          typeof symbol.endLine ===
            "number" &&
          symbol.startLine <=
            line &&
          symbol.endLine >=
            line,
      );

    if (name) {
      const named =
        containing.find(
          (symbol) =>
            symbol.name ===
              name ||
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

    return containing
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

  private loadConfig(
    rootPath:
      string,
  ) {
    const configPath =
      ts.findConfigFile(
        rootPath,
        ts.sys.fileExists,
        "tsconfig.json",
      );

    if (configPath) {
      const config =
        ts.readConfigFile(
          configPath,
          ts.sys.readFile,
        );

      if (
        config.error
      ) {
        throw new Error(
          ts.flattenDiagnosticMessageText(
            config.error.messageText,
            "\n",
          ),
        );
      }

      return ts.parseJsonConfigFileContent(
        config.config,
        ts.sys,
        dirname(
          configPath,
        ),
      );
    }

    /*
     * Repo không có tsconfig vẫn chạy JS/TS.
     */
    const fileNames =
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
      );

    return {
      fileNames,

      options: {
        allowJs: true,
        checkJs: false,

        target:
          ts.ScriptTarget.ES2022,

        module:
          ts.ModuleKind.NodeNext,

        moduleResolution:
          ts.ModuleResolutionKind
            .NodeNext,

        skipLibCheck:
          true,

        noEmit:
          true,
      } satisfies
        ts.CompilerOptions,
    };
  }
}
