import { existsSync, statSync } from 'node:fs';

import { resolve, join } from 'node:path';

import { ProjectManager } from '../core/index.js';

export interface ToolNetInitResult {
  initialized: true;

  project: {
    id: string;

    name: string;

    remote?: string;

    rootPath: string;
  };

  manifestFile: string;
}

export function initializeToolNetProject(inputPath: string = process.cwd()): ToolNetInitResult {
  const requestedPath = resolve(inputPath);

  if (!existsSync(requestedPath)) {
    throw new Error(`Project path does not exist: ${requestedPath}`);
  }

  if (!statSync(requestedPath).isDirectory()) {
    throw new Error(`Project path is not a directory: ${requestedPath}`);
  }

  /*
   * ProjectManager already owns project-root detection and stable identity.
   *
   * It:
   * - detects repository root
   * - finds an existing .toolnet/project.json
   * - creates one when missing
   * - preserves stable project id after moves
   *
   * I1 deliberately does NOT:
   * - configure providers
   * - run indexing
   * - install agent integrations
   * - contact remote storage
   *
   * Those belong to later initialization phases.
   */
  const project = new ProjectManager().detect(requestedPath);

  const manifestFile = join(project.rootPath, '.toolnet', 'project.json');

  if (!existsSync(manifestFile)) {
    throw new Error(`ToolNet project initialization failed: ${manifestFile} was not created`);
  }

  return {
    initialized: true,

    project: {
      id: project.id,

      name: project.name,

      remote: project.remote,

      rootPath: project.rootPath,
    },

    manifestFile,
  };
}

function valueAfter(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);

  return index >= 0 ? args[index + 1] : undefined;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const json = args.includes('--json');

  const explicitProject = valueAfter(args, '--project');

  const positional = args.find(
    (value, index) => !value.startsWith('-') && (index === 0 || args[index - 1] !== '--project')
  );

  const projectPath = explicitProject ?? positional ?? process.cwd();

  const result = initializeToolNetProject(projectPath);

  if (json) {
    console.log(JSON.stringify(result, null, 2));

    return;
  }

  console.log('');
  console.log('ToolNet Memory');
  console.log('==============');
  console.log('');
  console.log('✓ Project initialized');
  console.log('');
  console.log(`Project:  ${result.project.name}`);
  console.log(`ID:       ${result.project.id}`);
  console.log(`Root:     ${result.project.rootPath}`);
  console.log(`Manifest: ${result.manifestFile}`);
  console.log('');
  console.log('Next: toolnet-memory doctor');
  console.log('');
}

const isCli = process.argv[1]?.endsWith('/init.js') || process.argv[1]?.endsWith('/init.ts');

if (isCli) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));

    process.exitCode = 1;
  });
}
