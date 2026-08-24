import { homedir } from 'node:os';

import { join, resolve } from 'node:path';

export interface GrokConfigPathOptions {
  home?: string;

  grokHome?: string;
}

/**
 * Resolve Grok Build home.
 *
 * Priority:
 * 1. Explicit grokHome option
 * 2. GROK_HOME
 * 3. ~/.grok
 */
export function grokHomeDirectory(options: GrokConfigPathOptions = {}): string {
  return options.grokHome ?? process.env.GROK_HOME ?? join(options.home ?? homedir(), '.grok');
}

export function grokConfigFile(options: GrokConfigPathOptions = {}): string {
  return join(grokHomeDirectory(options), 'config.toml');
}

export function grokHooksDirectory(options: GrokConfigPathOptions = {}): string {
  return join(grokHomeDirectory(options), 'hooks');
}

export function grokToolnetHookFile(options: GrokConfigPathOptions = {}): string {
  return join(grokHooksDirectory(options), 'toolnet-memory.json');
}

export function grokSkillsDirectory(options: GrokConfigPathOptions = {}): string {
  return join(grokHomeDirectory(options), 'skills');
}

export function grokContinuitySkillDirectory(options: GrokConfigPathOptions = {}): string {
  return join(grokSkillsDirectory(options), 'toolnet-continuity');
}

export function grokContinuitySkillFile(options: GrokConfigPathOptions = {}): string {
  return join(grokContinuitySkillDirectory(options), 'SKILL.md');
}

export function grokProjectDirectory(projectRoot: string): string {
  return join(resolve(projectRoot), '.grok');
}

export function grokProjectConfigFile(projectRoot: string): string {
  return join(grokProjectDirectory(projectRoot), 'config.toml');
}

export function grokProjectHooksDirectory(projectRoot: string): string {
  return join(grokProjectDirectory(projectRoot), 'hooks');
}

export function grokProjectToolnetHookFile(projectRoot: string): string {
  return join(grokProjectHooksDirectory(projectRoot), 'toolnet-memory.json');
}

export function grokProjectSkillsDirectory(projectRoot: string): string {
  return join(grokProjectDirectory(projectRoot), 'skills');
}

export function grokProjectContinuitySkillDirectory(projectRoot: string): string {
  return join(grokProjectSkillsDirectory(projectRoot), 'toolnet-continuity');
}

export function grokProjectContinuitySkillFile(projectRoot: string): string {
  return join(grokProjectContinuitySkillDirectory(projectRoot), 'SKILL.md');
}

export function grokDetectionPaths(options: GrokConfigPathOptions = {}): string[] {
  return [grokHomeDirectory(options)];
}
