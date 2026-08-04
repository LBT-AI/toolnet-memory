import "dotenv/config";

import {
  loadConfig,
  ProjectManager,
} from "../core/index.js";

import {
  createStorageProvider,
  withStorageRetry,
  ProjectScopedStorageProvider,
  PersistentCodeGraphStore,
  PersistentTypeResolutionStore,
} from "../storage/index.js";

import {
  CodeGraphStore,
  TypeScriptTypeResolver,
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
        attempts: 3,
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
      "Code graph missing. Run code:index:test first.",
    );
  }

  const graph =
    new CodeGraphStore();

  graph.import(
    graphSnapshot.symbols,
    graphSnapshot.edges,
  );

  const resolver =
    new TypeScriptTypeResolver(
      graph,
    );

  const resolution =
    await resolver.resolveProject(
      project.id,
      project.rootPath,
    );

  await new PersistentTypeResolutionStore(
    storage,
  ).save(
    resolution,
  );

  console.log({
    ok: true,

    project:
      project.name,

    total:
      resolution.total,

    exact:
      resolution.exact,

    high:
      resolution.high,

    fallback:
      resolution.fallback,

    exactRate:
      resolution.total
        ? Number(
            (
              (
                resolution.exact /
                resolution.total
              ) *
              100
            ).toFixed(2),
          )
        : 0,

    samples:
      resolution.resolutions
        .filter(
          (item) =>
            item.targetFile,
        )
        .slice(0, 10)
        .map(
          (item) => ({
            expression:
              item.expression,

            from:
              `${item.sourceFile}:${item.sourceLine}`,

            to:
              `${item.targetFile}:${item.targetLine ?? "?"}`,

            target:
              item.targetQualifiedName ??
              item.targetName,

            confidence:
              item.confidence,
          }),
        ),
  });
}

main().catch(
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
