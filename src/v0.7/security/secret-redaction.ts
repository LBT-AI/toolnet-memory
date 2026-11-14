/**
 * ToolNet v0.7 secret redaction for logs, telemetry, and API errors.
 *
 * Provides comprehensive secret detection and redaction for all ToolNet memory operations
 * to prevent credentials, tokens, and sensitive data from being logged or exposed.
 */

import { createHash } from 'node:crypto';

export type SecretPattern = RegExp | string;

export interface RedactionConfig {
  patterns: SecretPattern[];
  urlPatterns?: SecretPattern[];
  customRedactors?: ((value: unknown) => unknown)[];
  preserveStructure?: boolean;
}

export class SecretRedactor {
  private readonly config: RedactionConfig;
  private readonly secrets = new Set<string>();

  constructor(config: RedactionConfig = {patterns: []}) {
    this.config = {
      patterns: config.patterns || [
        /sk-[a-zA-Z0-9]{20,}/,  // OpenAI keys
        /sk-[a-zA-Z0-9]{32,}/,  // Generic keys
        /token=[a-zA-Z0-9_-]+/,  // URL tokens
        /auth[\s=:]+['"][^'"]+['"]/,  // Auth headers
        /password[\s=:]+['"][^'"]+['"]/,  // Passwords
        /api[\s=:]+['"][^'"]+['"]/,  // API keys
        /key[\s=:]+['"][^'"]+['"]/,  // Generic keys
        /bearer[\s=:][a-zA-Z0-9\-_.~]+/i,  // Bearer tokens
      ],
      urlPatterns: config.urlPatterns || [
        /https?:\/\/[^\/]+@[\w\.-]+/,
        /ftp:\/\/[^\/]+@[\w\.-]+/,
        /ssh:\/\/[^\/]+@[^\/]+/,
      ],
      customRedactors: config.customRedactors || [],
      preserveStructure: config.preserveStructure ?? true,
    };

    this.buildSecretCache();
  }

  private buildSecretCache(): void {
    for (const pattern of this.config.patterns) {
      const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern, 'gi');
      const sample = 'sk-test1234567890abcdefghijklmnopqrstuvwx';
      const matches = sample.match(regex);
      if (matches) {
        matches.forEach(match => {
          if (typeof match === 'string' && match.trim()) {
            this.secrets.add(match.toLowerCase().trim());
          }
        });
      }
    }
  }

  redact(value: unknown): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      return this.redactString(value);
    }

    if (Array.isArray(value)) {
      return value.map(item => this.redact(item));
    }

    if (typeof value === 'object') {
      if (value instanceof Date) {
        return value.toISOString();
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
    result[key] = this.redact(val);
  }
  return result;
        for (const [key, val] of Object.entries(value)) {
          result[key] = this.redact(val);
        }
        return result;
      }

      return this.redactObject(value as Record<string, unknown>);
    }

    return value;
  }

  private redactString(input: string): string {
    let output = input;

    for (const secret of this.secrets) {
      output = output.replace(secret.replace(/[.*+?^${}()|[\]/g, '\\$&'), 'gi'), '[REDACTED]');
    }

    for (const pattern of this.config.patterns) {
      if (pattern instanceof RegExp) {
        output = output.replace(pattern, '[REDACTED]');
      }
    }

    for (const pattern of this.config.urlPatterns || []) {
      if (pattern instanceof RegExp) {
        output = output.replace(pattern, (match: string) => {
          const beforeAt = match.split('@')[0];
          return beforeAt + '@[REDACTED_HOST]';
        });
      }
    }

    for (const redactor of this.config.customRedactors || []) {
      output = redactor(output) as string;
    }

    return output;
  }

  private redactObject(obj: Record<string, unknown>): unknown {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const redactedKey = this.redactString(key);
      result[redactedKey] = this.redact(value);
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
    return this.redactor.redact(entry);
  }

  sanitizeTelemetryPayload(payload: unknown): unknown {
    return this.redactor.redact(payload);
  }
}
