import { createHash } from 'node:crypto';

export function sha256Hex(data: string | Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

export function sha256Digest(data: string | Uint8Array, length = 32): string {
  return sha256Hex(data).slice(0, length);
}
