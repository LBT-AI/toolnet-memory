import { loadConfig, ProjectManager } from '../core/index.js';

import {
  createStorageProvider,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from '../storage/index.js';

import { refreshProjectStateOnce } from './background-refresh.js';

interface CliArguments {
  projectPath?: string;

  json: boolean;

  quiet: boolean;
}

function argumentValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);

  if (index < 0) {
    return undefined;
  }

  return args[index + 1];
}

function parseArguments(args: string[]): CliArguments {
  return {
    projectPath: argumentValue(args, '--project'),

    json: args.includes('--json'),

    quiet: args.includes('--quiet'),
  };
}

async function createProjectStorage(project: ReturnType<ProjectManager['detect']>) {
  const config = loadConfig();

  const raw = withStorageRetry(
    createStorageProvider({
      provider: config.storage.provider,

      huggingface: config.storage.huggingface,

      localRoot: config.storage.localRoot,
    }),
    {
      attempts: 3,
    }
  );

  return new ProjectScopedStorageProvider(
    raw,
    project.id,
    project.name,
    project.remote ?? project.name
  );
}

async function main(): Promise<void> {
  const args = parseArguments(process.argv.slice(2));

  const root = args.projectPath ?? process.cwd();

  const project = new ProjectManager().detect(root);

  if (!project) {
    if (!args.quiet) {
      console.error(`ToolNet project not found: ${root}`);
    }

    process.exitCode = 2;

    return;
  }

  let storage;

  try {
    storage = await createProjectStorage(project);
  } catch (error) {
    if (!args.quiet) {
      console.error(error instanceof Error ? error.message : String(error));
    }

    process.exitCode = 3;

    return;
  }

  try {
    const result = await refreshProjectStateOnce(project, storage);

    if (args.quiet) {
      return;
    }

    if (args.json) {
      console.log(JSON.stringify(result));

      return;
    }

    console.log(
      [
        'ToolNet Memory refreshed',
        `memory=${result.memories}`,
        `work=${result.workAvailable ? 'yes' : 'no'}`,
      ].join(' ')
    );
  } catch (error) {
    if (!args.quiet) {
      console.error(error instanceof Error ? error.message : String(error));
    }

    /*
     * Refresh failure must be observable to direct CLI users.
     * Integrations may invoke with --quiet and explicitly
     * ignore this exit code so the coding agent continues.
     */
    process.exitCode = 4;
  }
}

void main().then(() => {
  process.exit(process.exitCode ?? 0);
});
