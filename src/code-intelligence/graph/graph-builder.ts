import { createHash } from 'node:crypto';

import { dirname, extname, normalize, posix } from 'node:path';

import type { CodeSymbol, GraphEdge } from '../../core/types.js';

import type { ParsedFile } from '../types.js';

import { CodeGraphStore } from './graph-store.js';

export type GraphModuleResolver = (
  fromFile: string,
  source: string,
  availableFiles: ReadonlySet<string>
) => string | undefined;

export interface GraphBuildOptions {
  /**
   * Existing symbols may be seeded during incremental
   * reconstruction so modified files can resolve calls
   * against unchanged files without reparsing them.
   */
  seedSymbols?: readonly CodeSymbol[];

  resolveModule?: GraphModuleResolver;
}

function edgeId(projectId: string, from: string, type: string, to: string): string {
  return createHash('sha256')
    .update(`${projectId}:${from}:${type}:${to}`)
    .digest('hex')
    .slice(0, 24);
}

function cleanPath(value: string): string {
  return normalize(value).replaceAll('\\', '/');
}

function relativeImportFallback(
  fromFile: string,
  source: string,
  availableFiles: ReadonlySet<string>
): string | undefined {
  if (!source.startsWith('.')) {
    return undefined;
  }

  const base = cleanPath(posix.join(dirname(fromFile), source));

  const extension = extname(base);

  let candidates: string[];

  if (extension === '.js') {
    const stem = base.slice(0, -3);
    candidates = [`${stem}.ts`, `${stem}.tsx`, `${stem}.js`, `${stem}.jsx`];
  } else if (extension === '.mjs') {
    const stem = base.slice(0, -4);
    candidates = [`${stem}.mts`, `${stem}.ts`, `${stem}.mjs`];
  } else if (extension === '.cjs') {
    const stem = base.slice(0, -4);
    candidates = [`${stem}.cts`, `${stem}.ts`, `${stem}.cjs`];
  } else if (extension) {
    candidates = [base];
  } else {
    candidates = [
      `${base}.ts`,
      `${base}.tsx`,
      `${base}.mts`,
      `${base}.cts`,
      `${base}.js`,
      `${base}.jsx`,
      `${base}.mjs`,
      `${base}.cjs`,
      `${base}/index.ts`,
      `${base}/index.tsx`,
      `${base}/index.mts`,
      `${base}/index.cts`,
      `${base}/index.js`,
      `${base}/index.jsx`,
      `${base}/index.mjs`,
      `${base}/index.cjs`,
    ];
  }

  return candidates.find((candidate) => availableFiles.has(cleanPath(candidate)));
}

function resolveImportFile(
  fromFile: string,
  source: string,
  availableFiles: ReadonlySet<string>,
  resolver: GraphModuleResolver | undefined
): string | undefined {
  const custom = resolver?.(fromFile, source, availableFiles);

  if (custom) {
    const clean = cleanPath(custom);

    if (availableFiles.has(clean)) {
      return clean;
    }
  }

  return relativeImportFallback(fromFile, source, availableFiles);
}

