/**
 * Terminal glyph detection for CLI output.
 *
 * Provides Unicode or ASCII glyphs based on terminal capabilities,
 * with special handling for Windows console encoding issues.
 */

export interface Glyphs {
  // Spinner animation glyphs
  spinner: string[];

  // Progress bar glyphs
  barFilled: string;
  barEmpty: string;

  // Status symbols
  phaseDone: string;
  phaseActive: string;

  // Tree structure
  rail: string;
  branch: string;
  corner: string;

  // Misc
  dash: string;
}

const UNICODE_GLYPHS: Glyphs = {
  spinner: ['·', '✢', '✳', '✶', '✻', '✽'],
  barFilled: '█',
  barEmpty: '░',
  phaseDone: '◆',
  phaseActive: '◇',
  rail: '│',
  branch: '├',
  corner: '└',
  dash: '—',
};

const ASCII_GLYPHS: Glyphs = {
  spinner: ['.', '*', '+', 'x', '*', '+'],
  barFilled: '#',
  barEmpty: '-',
  phaseDone: '[OK]',
  phaseActive: '[>>]',
  rail: '|',
  branch: '|',
  corner: '\\',
  dash: '-',
};

/**
 * Detect if the terminal supports Unicode characters.
 *
 * Environment variables:
 * - TOOLNET_ASCII=1 forces ASCII
 * - TOOLNET_UNICODE=1 forces Unicode
 */
function supportsUnicode(): boolean {
  // Explicit override
  if (process.env.TOOLNET_ASCII === '1') return false;
  if (process.env.TOOLNET_UNICODE === '1') return true;

  // Windows: check for known UTF-8 capable terminals
  if (process.platform === 'win32') {
    const term = process.env.TERM_PROGRAM;
    const wtSession = process.env.WT_SESSION;
    const vscode = process.env.VSCODE_PID;
    const conemu = process.env.ConEmuPID;

    // Windows Terminal, VS Code, ConEmu support UTF-8
    if (wtSession || vscode || conemu || term === 'vscode') {
      return true;
    }

    // Legacy Windows console: ASCII only
    return false;
  }

  // Linux kernel console: ASCII only
  if (process.env.TERM === 'linux') {
    return false;
  }

  // Default: assume Unicode support
  return true;
}

/**
 * Detect Unicode support for raw write operations (worker thread).
 *
 * On Windows, raw fs.writeSync(1, ...) bypasses Node's TTY encoding
 * conversion, causing mojibake on OEM codepages. Always use ASCII
 * for raw writes on Windows.
 */
function supportsUnicodeRawWrites(): boolean {
  if (process.platform === 'win32') {
    return false;
  }

  return supportsUnicode();
}

let cachedGlyphs: Glyphs | undefined;
let cachedRawWriteGlyphs: Glyphs | undefined;

/**
 * Get the appropriate glyph set for the current terminal.
 * Result is cached.
 */
export function getGlyphs(): Glyphs {
  if (!cachedGlyphs) {
    cachedGlyphs = supportsUnicode() ? UNICODE_GLYPHS : ASCII_GLYPHS;
  }
  return cachedGlyphs;
}

/**
 * Get glyphs for raw write operations (worker thread).
 * On Windows, always returns ASCII to avoid encoding issues.
 */
export function getRawWriteGlyphs(): Glyphs {
  if (!cachedRawWriteGlyphs) {
    cachedRawWriteGlyphs = supportsUnicodeRawWrites() ? UNICODE_GLYPHS : ASCII_GLYPHS;
  }
  return cachedRawWriteGlyphs;
}

/**
 * Clear cached glyphs (for testing).
 * @internal
 */
export function clearGlyphCache(): void {
  cachedGlyphs = undefined;
  cachedRawWriteGlyphs = undefined;
}
