import "dotenv/config";

import {
  loadConfig,
  ProjectManager,
} from "../core/index.js";

import {
  createStorageProvider,
  withStorageRetry,
  ProjectScopedStorageProvider,
  PersistentArchitectureStore,
  PersistentCodeGraphStore,
} from "../storage/index.js";

import {
  ArchitectureEngine,
  CodeGraphStore,
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

  const architecture =
    new ArchitectureEngine(
      graph,
    ).analyze(
      project.id,
    );

  await new PersistentArchitectureStore(
    storage,
  ).save(
    architecture,
  );

  const layerCounts =
    architecture.layers
      .reduce<
        Record<
          string,
          number
        >
      >(
        (
          result,
          item,
        ) => {
          result[
            item.layer
          ] =
            (
              result[
                item.layer
              ] ?? 0
            ) + 1;

          return result;
        },
        {},
      );

  console.log({
    ok: true,

    project:
      project.name,

    summary:
      architecture.summary,

    layers:
      layerCounts,

    topEntryPoints:
      architecture.entryPoints
        .slice(
          0,
          10,
        )
        .map(
          (item) => ({
            kind:
              item.kind,

            file:
              item.filePath,

            name:
              item.name,

            score:
              item.score,
          }),
        ),

    topHotspots:
      architecture.hotspots
        .slice(
          0,
          10,
        )
        .map(
          (item) => ({
            file:
              item.filePath,

            score:
              item.score,

            incoming:
              item.incoming,

            outgoing:
              item.outgoing,
          }),
        ),

    largestClusters:
      architecture.clusters
        .slice(
          0,
          10,
        )
        .map(
          (item) => ({
            id:
              item.id,

            label:
              item.label,

            subsystem:
              item.subsystem,

            size:
              item.size,

            cohesion:
              item.cohesion,

            sample:
              item.files.slice(
                0,
                5,
              ),
          }),
        ),
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
