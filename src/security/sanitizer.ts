import { SecretScanner, type SecretScannerOptions } from './secret-scanner.js';

export interface SanitizeResult {
  text: string;
  redacted: number;
  secretTypes: string[];
}

export class Sanitizer {
  private readonly scanner: SecretScanner;

  constructor(options: SecretScannerOptions = {}) {
    this.scanner = new SecretScanner(options);
  }

  sanitize(text: string): SanitizeResult {
    const matches = this.scanner.scan(text);

    if (matches.length === 0) {
      return {
        text,
        redacted: 0,
        secretTypes: [],
      };
    }

    let output = text;

    /*
     * Replace from end -> beginning so offsets remain valid.
     */
    const descending = [...matches].sort((left, right) => right.start - left.start);

    const secretTypes = new Set<string>();

    for (const match of descending) {
      secretTypes.add(match.type);

      output = output.slice(0, match.start) + `[REDACTED:${match.type}]` + output.slice(match.end);
    }

    return {
      text: output,
      redacted: matches.length,
      secretTypes: [...secretTypes].sort(),
    };
  }

  sanitizeValue(value: unknown): unknown {
    if (typeof value === 'string') {
      return this.sanitize(value).text;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeValue(item));
    }

    if (value && typeof value === 'object') {
      const output: Record<string, unknown> = {};

      for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
        const normalized = key
          .normalize('NFKC')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '');

        const sensitiveKey =
          normalized.includes('password') ||
          normalized.includes('passwd') ||
          normalized === 'pwd' ||
          normalized.includes('secret') ||
          normalized.includes('token') ||
          normalized.includes('cookie') ||
          normalized.includes('authorization') ||
          normalized.includes('apikey') ||
          normalized.includes('accesskey') ||
          normalized.includes('privatekey') ||
          normalized.includes('clientsecret') ||
          normalized.includes('credential');

        if (sensitiveKey) {
          output[key] = '[REDACTED]';
          continue;
        }

        output[key] = this.sanitizeValue(item);
      }

      return output;
    }

    return value;
  }
}
