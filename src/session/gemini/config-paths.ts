import { homedir } from 'node:os';

import { join } from 'node:path';

export interface GeminiConfigPathOptions {
  home?: string;

  cwd?: string;
}

/** ~/.gemini/ */
export function geminiDirectory(options: GeminiConfigPathOptions = {}): string {
  return join(options.home ?? homedir(), '.gemini');
}

/** ~/.gemini/settings.json */
export function geminiSettingsFile(options: GeminiConfigPathOptions = {}): string {
  return join(geminiDirectory(options), 'settings.json');
}

/** <project>/.gemini/settings.json */
export function geminiWorkspaceSettingsFile(options: GeminiConfigPathOptions = {}): string {
  return join(options.cwd ?? process.cwd(), '.gemini', 'settings.json');
}

/** Native session transcripts live under ~/.gemini/tmp/<project>/chats/. */
export function geminiTranscriptsRoot(options: GeminiConfigPathOptions = {}): string {
  return join(geminiDirectory(options), 'tmp');
}

export function geminiDetectionPaths(options: GeminiConfigPathOptions = {}): string[] {
  /* ~/.gemini is shared with Agy/Antigravity, so only Gemini's own settings
   * file is primary evidence; the binary check covers fresh installs. */
  return [geminiSettingsFile(options)];
}
