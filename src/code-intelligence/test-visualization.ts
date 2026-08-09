import 'dotenv/config';

import { loadConfig, ProjectManager } from '../core/index.js';

import {
  createStorageProvider,
  withStorageRetry,
  ProjectScopedStorageProvider,
  PersistentArchitectureStore,
  PersistentCodeAnalysisStore,
  PersistentCodeGraphStore,
  PersistentVisualizationStore,
} from '../storage/index.js';

import { CodeGraphStore, VisualizationBuilder } from './index.js';

async function main() {
  const config = loadConfig();

  const project = new ProjectManager().detect();

  const rawStorage = withStorageRetry(
    createStorageProvider({
      provider: config.storage.provider,

      huggingface: config.storage.huggingface,

      localRoot: config.storage.localRoot,
    }),
    {
      attempts: 3,
    }
  );

  const storage = new ProjectScopedStorageProvider(
    rawStorage,
    project.id,
    project.name,
    project.remote ?? project.name
  );

  const graphSnapshot = await new PersistentCodeGraphStore(storage).load(project.id);

  if (!graphSnapshot) {
    throw new Error('Code graph missing');
  }

  const architecture = await new PersistentArchitectureStore(storage).load(project.id);

  const analysis = await new PersistentCodeAnalysisStore(storage).load(project.id);

  const graph = new CodeGraphStore();

  graph.import(graphSnapshot.symbols, graphSnapshot.edges);

  const visualization = new VisualizationBuilder(graph).build(project.id, architecture, analysis);

  await new PersistentVisualizationStore(storage).save(visualization);

  console.log({
    ok: true,

    project: project.name,

    ...visualization.summary,
  });
}

main().catch((error) => {
  console.error(error);

  process.exit(1);
});
