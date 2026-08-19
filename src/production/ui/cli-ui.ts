/**
 * Shared CLI UI primitives for consistent terminal output.
 *
 * Provides reusable rendering functions that match the ToolNet design language
 * used across index, doctor, init, update, and other commands.
 */

import { getGlyphs } from './glyphs.js';
import { ansiColorsEnabled } from './color.js';

export interface CliUiOptions {
  tty?: boolean;
  noColor?: boolean;
  columns?: number;
}

const ANSI = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  amber: '\x1b[38;5;214m',
  white: '\x1b[97m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

function supportsColor(options: CliUiOptions): boolean {
  if (options.noColor || process.env.NO_COLOR) {
    return false;
  }
  return options.tty ?? process.stdout.isTTY ?? false;
}

function getTerminalWidth(options: CliUiOptions): number {
  if (typeof options.columns === 'number' && Number.isFinite(options.columns)) {
    return Math.max(32, Math.min(240, Math.floor(options.columns)));
  }

  const stdoutColumns = process.stdout.columns;
  if (typeof stdoutColumns === 'number' && Number.isFinite(stdoutColumns)) {
    return Math.max(32, Math.min(240, Math.floor(stdoutColumns)));
  }

  return 80;
}

function color(text: string, code: string, options: CliUiOptions): string {
  return supportsColor(options) ? `${code}${text}${ANSI.reset}` : text;
}

export function dim(text: string, options: CliUiOptions): string {
  return color(text, ANSI.dim, options);
}

export function bold(text: string, options: CliUiOptions): string {
  return color(text, ANSI.bold, options);
}

export function cyan(text: string, options: CliUiOptions): string {
  return color(text, ANSI.cyan, options);
}

export function green(text: string, options: CliUiOptions): string {
  return color(text, ANSI.green, options);
}

export function red(text: string, options: CliUiOptions): string {
  return color(text, ANSI.red, options);
}

export function amber(text: string, options: CliUiOptions): string {
  return color(text, ANSI.amber, options);
}

export function white(text: string, options: CliUiOptions): string {
  return color(text, ANSI.white, options);
}

export function yellow(text: string, options: CliUiOptions): string {
  return color(text, ANSI.yellow, options);
}

/**
 * Render a header with version.
 * Example: ◆ ToolNet Memory  v0.3.6
 */
export function renderHeader(
  title: string,
  version: string | undefined,
  options: CliUiOptions
): string {
  const G = getGlyphs();
  const versionText = version ? `  ${dim(`v${version}`, options)}` : '';
  return `${cyan(G.phaseDone, options)} ${title}${versionText}`;
}

/**
 * Render a section title.
 * Example: GET STARTED
 */
export function renderSectionTitle(title: string, options: CliUiOptions): string {
  return bold(title, options);
}

/**
 * Render a command row with aligned description.
 * Example:   setup              Configure ToolNet
 */
export function renderCommandRow(
  command: string,
  description: string,
  maxCommandLength: number,
  options: CliUiOptions
): string {
  const padding = ' '.repeat(Math.max(0, maxCommandLength - command.length));
  return `  ${cyan(command, options)}${padding}   ${description}`;
}

/**
 * Render a key-value row.
 * Example:   Provider   Groq
 */
export function renderKeyValue(
  key: string,
  value: string,
  maxKeyLength: number,
  options: CliUiOptions
): string {
  const padding = ' '.repeat(Math.max(0, maxKeyLength - key.length));
  return `  ${dim(key, options)}${padding}   ${white(value, options)}`;
}

/**
 * Render a tree structure line.
 * Example: │
 */
export function renderRail(options: CliUiOptions): string {
  const G = getGlyphs();
  return dim(G.rail, options);
}

/**
 * Render a tree branch.
 * Example: ├─
 */
export function renderBranch(options: CliUiOptions): string {
  const G = getGlyphs();
  return dim(G.branch, options);
}

/**
 * Render a tree corner.
 * Example: └─
 */
export function renderCorner(options: CliUiOptions): string {
  const G = getGlyphs();
  return dim(G.corner, options);
}

/**
 * Render a success symbol.
 * Example: ◆
 */
export function renderSuccess(options: CliUiOptions): string {
  const G = getGlyphs();
  return green(G.phaseDone, options);
}

/**
 * Render an error symbol.
 * Example: ✗
 */
export function renderError(options: CliUiOptions): string {
  return red('✗', options);
}

/**
 * Render a warning symbol.
 * Example: !
 */
export function renderWarning(options: CliUiOptions): string {
  return amber('!', options);
}

/**
 * Render a hint/info symbol.
 * Example: ◇
 */
export function renderHint(options: CliUiOptions): string {
  const G = getGlyphs();
  return cyan(G.phaseActive, options);
}

/**
 * Truncate text to fit terminal width.
 */
export function truncate(text: string, maxWidth: number): string {
  if (maxWidth <= 0) {
    return '';
  }
  if (text.length <= maxWidth) {
    return text;
  }
  if (maxWidth <= 3) {
    return text.slice(0, maxWidth);
  }
  return `${text.slice(0, maxWidth - 1)}…`;
}

/**
 * Format a number with thousand separators.
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Format duration in milliseconds to human-readable text.
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}
