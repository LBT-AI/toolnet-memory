/*
 * Phase 77 — bounded daemon diagnostics log.
 *
 * Bounded in count, never contains source contents, credentials or full query
 * text. Structured reason codes are logged; free text is redacted.
 */

import { DAEMON_LIMITS } from './limits.js';

export interface DaemonLogEntry {
  at: string;
  level: 'info' | 'warn' | 'error';
  event: string;
  detail?: string;
}

const SECRET_PATTERNS: RegExp[] = [
  /(?:api[_-]?key|token|secret|password|passwd|authorization|bearer)\s*[:=]\s*\S+/gi,
  /(?:sk|pk|xox[baprs])-[A-Za-z0-9_-]{8,}/g,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
];

export function redactDaemonText(value: string): string {
  let output = value;

  for (const pattern of SECRET_PATTERNS) {
    output = output.replace(pattern, '[redacted]');
  }

  /* Never log an unbounded blob. */
  return output.length > 300 ? `${output.slice(0, 297)}...` : output;
}

export class DaemonLog {
  private readonly entries: DaemonLogEntry[] = [];

  constructor(private readonly maxLines: number = DAEMON_LIMITS.maxLogLines) {}

  info(event: string, detail?: string): void {
    this.push('info', event, detail);
  }

  warn(event: string, detail?: string): void {
    this.push('warn', event, detail);
  }

  error(event: string, detail?: string): void {
    this.push('error', event, detail);
  }

  private push(level: DaemonLogEntry['level'], event: string, detail?: string): void {
    const entry: DaemonLogEntry = {
      at: new Date().toISOString(),
      level,
      event: redactDaemonText(event),
      ...(detail !== undefined ? { detail: redactDaemonText(detail) } : {}),
    };

    this.entries.push(entry);

    /* Bounded rotation: drop the oldest lines. */
    while (this.entries.length > this.maxLines) {
      this.entries.shift();
    }
  }

  tail(limit = 50): DaemonLogEntry[] {
    return this.entries.slice(Math.max(0, this.entries.length - limit));
  }

  get size(): number {
    return this.entries.length;
  }
}
