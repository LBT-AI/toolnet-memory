import type { StorageProvider } from "../../storage/types.js";

import {
  PersistentCodeGraphStore,
} from "../../storage/code-graph-store.js";

import {
  PersistentCodeManifestStore,
} from "../../storage/code-manifest-store.js";

import { buildManifest } from "./manifest-builder.js";
import { diffManifest } from "./manifest.js";

import { parseTypeScriptFile } from "../parsers/typescript-parser.js";
import { GraphBuilder } from "../graph/graph-builder.js";
import { CodeGraphStore } from "../graph/graph-store.js";

import type { CodeGraphSnapshot } from "../types.js";

export interface IncrementalIndexResult {
  firstRun: boolean;

  scanned: number;
  parsed: number;

  added: number;
  modified: number;
  deleted: number;
  unchanged: number;

  symbols: number;
  edges: number;

  saved: boolean;
}

export class IncrementalRepositoryIndexer {
  constructor(
    private readonly storage: StorageProvider,
  ) {}

  async index(
    projectId: string,
    rootPath: string,
  ): Promise<IncrementalIndexResult> {
    const manifestStore =
      new PersistentCodeManifestStore(this.storage);

    const graphStore =
      new PersistentCodeGraphStore(this.storage);

    const previousManifest =
      await manifestStore.load(projectId);

    const previousGraph =
      await graphStore.load(projectId);

    const currentManifest =
      await buildManifest(projectId, rootPath);

    const diff =
      diffManifest(
        previousManifest,
        currentManifest,
      );

    const changed = [
      ...diff.added,
      ...diff.modified,
    ];

    // Nothing changed.
    if (
      previousManifest &&
      previousGraph &&
      changed.length === 0 &&
      diff.deleted.length === 0
    ) {
      return {
        firstRun: false,
        scanned: Object.keys(currentManifest.files).length,
        parsed: 0,
        added: 0,
        modified: 0,
        deleted: 0,
        unchanged: diff.unchanged.length,
        symbols: previousGraph.symbols.length,
        edges: previousGraph.edges.length,
        saved: false,
      };
    }

    /*
     * Preserve parsed symbol data from unchanged files.
     * Reparse only ADDED / MODIFIED files.
     */
    const preservedSymbols =
      previousGraph?.symbols.filter(
        (symbol) =>
          diff.unchanged.includes(symbol.filePath),
      ) ?? [];

    const parsed = [];

    for (const filePath of changed) {
      parsed.push(
        await parseTypeScriptFile(
          projectId,
          rootPath,
          filePath,
        ),
      );
    }

    /*
     * Build graph for changed files.
     */
    const changedGraph =
      new GraphBuilder().build(
        projectId,
        parsed,
      );

    /*
     * Rebuild final graph from preserved + changed symbols.
     *
     * CALL relationships can cross file boundaries, so after collecting
     * current symbols we reconstruct CALL edges from parsed data where
     * available and preserve valid unchanged edges.
     */
    const finalGraph =
      new CodeGraphStore();

    for (const symbol of preservedSymbols) {
      finalGraph.addSymbol(symbol);
    }

    for (
      const symbol
      of changedGraph.allSymbols(projectId)
    ) {
      finalGraph.addSymbol(symbol);
    }

    const validIds =
      new Set(
        finalGraph
          .allSymbols(projectId)
          .map((symbol) => symbol.id),
      );

    for (const edge of previousGraph?.edges ?? []) {
      if (
        validIds.has(edge.from) &&
        validIds.has(edge.to) &&
        !changed.includes(
          previousGraph!.symbols.find(
            (symbol) => symbol.id === edge.from,
          )?.filePath ?? "",
        ) &&
        !changed.includes(
          previousGraph!.symbols.find(
            (symbol) => symbol.id === edge.to,
          )?.filePath ?? "",
        )
      ) {
        finalGraph.addEdge(edge);
      }
    }

    for (
      const edge
      of changedGraph.allEdges(projectId)
    ) {
      finalGraph.addEdge(edge);
    }

    const snapshot: CodeGraphSnapshot = {
      version: 1,
      projectId,
      updatedAt: new Date().toISOString(),
      files: Object.keys(currentManifest.files).length,
      symbols: finalGraph.allSymbols(projectId),
      edges: finalGraph.allEdges(projectId),
    };

    await graphStore.save(snapshot);
    await manifestStore.save(currentManifest);

    return {
      firstRun: previousManifest === null,
      scanned: Object.keys(currentManifest.files).length,
      parsed: changed.length,
      added: diff.added.length,
      modified: diff.modified.length,
      deleted: diff.deleted.length,
      unchanged: diff.unchanged.length,
      symbols: snapshot.symbols.length,
      edges: snapshot.edges.length,
      saved: true,
    };
  }
}
