import { homedir } from 'node:os';

import { join, resolve } from 'node:path';

import type { ProjectManifest } from '../../core/types.js';

import { readJsonFile, writeJsonAtomic } from '../utils.js';

export interface ToolNetCliProjectBinding {
  nativeSessionId: string;

  projectId: string;

  projectRoot: string;

  boundAt: string;
}

interface ToolNetCliBindingRegistry {
  version: 1;

  sessions: Record<string, ToolNetCliProjectBinding>;
}

export interface ToolNetCliBindingOptions {
  bindingFile?: string;
}

export function defaultToolNetCliBindingFile(): string {
  const configRoot = process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config');

  return join(configRoot, 'toolnet-memory', 'toolnet-cli-bindings.json');
}

function cleanSessionId(value: string): string {
  return value.endsWith('.json') ? value.slice(0, -5) : value;
}

function emptyRegistry(): ToolNetCliBindingRegistry {
  return {
    version: 1,

    sessions: {},
  };
}

function loadRegistry(bindingFile: string): ToolNetCliBindingRegistry {
  const loaded = readJsonFile<ToolNetCliBindingRegistry>(bindingFile);

  if (!loaded) {
    return emptyRegistry();
  }

  if (loaded.version !== 1 || !loaded.sessions || typeof loaded.sessions !== 'object') {
    throw new Error(`Invalid ToolNet CLI binding registry: ${bindingFile}`);
  }

  return loaded;
}

function normalizedRoot(project: ProjectManifest): string {
  return resolve(project.rootPath);
}

export function bindToolNetCliSession(
  project: ProjectManifest,
  nativeSessionId: string,
  options: ToolNetCliBindingOptions = {}
): ToolNetCliProjectBinding {
  const sessionId = cleanSessionId(nativeSessionId);

  if (!sessionId) {
    throw new Error('ToolNet CLI native session ID is required.');
  }

  const bindingFile = options.bindingFile ?? defaultToolNetCliBindingFile();

  const registry = loadRegistry(bindingFile);

  const existing = registry.sessions[sessionId];

  const projectRoot = normalizedRoot(project);

  if (existing) {
    if (existing.projectId !== project.id || resolve(existing.projectRoot) !== projectRoot) {
      throw new Error(
        `ToolNet CLI session ${sessionId} is already bound to another project: ${existing.projectRoot}`
      );
    }

    return existing;
  }

  const binding: ToolNetCliProjectBinding = {
    nativeSessionId: sessionId,

    projectId: project.id,

    projectRoot,

    boundAt: new Date().toISOString(),
  };

  registry.sessions[sessionId] = binding;

  writeJsonAtomic(bindingFile, registry);

  return binding;
}

export function requireToolNetCliSessionBinding(
  project: ProjectManifest,
  nativeSessionId: string,
  options: ToolNetCliBindingOptions = {}
): ToolNetCliProjectBinding {
  const sessionId = cleanSessionId(nativeSessionId);

  const bindingFile = options.bindingFile ?? defaultToolNetCliBindingFile();

  const registry = loadRegistry(bindingFile);

  const binding = registry.sessions[sessionId];

  if (!binding) {
    throw new Error(
      `ToolNet CLI session ${sessionId} is not bound to this project. Run sync once with --bind.`
    );
  }

  const projectRoot = normalizedRoot(project);

  if (binding.projectId !== project.id || resolve(binding.projectRoot) !== projectRoot) {
    throw new Error(
      `ToolNet CLI session ${sessionId} belongs to another project: ${binding.projectRoot}`
    );
  }

  return binding;
}

export function listToolNetCliProjectBindings(
  project: ProjectManifest,
  options: ToolNetCliBindingOptions = {}
): ToolNetCliProjectBinding[] {
  const bindingFile = options.bindingFile ?? defaultToolNetCliBindingFile();

  const registry = loadRegistry(bindingFile);

  const projectRoot = normalizedRoot(project);

  return Object.values(registry.sessions)
    .filter(
      (binding) => binding.projectId === project.id && resolve(binding.projectRoot) === projectRoot
    )
    .sort((a, b) => a.nativeSessionId.localeCompare(b.nativeSessionId));
}
