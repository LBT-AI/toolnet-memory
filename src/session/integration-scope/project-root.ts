import { spawnSync } from 'node:child_process';

import { existsSync, statSync } from 'node:fs';

import { dirname, join, parse, resolve } from 'node:path';

import type { ProjectRootResolution } from './types.js';

export interface ResolveProjectRootOptions {
  cwd?: string;
  project?: string;
}

function directory(value: string): string {
  const target = resolve(value);

  if (!existsSync(target)) {
    throw new Error(`Project path does not exist: ${target}`);
  }

  if (!statSync(target).isDirectory()) {
    throw new Error(`Project path is not a directory: ${target}`);
  }

  return target;
}

function toolnetManifest(root: string): string {
  return join(root, '.toolnet', 'project.json');
}

function findToolnetRoot(start: string): string | undefined {
  let current = resolve(start);
  const filesystemRoot = parse(current).root;

  for (;;) {
    if (existsSync(toolnetManifest(current))) {
      return current;
    }

    if (current === filesystemRoot) {
      return undefined;
    }

    const parent = dirname(current);

    if (parent === current) {
      return undefined;
    }

    current = parent;
  }
}

function detectGitRoot(start: string): string | undefined {
  const result = spawnSync('git', ['rev-parse', '--show-toplevel'], {
    cwd: start,
    encoding: 'utf8',
    timeout: 5_000,
  });

  if (result.status !== 0) {
    return undefined;
  }

  const value = result.stdout.trim();

  return value ? resolve(value) : undefined;
}

/**
 * Resolve a project root without creating or mutating ToolNet state.
 *
 * Priority:
 * 1. Explicit --project path
 * 2. Nearest existing .toolnet/project.json
 * 3. Git repository root
 * 4. cwd as an ineligible fallback for diagnostics
 *
 * A plain cwd fallback is intentionally not eligible for project-scope writes.
 */
export function resolveIntegrationProjectRoot(
  options: ResolveProjectRootOptions = {}
): ProjectRootResolution {
  const cwd = directory(options.cwd ?? process.cwd());

  if (options.project) {
    const root = directory(options.project);
    const manifestFile = toolnetManifest(root);
    const gitRoot = detectGitRoot(root);

    return {
      root,
      source: 'explicit',
      eligible: true,
      toolnetProject: existsSync(manifestFile),
      manifestFile: existsSync(manifestFile) ? manifestFile : undefined,
      gitRoot,
    };
  }

  const toolnetRoot = findToolnetRoot(cwd);

  if (toolnetRoot) {
    const manifestFile = toolnetManifest(toolnetRoot);

    return {
      root: toolnetRoot,
      source: 'toolnet',
      eligible: true,
      toolnetProject: true,
      manifestFile,
      gitRoot: detectGitRoot(toolnetRoot),
    };
  }

  const gitRoot = detectGitRoot(cwd);

  if (gitRoot) {
    const manifestFile = toolnetManifest(gitRoot);

    return {
      root: gitRoot,
      source: 'git',
      eligible: true,
      toolnetProject: existsSync(manifestFile),
      manifestFile: existsSync(manifestFile) ? manifestFile : undefined,
      gitRoot,
    };
  }

  return {
    root: cwd,
    source: 'cwd',
    eligible: false,
    toolnetProject: false,
  };
}
