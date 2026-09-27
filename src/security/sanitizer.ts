import { SecretScanner, type SecretScannerOptions } from './secret-scanner.js';

/*
 * Phase 85G1 — hostile own-key boundary.
 *
 * `__proto__` is an inherited accessor, not a plain key: `target['__proto__']
 * = value` rewrites the output object's prototype instead of copying a
 * property, so a hostile persisted object could make sanitized output inherit
 * attacker data. A sanitizer must never carry a prototype key forward, so the
 * key is refused outright (documented, never a prototype mutation).
 *
 * Every other key is defined as an own data property rather than assigned, so
 * no inherited setter can ever run and no prototype — including
 * Object.prototype — is mutated. For ordinary keys this is exactly the
 * property a plain assignment would have created.
 */
function defineSafeProperty(target: Record<string, unknown>, key: string, value: unknown): void {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    writable: true,
    configurable: true,
  });
}

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
        /*
         * Refuse the prototype accessor key: it can only rewrite a prototype,
         * never represent safe data.
         */
        if (key === '__proto__') {
          continue;
        }

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
          defineSafeProperty(output, key, '[REDACTED]');
          continue;
        }

        defineSafeProperty(output, key, this.sanitizeValue(item));
      }

      return output;
    }

    return value;
  }
}
