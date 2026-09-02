import { Sanitizer } from './sanitizer.js';

const DURABLE_SANITIZER = new Sanitizer();

export function sanitizeDurableText(value: string): string {
  return DURABLE_SANITIZER.sanitize(value).text;
}

export function sanitizeDurableValue<T>(value: T): T {
  return DURABLE_SANITIZER.sanitizeValue(value) as T;
}

export function sanitizeDurableJson(value: unknown, spacing = 0): string {
  return JSON.stringify(sanitizeDurableValue(value), null, spacing);
}
