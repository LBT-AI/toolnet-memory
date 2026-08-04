import "dotenv/config";

import {
  loadConfig,
  ProjectManager,
} from "../core/index.js";

import {
  createStorageProvider,
  withStorageRetry,
  ProjectScopedStorageProvider,
  PersistentCodeAnalysisStore,
  PersistentCodeGraphStore,
} from "../storage/index.js";

import {
  CodeAnalysisEngine,
  CodeGraphStore,
  GraphQueryEngine,
} from "./index.js";

async function main() {
  const config =
    loadConfig();

  const project =
    new ProjectManager()
      .detect();

  const rawStorage =
    withStorageRetry(
      createStorageProvider({
        provider:
          config.storage.provider,

        huggingface:
          config.storage.huggingface,

        localRoot:
          config.storage.localRoot,
      }),
      {
        attempts:
          3,
      },
    );

  const storage =
    new ProjectScopedStorageProvider(
      rawStorage,
      project.id,
      project.name,
      project.remote ?? project.name,
    );

  const graphSnapshot =
    await new PersistentCodeGraphStore(
      storage,
    ).load(
      project.id,
    );

  if (!graphSnapshot) {
    throw new Error(
      "Code graph missing",
    );
  }

  const graph =
    new CodeGraphStore();

  graph.import(
    graphSnapshot.symbols,
    graphSnapshot.edges,
  );

  const analysis =
    new CodeAnalysisEngine(
      graph,
    ).analyze(
      project.id,
    );

  await new PersistentCodeAnalysisStore(
    storage,
  ).save(
    analysis,
  );

  const query =
    new GraphQueryEngine(
      graph,
    );

  const memoryStore =
    query.findSymbols(
      project.id,
      "MemoryStore",
    )[0];

  console.log({
    ok: true,

    project:
      project.name,

    summary:
      analysis.summary,

    highConfidenceDeadCode:
      analysis.deadCode
        .filter(
          (item) =>
            item.confidence ===
            "high",
        )
        .slice(
          0,
          20,
        )
        .map(
          (item) => ({
            symbol:
              item.qualifiedName ??
              item.name,

            type:
              item.type,

            file:
              item.filePath,

            line:
              item.startLine,

            score:
              item.score,
          }),
        ),

    topDependencyHubs:
      analysis.dependencies
        .slice()
        .sort(
          (a, b) =>
            (
              b.incomingEdges +
              b.outgoingEdges
            ) -
            (
              a.incomingEdges +
              a.outgoingEdges
            ),
        )
        .slice(
          0,
          15,
        )
        .map(
          (item) => ({
            file:
              item.filePath,

            dependencies:
              item.dependencies.length,

            dependents:
              item.dependents.length,

            incoming:
              item.incomingEdges,

            outgoing:
              item.outgoingEdges,
          }),
        ),

    memoryStore:
      memoryStore
        ? {
            symbol:
              memoryStore
                .qualifiedName ??
              memoryStore.name,

            callers:
              query.callers(
                project.id,
                memoryStore.id,
              ).length,

            dependents:
              query.dependents(
                project.id,
                memoryStore.id,
              ).length,

            dependencies:
              query.dependencies(
                project.id,
                memoryStore.id,
              ).length,
          }
        : null,
  });
}

main().catch(
  (error) => {
    console.error(
      error,
    );

    process.exit(1);
  },
);
