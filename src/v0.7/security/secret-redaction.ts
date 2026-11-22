/**
 * ToolNet v0.7 secret redaction for logs, telemetry, and API errors.
 *
 * Provides comprehensive secret detection and redaction for all ToolNet memory operations
 * to prevent credentials, tokens, and sensitive data from being logged or exposed.
 */

import { createHash } from 'node:crypto';

export type SecretPattern = RegExp | string;

export interface RedactionConfig {
  patterns?: SecretPattern[];
  urlPatterns?: SecretPattern[];
  customRedactors?: ((value: unknown) => unknown)[];
  preserveStructure?: boolean;
}

export class SecretRedactor {
  private readonly config: RedactionConfig;

  constructor(config: RedactionConfig = {}) {
    this.config = {
      patterns:
        config.patterns && config.patterns.length > 0
          ? config.patterns
          : [
              /sk-[a-zA-Z0-9]{20,}/, // OpenAI keys
              /sk-[a-zA-Z0-9]{32,}/, // Generic keys
              /token=[a-zA-Z0-9_-]+/, // URL tokens
              /auth[\s=:]+['"][^'"]+['"]/, // Auth headers
              /password[\s=:]+['"][^'"]+['"]/, // Passwords
              /api[\s=:]+['"][^'"]+['"]/, // API keys
              /key[\s=:]+['"][^'"]+['"]/, // Generic keys
              /bearer[\s=:][a-zA-Z0-9\-_.~]+/i, // Bearer tokens
            ],
      urlPatterns:
        config.urlPatterns && config.urlPatterns.length > 0
          ? config.urlPatterns
          : [/https?:\/\/[^\/]+@[\w\.-]+/, /ftp:\/\/[^\/]+@[\w\.-]+/, /ssh:\/\/[^\/]+@[^\/]+/],
      customRedactors: config.customRedactors || [],
      preserveStructure: config.preserveStructure ?? true,
    };
  }

  redact(value: unknown, seen: WeakSet<object> = new WeakSet()): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      return this.redactString(value);
    }

    if (typeof value !== 'object') {
      return value;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (seen.has(value)) {
      return '[Circular]';
    }

    seen.add(value);

    if (Array.isArray(value)) {
      return value.map((item) => this.redact(item, seen));
    }

    if (value instanceof Error) {
      return {
        name: value.name,
        message: this.redactString(value.message),
        stack: value.stack ? this.redactString(value.stack) : undefined,
      };
    }

    if (this.config.preserveStructure) {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        const redactedKey = this.redactString(key);
        result[redactedKey] = this.redact(val, seen);
      }
      return result;
    }

    return this.redactObject(value as Record<string, unknown>, seen);
  }

  private redactString(input: string): string {
    let output = input;

    for (const pattern of this.config.patterns ?? []) {
      if (pattern instanceof RegExp) {
        const globalPattern = pattern.flags.includes('g')
          ? pattern
          : new RegExp(pattern.source, pattern.flags + 'g');
        output = output.replace(globalPattern, '[REDACTED]');
      } else {
        output = output.replaceAll(pattern, '[REDACTED]');
      }
    }

    for (const pattern of this.config.urlPatterns || []) {
      if (pattern instanceof RegExp) {
        const globalPattern = pattern.flags.includes('g')
          ? pattern
          : new RegExp(pattern.source, pattern.flags + 'g');
        output = output.replace(globalPattern, (match: string) => {
          const beforeAt = match.split('@')[0];
          return beforeAt + '@[REDACTED_HOST]';
        });
      } else {
        output = output.replaceAll(pattern, (match: string) => {
          const beforeAt = match.split('@')[0];
          return beforeAt + '@[REDACTED_HOST]';
        });
      }
    }

    for (const redactor of this.config.customRedactors || []) {
      const redacted = redactor(output);
      output = typeof redacted === 'string' ? redacted : String(redacted);
    }

    return output;
  }

  private redactObject(obj: Record<string, unknown>, seen: WeakSet<object>): unknown {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const redactedKey = this.redactString(key);
      result[redactedKey] = this.redact(value, seen);
    }

    return result;
  }

  static createDefaultConfig(): RedactionConfig {
    return {
      patterns: [
        /sk-[a-zA-Z0-9]{20,}/,
        /token=[a-zA-Z0-9_-]+/,
        /auth[\s=:]+['"][^'"]+['"]/,
        /password[\s=:]+['"][^'"]+['"]/,
        /api[\s=:]+['"][^'"]+['"]/,
        /key[\s=:]+['"][^'"]+['"]/,
        /bearer[\s=:][a-zA-Z0-9\-_.~]+/i,
        /\b0x[a-fA-F0-9]{32,}\b/,
        /\b[A-Za-z0-9+/]{40,}={0,2}\b/,
      ],
      urlPatterns: [
        /https?:\/\/[^\/]+@[\w\.-]+/,
        /ftp:\/\/[^\/]+@[\w\-]+/,
        /ssh:\/\/[^\/]+@[^\/]+/,
      ],
      customRedactors: [],
      preserveStructure: true,
    };
  }
}

export class LogSanitizer {
  constructor(private readonly redactor: SecretRedactor) {}

  sanitizeLogEntry(entry: Record<string, unknown>): Record<string, unknown> {
    const result = this.redactor.redact(entry);
    return result as Record<string, unknown>;
  }

  sanitizeTelemetryPayload(payload: unknown): unknown {
    return this.redactor.redact(payload);
  }
}
