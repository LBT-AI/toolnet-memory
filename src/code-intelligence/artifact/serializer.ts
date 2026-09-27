/*
 * Deterministic serialization.
 *
 * Component bytes are canonicalized before hashing so the same source plus the
 * same ToolNet graph versions always produce the same uncompressed component
 * hashes, regardless of the key insertion order of the producing store.
 */

function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item === undefined ? null : item));
  }

  const record = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};

  for (const key of Object.keys(record).sort()) {
    const item = record[key];
    if (item === undefined) {
      continue;
    }
    output[key] = canonicalize(item);
  }

  return output;
}

/** Canonical JSON with stable key ordering and no insignificant whitespace. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

/** Canonical, human-diffable JSON (used for manifests and pointers). */
export function canonicalJsonPretty(value: unknown): string {
  return `${JSON.stringify(canonicalize(value), null, 2)}\n`;
}

/** Canonical UTF-8 bytes of a JSON value. */
export function canonicalJsonBytes(value: unknown): Uint8Array {
  return Buffer.from(canonicalJson(value), 'utf8');
}
