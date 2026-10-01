import { existsSync, readFileSync } from 'node:fs';

import { join } from 'node:path';

import { loadConfig, ProjectManager } from '../../core/index.js';

import {
  createStorageProvider,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from '../../storage/index.js';

import { installOpenRouterIntegration } from './installer.js';

import { inspectOpenRouterStatus } from './status.js';

import { syncOpenRouterSession } from './adapter.js';

function after(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function storageFor(project: ReturnType<ProjectManager['detect']>) {
  const config = loadConfig();

  const raw = withStorageRetry(
    createStorageProvider({
      provider: config.storage.provider,
      huggingface: config.storage.huggingface,
      localRoot: config.storage.localRoot,
    }),
    { attempts: 3 }
  );

  return new ProjectScopedStorageProvider(
    raw,
    project.id,
    project.name,
    project.remote ?? project.name
  );
}

async function main() {
  const [command = 'help', ...args] = process.argv.slice(2);

  if (command === 'install') {
    const result = installOpenRouterIntegration();

    console.log(`⚠️  OpenRouter CLI: integration blocked (product identity).`);
    console.log(`   Config written (blocked): ${result.configPath}`);
    return;
  }

  if (command === 'status') {
    const status = inspectOpenRouterStatus();

    console.log('OpenRouter CLI Integration Status');
    console.log('=================================');
    console.log(`Binary detected : ${status.binaryDetected ? '✓' : '✗'}`);
    console.log(`Blocked         : ${status.blocked ? '⚠ blocked' : '✗'}`);
    console.log(`Config ready    : ${status.configReady ? '✓' : '✗'}`);
    if (status.configPath) {
      console.log(`Config path     : ${status.configPath}`);
    }
    return;
  }

  const projectPath = after(args, '--project') ?? process.cwd();

  const project = new ProjectManager().detect(projectPath);

  const storage = storageFor(project);

  if (command === 'sync') {
    const result = await syncOpenRouterSession({
      project,
      storage,
    });

    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(
    `OpenRouter CLI Session Adapter

Commands:
  install

  status

  sync
    --project PATH                     Project root
`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
