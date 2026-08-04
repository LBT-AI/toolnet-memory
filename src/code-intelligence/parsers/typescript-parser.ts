import {
  readFile,
} from "node:fs/promises";

import {
  join,
} from "node:path";

import {
  createHash,
} from "node:crypto";

import ts from "typescript";

import type {
  CodeSymbol,
} from "../../core/types.js";

import type {
  ParsedFile,
} from "../types.js";

function makeId(
  projectId: string,
  value: string,
): string {
  return createHash("sha256")
    .update(
      `${projectId}:${value}`,
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

export async function parseTypeScriptFile(
  projectId: string,
  rootPath: string,
  filePath: string,
): Promise<ParsedFile> {
  const absolute =
    join(
      rootPath,
      filePath,
    );

  const text =
    await readFile(
      absolute,
      "utf8",
    );

  const source =
    ts.createSourceFile(
      filePath,
      text,
      ts.ScriptTarget.Latest,
      true,
      filePath.endsWith(".tsx") ||
      filePath.endsWith(".jsx")
        ? ts.ScriptKind.TSX
        : ts.ScriptKind.TS,
    );

  const symbols:
    CodeSymbol[] = [];

  const imports:
    ParsedFile["imports"] = [];

  const calls:
    ParsedFile["calls"] = [];

  const heritage:
    ParsedFile["heritage"] = [];

  const fileSymbol:
    CodeSymbol = {
      id:
        makeId(
          projectId,
          `file:${filePath}`,
        ),

      projectId,

      name:
        filePath,

      qualifiedName:
        filePath,

      type:
        "file",

      filePath,

      startLine: 1,

      endLine:
        source
          .getLineAndCharacterOfPosition(
            source.end,
          ).line + 1,
    };

  symbols.push(fileSymbol);

  const callableStack:
    string[] = [];

  const classStack:
    {
      id: string;
      name: string;
    }[] = [];

  function addSymbol(
    node: ts.Node,
    name: string,
    type: CodeSymbol["type"],
    qualifiedName?: string,
  ): string {
    const symbolId =
      makeId(
        projectId,
        `${filePath}:${type}:${qualifiedName ?? name}:${node.pos}`,
      );

    symbols.push({
      id:
        symbolId,

      projectId,

      name,

      qualifiedName:
        qualifiedName ??
        name,

      type,

      filePath,

      startLine:
        lineOf(
          source,
          node,
        ),

      endLine:
        source
          .getLineAndCharacterOfPosition(
            node.end,
          ).line + 1,
    });

    return symbolId;
  }

  function parseImport(
    node:
      ts.ImportDeclaration,
  ) {
    if (
      !ts.isStringLiteral(
        node.moduleSpecifier,
      )
    ) {
      return;
    }

    const bindings:
      ParsedFile["imports"][number]["bindings"] =
      [];

    const clause =
      node.importClause;

    if (clause?.name) {
      bindings.push({
        localName:
          clause.name.text,

        importedName:
          "default",

        kind:
          "default",
      });
    }

    if (
      clause?.namedBindings &&
      ts.isNamedImports(
        clause.namedBindings,
      )
    ) {
      for (
        const element
        of clause.namedBindings.elements
      ) {
        bindings.push({
          localName:
            element.name.text,

          importedName:
            element.propertyName
              ?.text ??
            element.name.text,

          kind:
            "named",
        });
      }
    }

    if (
      clause?.namedBindings &&
      ts.isNamespaceImport(
        clause.namedBindings,
      )
    ) {
      bindings.push({
        localName:
          clause.namedBindings
            .name.text,

        importedName:
          "*",

        kind:
          "namespace",
      });
    }

    imports.push({
      source:
        node.moduleSpecifier.text,

      bindings,
    });
  }

  function addHeritage(
    node:
      ts.ClassDeclaration,
    classId: string,
  ) {
    for (
      const clause
      of node.heritageClauses ?? []
    ) {
      for (
        const type
        of clause.types
      ) {
        const targetName =
          type.expression
            .getText(source)
            .split(".")
            .at(-1) ?? "";

        if (!targetName) {
          continue;
        }

        heritage.push({
          fromId:
            classId,

          targetName,

          type:
            clause.token ===
              ts.SyntaxKind.ExtendsKeyword
              ? "INHERITS"
              : "IMPLEMENTS",
        });
      }
    }
  }

  function visit(
    node: ts.Node,
  ): void {
    let pushedCallable =
      false;

    let pushedClass =
      false;

    if (
      ts.isImportDeclaration(
        node,
      )
    ) {
      parseImport(node);
    }

    if (
      ts.isInterfaceDeclaration(
        node,
      )
    ) {
      addSymbol(
        node,
        node.name.text,
        "interface",
        node.name.text,
      );
    }

    if (
      ts.isClassDeclaration(
        node,
      ) &&
      node.name
    ) {
      const classId =
        addSymbol(
          node,
          node.name.text,
          "class",
          node.name.text,
        );

      addHeritage(
        node,
        classId,
      );

      classStack.push({
        id:
          classId,

        name:
          node.name.text,
      });

      pushedClass =
        true;
    }

    if (
      ts.isFunctionDeclaration(
        node,
      ) &&
      node.name
    ) {
      const symbolId =
        addSymbol(
          node,
          node.name.text,
          "function",
          node.name.text,
        );

      callableStack.push(
        symbolId,
      );

      pushedCallable =
        true;
    }

    if (
      ts.isMethodDeclaration(
        node,
      ) &&
      node.name
    ) {
      const name =
        node.name.getText(
          source,
        );

      const owner =
        classStack.at(-1)
          ?.name;

      const symbolId =
        addSymbol(
          node,
          name,
          "method",
          owner
            ? `${owner}.${name}`
            : name,
        );

      callableStack.push(
        symbolId,
      );

      pushedCallable =
        true;
    }

    if (
      ts.isCallExpression(
        node,
      )
    ) {
      if (
        ts.isIdentifier(
          node.expression,
        )
      ) {
        calls.push({
          callerId:
            callableStack.at(-1),

          calleeName:
            node.expression.text,

          line:
            lineOf(
              source,
              node,
            ),
        });
      }

      if (
        ts.isPropertyAccessExpression(
          node.expression,
        )
      ) {
        const expression =
          node.expression;

        calls.push({
          callerId:
            callableStack.at(-1),

          qualifier:
            expression.expression
              .getText(source),

          calleeName:
            expression.name.text,

          line:
            lineOf(
              source,
              node,
            ),
        });
      }
    }

    ts.forEachChild(
      node,
      visit,
    );

    if (
      pushedCallable
    ) {
      callableStack.pop();
    }

    if (
      pushedClass
    ) {
      classStack.pop();
    }
  }

  visit(source);

  return {
    filePath,
    symbols,
    imports,
    calls,
    heritage,
  };
}
