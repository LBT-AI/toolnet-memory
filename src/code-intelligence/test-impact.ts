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
} from "../storage/index.js";

import {
  CodeGraphStore,
  ImpactGuard,
} from "./index.js";

async function main() {
  const config =
    loadConfig();

  const project =
    new ProjectManager()
      .detect();

  const raw =
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
      raw,
      project.id,
      project.name,
      project.remote ?? project.name,
    );

  const snapshot =
    await new PersistentCodeGraphStore(
      storage,
    ).load(
      project.id,
    );

  if (!snapshot) {
    throw new Error(
      "Code graph missing",
    );
  }

  const graph =
    new CodeGraphStore();

  graph.import(
    snapshot.symbols,
    snapshot.edges,
  );

  const guard =
    new ImpactGuard(
      graph,
    );

  const filePath =
    process.argv[2];

  const result =
    filePath
      ? guard.analyzeFile(
          project.id,
          filePath,
        )
      : await guard.analyzeGitDiff(
          project.id,
          project.rootPath,
        );

  console.log({
    risk:
      result.risk,

    riskScore:
      result.riskScore,

    changedSymbols:
      result.changedSymbols.map(
        (item) => ({
          symbol:
            item.symbol
              .qualifiedName,

          file:
            item.symbol
              .filePath,

          type:
            item.symbol
              .type,
        }),
      ),

    impactedFiles:
      result.impactedFiles,

    suggestedTests:
      result.suggestedTests,

    impactedCount:
      result.impacted.length,
  });
}

main().catch(
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
