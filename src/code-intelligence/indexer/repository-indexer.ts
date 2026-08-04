import type {
  ParsedFile,
} from "../types.js";

import {
  scanRepository,
} from "./repository-scanner.js";

import {
  parseTypeScriptFile,
} from "../parsers/typescript-parser.js";

import {
  GraphBuilder,
} from "../graph/graph-builder.js";

export interface RepositoryIndexResult {
  files: number;
  symbols: number;
  edges: number;

  graph:
    ReturnType<
      GraphBuilder["build"]
    >;
}

export class RepositoryIndexer {
  async index(
    projectId: string,
    rootPath: string,
  ): Promise<RepositoryIndexResult> {
    const files =
      await scanRepository(
        rootPath,
      );

    const parsed:
      ParsedFile[] = [];

    for (
      const file
      of files
    ) {
      try {
        parsed.push(
          await parseTypeScriptFile(
            projectId,
            rootPath,
            file,
          ),
        );
      } catch (
        error
      ) {
        console.warn(
          `[indexer] skipped ${file}:`,
          error instanceof Error
            ? error.message
            : error,
        );
      }
    }

    const graph =
      new GraphBuilder()
        .build(
          projectId,
          parsed,
        );

    return {
      files:
        parsed.length,

      symbols:
        graph
          .allSymbols(
            projectId,
          )
          .length,

      edges:
        graph
          .allEdges(
            projectId,
          )
          .length,

      graph,
    };
  }
}
