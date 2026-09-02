import { existsSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { ProjectManager } from '../core/index.js';
import { integrationCapabilityLabel } from '../session/integration-capabilities.js';
import { withProgress } from './cli-progress.js';
import {
  bootstrapProjectIdentity,
  type ProjectIdentityBootstrapOptions,
  type ProjectIdentityRegistryStatus,
  type ProjectIdentitySource,
} from './project-identity-registry.js';
import {
  installAutoIntegrations,
  integrationDisplayName,
  type AutoIntegrationResult,
} from './auto-integrate.js';
export interface ToolNetInitResult {
  initialized: true;
  project: {
    id: string;
    name: string;
    remote?: string;
    rootPath: string;
  };
  manifestFile: string;
  identity?: {
    source: ProjectIdentitySource;
    registry: ProjectIdentityRegistryStatus;
    registryProvider?: string;
    gitRemote?: string;
    fingerprint?: string;
  };
}
export interface ToolNetCrossMachineInitOptions {
  skipRemoteIdentity?: boolean;
  adoptRemote?: string;
  allowGitRebind?: boolean;
}
function validateProjectPath(inputPath: string): string {
  const requestedPath = resolve(inputPath);
  if (!existsSync(requestedPath)) {
    throw new Error(`Project path does not exist: ${requestedPath}`);
  }
  if (!statSync(requestedPath).isDirectory()) {
    throw new Error(`Project path is not a directory: ${requestedPath}`);
  }
  return requestedPath;
}
/**
 * Backwards-compatible local initializer.
 *
 * Existing callers that expect a synchronous function continue
 * to work. ProjectManager itself now creates deterministic Git
 * identity for new Git repositories.
 *
 * CLI initialization uses initializeToolNetProjectCrossMachine()
 * below so legacy remote IDs can be recovered.
 */
export function initializeToolNetProject(inputPath: string = process.cwd()): ToolNetInitResult {
  const requestedPath = validateProjectPath(inputPath);
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
export async function initializeToolNetProjectCrossMachine(
  inputPath: string = process.cwd(),
  options: ToolNetCrossMachineInitOptions = {}
): Promise<ToolNetInitResult> {
  const requestedPath = validateProjectPath(inputPath);
  const bootstrapOptions: ProjectIdentityBootstrapOptions = {
    skipRemoteIdentity: options.skipRemoteIdentity,
    adoptRemote: options.adoptRemote,
    allowGitRebind: options.allowGitRebind,
  };
  const identity = await bootstrapProjectIdentity(requestedPath, bootstrapOptions);
  const project = identity.project;
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
    identity: {
      source: identity.source,
      registry: identity.registry,
      registryProvider: identity.registryProvider,
      gitRemote: identity.gitIdentity?.canonicalRemote,
      fingerprint: identity.gitIdentity?.fingerprint,
    },
  };
}
function valueAfter(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index < 0) {
    return undefined;
  }
  const value = args[index + 1];
  if (!value || value.startsWith('-')) {
    return undefined;
  }
  return value;
}
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const autoIntegrate = !args.includes('--no-integrate');
  const skipRemoteIdentity = args.includes('--no-remote-identity');
  const allowGitRebind = args.includes('--rebind-git-identity');
  const adoptRemote = valueAfter(args, '--adopt-remote');
  const explicitProject = valueAfter(args, '--project');
  const flagsWithValues = new Set(['--project', '--adopt-remote']);
  const positional = args.find((value, index) => {
    if (value.startsWith('-')) {
      return false;
    }
    const previous = args[index - 1];
    if (previous && flagsWithValues.has(previous)) {
      return false;
    }
    return true;
  });
  const projectPath = explicitProject ?? positional ?? process.cwd();
  const result = await withProgress(
    'Resolving ToolNet project identity',
    () =>
      initializeToolNetProjectCrossMachine(projectPath, {
        skipRemoteIdentity,
        adoptRemote,
        allowGitRebind,
      }),
    {
      enabled: !json,
    }
  );
  let integrations: AutoIntegrationResult[] = [];
  if (autoIntegrate) {
    integrations = await withProgress(
      'Detecting coding agents',
      () =>
        installAutoIntegrations({
          projectRoot: result.project.rootPath,
        }),
      {
        enabled: !json,
      }
    );
  }
  if (json) {
    console.log(
      JSON.stringify(
        {
          ...result,
          integrations,
        },
        null,
        2
      )
    );
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
  console.log(`Remote:   ${result.project.remote ?? result.project.name}`);
  console.log(`Root:     ${result.project.rootPath}`);
  console.log(`Manifest: ${result.manifestFile}`);
  if (result.identity) {
    console.log(`Identity: ${result.identity.source}`);
    console.log(`Registry: ${result.identity.registry}`);
    if (result.identity.gitRemote) {
      console.log(`Git:      ${result.identity.gitRemote}`);
    }
  }
  console.log('');
  if (autoIntegrate) {
    console.log('AI integrations:');
    const installed = integrations.filter((item) => item.detected && item.installed);
    if (!installed.length) {
      console.log('  ○ No supported coding agent detected');
    } else {
      for (const item of installed) {
        const name = integrationDisplayName(item.agent);
        const capability = integrationCapabilityLabel(item.agent);
        console.log(`  ✓ ${name} — ${capability}`);
      }
    }
    console.log('');
  }
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
