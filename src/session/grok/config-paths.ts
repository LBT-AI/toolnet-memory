import { homedir } from 'node:os';
import { join } from 'node:path';

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

/**
 * Phase 01 only detects global Grok Build state.
 */
export function grokDetectionPaths(options: GrokConfigPathOptions = {}): string[] {
  return [grokHomeDirectory(options)];
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
