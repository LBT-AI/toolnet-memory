import { SecretScanner } from './secret-scanner.js';

export interface SanitizeResult {
  text: string;
  redacted: number;
  secretTypes: string[];
}

export class Sanitizer {
  private readonly scanner = new SecretScanner();

  sanitize(text: string): SanitizeResult {
    let output = text;

    const matches = this.scanner.scan(text);

    const secretTypes = new Set<string>();

    for (const match of matches) {
      secretTypes.add(match.type);

      output = output.split(match.value).join(`[REDACTED:${match.type}]`);
    }

    return {
      text: output,
      redacted: matches.length,
      secretTypes: [...secretTypes],
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
        /*
         * Normalize separators so all of these map consistently:
         *
         * api_key
         * api-key
         * apiKey
         * API_KEY
         */
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
        } else {
          output[key] = this.sanitizeValue(item);
        }
      }

      return output;
    }

    return value;
  }
}