export class GraphBuilder {
  build(projectId: string, parsed: ParsedFile[], options: GraphBuildOptions = {}): CodeGraphStore {
    const graph = new CodeGraphStore();

    /*
     * Seed unchanged symbols first.
     * Parsed/new symbols are added afterwards and therefore
     * become authoritative if IDs happen to overlap.
     */
    for (const symbol of options.seedSymbols ?? []) {
      graph.addSymbol(symbol);
    }

    for (const file of parsed) {
      for (const symbol of file.symbols) {
        graph.addSymbol(symbol);
      }
    }

    const files = new Map<string, CodeSymbol>();

    for (const symbol of graph.allSymbols(projectId)) {
      if (symbol.type !== 'file') {
        continue;
      }

      files.set(cleanPath(symbol.filePath), symbol);
    }

    const availableFiles = new Set(files.keys());

    for (const file of parsed) {
      const filePath = cleanPath(file.filePath);

      const fileNode = files.get(filePath);

      if (!fileNode) {
        continue;
      }

      // DEFINES
      for (const symbol of file.symbols) {
        if (symbol.id === fileNode.id) {
          continue;
        }

        graph.addEdge(this.edge(projectId, fileNode.id, 'DEFINES', symbol.id));
      }

      // IMPORTS
      for (const item of file.imports) {
        const targetPath = resolveImportFile(
          filePath,
          item.source,
          availableFiles,
          options.resolveModule
        );

        if (!targetPath) {
          continue;
        }

        const targetFile = files.get(targetPath);

        if (!targetFile) {
          continue;
        }

        graph.addEdge(
          this.edge(projectId, fileNode.id, 'IMPORTS', targetFile.id, {
            source: item.source,
            resolvedFile: targetPath,
          })
        );
      }

      // INHERITS / IMPLEMENTS
      for (const relation of file.heritage) {
        const targets = graph
          .findByName(projectId, relation.targetName)
          .filter((symbol) => symbol.type === 'class' || symbol.type === 'interface');

        for (const target of targets) {
          graph.addEdge(this.edge(projectId, relation.fromId, relation.type, target.id));
        }
      }

      // CALLS
      for (const call of file.calls) {
        if (!call.callerId) {
          continue;
        }

        const targets = this.resolveCallTargets(
          projectId,
          file,
          call.calleeName,
          call.qualifier,
          graph,
          availableFiles,
          options.resolveModule
        );

        for (const target of targets) {
          if (target.id === call.callerId) {
            continue;
          }

          graph.addEdge(
            this.edge(projectId, call.callerId, 'CALLS', target.id, {
              line: call.line,
              qualifier: call.qualifier,
            })
          );
        }
      }
    }

    return graph;
  }

  private resolveCallTargets(
    projectId: string,
    file: ParsedFile,
    calleeName: string,
    qualifier: string | undefined,
    graph: CodeGraphStore,
    availableFiles: ReadonlySet<string>,
    resolver: GraphModuleResolver | undefined
  ): CodeSymbol[] {
    const filePath = cleanPath(file.filePath);

    // Same-file symbol first.
    const sameFile = graph
      .findByName(projectId, calleeName)
      .filter((symbol) => cleanPath(symbol.filePath) === filePath);

    if (!qualifier && sameFile.length) {
      return sameFile;
    }

    // Namespace import: api.login()
    if (qualifier) {
      for (const imported of file.imports) {
        const namespace = imported.bindings.find(
          (binding) => binding.kind === 'namespace' && binding.localName === qualifier
        );

        if (!namespace) {
          continue;
        }

        const targetPath = resolveImportFile(filePath, imported.source, availableFiles, resolver);

        if (!targetPath) {
          continue;
        }

        return graph
          .findByName(projectId, calleeName)
          .filter((symbol) => cleanPath(symbol.filePath) === targetPath);
      }
    }

    // Named/default imported function.
    for (const imported of file.imports) {
      const binding = imported.bindings.find((item) => item.localName === calleeName);

      if (!binding) {
        continue;
      }

      const targetPath = resolveImportFile(filePath, imported.source, availableFiles, resolver);

      if (!targetPath) {
        continue;
      }

      const targetName = binding.importedName === 'default' ? calleeName : binding.importedName;

      const target = graph
        .findByName(projectId, targetName)
        .filter((symbol) => cleanPath(symbol.filePath) === targetPath);

      if (target.length) {
        return target;
      }
    }

    /*
     * Last fallback remains conservative.
     * Graph ambiguity is left visible rather than inventing
     * type resolution.
     */
    return graph
      .findByName(projectId, calleeName)
      .filter((symbol) => symbol.type === 'function' || symbol.type === 'method');
  }

  private edge(
    projectId: string,
    from: string,
    type: GraphEdge['type'],
    to: string,
    metadata?: Record<string, unknown>
  ): GraphEdge {
    return {
      id: edgeId(projectId, from, type, to),
      projectId,
      from,
      to,
      type,
      metadata,
    };
  }
}
