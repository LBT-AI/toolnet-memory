import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { readFileSync } from 'node:fs';

const MAGIC = Buffer.from('TNMEME01', 'ascii');
const VERSION = 1;
const KEY_ID_LENGTH = 8;
const NONCE_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const HEADER_LENGTH = MAGIC.length + 1 + KEY_ID_LENGTH + NONCE_LENGTH + AUTH_TAG_LENGTH;
const AAD_PREFIX = 'toolnet-memory:remote-encryption:v1:';

export const REMOTE_ENCRYPTION_ALGORITHM = 'aes-256-gcm' as const;
export const REMOTE_ENCRYPTION_KEY_BYTES = 32 as const;

export class RemoteEncryptionError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'RemoteEncryptionError';
  }
}

function envEnabled(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  return ['1', 'true', 'yes', 'on', 'enabled'].includes(value.trim().toLowerCase());
}

export function remoteEncryptionEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return envEnabled(env.TOOLNET_REMOTE_ENCRYPTION);
}

function decodeKeyMaterial(input: string): Buffer {
  const value = input.trim();
  if (!value) {
    throw new RemoteEncryptionError(
      'REMOTE_ENCRYPTION_KEY_EMPTY',
      'Remote encryption key is empty.'
    );
  }
  let decoded: Buffer;
  if (value.startsWith('hex:')) {
    const hex = value.slice(4);
    if (!/^[0-9a-f]{64}$/iu.test(hex)) {
      throw new RemoteEncryptionError(
        'REMOTE_ENCRYPTION_KEY_INVALID',
        'hex: remote encryption key must contain exactly 64 hexadecimal characters.'
      );
    }
    decoded = Buffer.from(hex, 'hex');
  } else if (/^[0-9a-f]{64}$/iu.test(value)) {
    decoded = Buffer.from(value, 'hex');
  } else {
    const raw = value.startsWith('base64:') ? value.slice(7) : value;
    if (!/^[A-Za-z0-9+/_-]+={0,2}$/u.test(raw)) {
      throw new RemoteEncryptionError(
        'REMOTE_ENCRYPTION_KEY_INVALID',
        'Remote encryption key must be 32 raw bytes encoded as hexadecimal or base64.'
      );
    }
    decoded = Buffer.from(raw, raw.includes('-') || raw.includes('_') ? 'base64url' : 'base64');
  }
  if (decoded.length !== REMOTE_ENCRYPTION_KEY_BYTES) {
    throw new RemoteEncryptionError(
      'REMOTE_ENCRYPTION_KEY_INVALID_LENGTH',
      `Remote encryption key must decode to exactly ${REMOTE_ENCRYPTION_KEY_BYTES} bytes.`
    );
  }
  return decoded;
}

export function loadRemoteEncryptionKey(env: NodeJS.ProcessEnv = process.env): Buffer | undefined {
  const inline = env.TOOLNET_REMOTE_ENCRYPTION_KEY?.trim();
  const file = env.TOOLNET_REMOTE_ENCRYPTION_KEY_FILE?.trim();
  if (inline && file) {
    throw new RemoteEncryptionError(
      'REMOTE_ENCRYPTION_KEY_AMBIGUOUS',
      'Configure either TOOLNET_REMOTE_ENCRYPTION_KEY or TOOLNET_REMOTE_ENCRYPTION_KEY_FILE, not both.'
    );
  }
  if (inline) {
    return decodeKeyMaterial(inline);
  }
  if (file) {
    let raw: string;
    try {
      raw = readFileSync(file, 'utf8');
    } catch (error) {
      throw new RemoteEncryptionError(
        'REMOTE_ENCRYPTION_KEY_FILE_READ_FAILED',
        [
          `Unable to read remote encryption key file: ${file}.`,
          error instanceof Error ? error.message : String(error),
        ].join(' ')
      );
    }
    return decodeKeyMaterial(raw);
  }
  return undefined;
}

function keyId(key: Uint8Array): Buffer {
  return createHash('sha256').update(key).digest().subarray(0, KEY_ID_LENGTH);
}

function aadForKey(objectKey: string): Buffer {
  return Buffer.from(`${AAD_PREFIX}${objectKey}`, 'utf8');
}

export function isRemoteEncryptedPayload(data: Uint8Array): boolean {
  if (data.byteLength < MAGIC.length) {
    return false;
  }
  return Buffer.from(data).subarray(0, MAGIC.length).equals(MAGIC);
}

export function remoteEncryptionKeyId(key: Uint8Array): string {
  return keyId(key).toString('hex');
}

export function encryptRemotePayload(
  objectKey: string,
  data: string | Uint8Array,
  key: Uint8Array
): Uint8Array {
  if (key.byteLength !== REMOTE_ENCRYPTION_KEY_BYTES) {
    throw new RemoteEncryptionError(
      'REMOTE_ENCRYPTION_KEY_INVALID_LENGTH',
      'AES-256-GCM requires a 32-byte key.'
    );
  }
  const plaintext = typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data);
  const nonce = randomBytes(NONCE_LENGTH);
  const cipher = createCipheriv(REMOTE_ENCRYPTION_ALGORITHM, key, nonce);
  cipher.setAAD(aadForKey(objectKey));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const header = Buffer.alloc(HEADER_LENGTH);
  let offset = 0;
  MAGIC.copy(header, offset);
  offset += MAGIC.length;
  header.writeUInt8(VERSION, offset);
  offset += 1;
  keyId(key).copy(header, offset);
  offset += KEY_ID_LENGTH;
  nonce.copy(header, offset);
  offset += NONCE_LENGTH;
  authTag.copy(header, offset);
  return Buffer.concat([header, ciphertext]);
}

export function decryptRemotePayload(
  objectKey: string,
  data: Uint8Array,
  key: Uint8Array
): Uint8Array {
  const input = Buffer.from(data);
  if (!isRemoteEncryptedPayload(input)) {
    throw new RemoteEncryptionError(
      'REMOTE_ENCRYPTION_ENVELOPE_REQUIRED',
      'Payload is not a ToolNet encrypted remote object.'
    );
  }
  if (input.length < HEADER_LENGTH) {
    throw new RemoteEncryptionError(
      'REMOTE_ENCRYPTION_ENVELOPE_TRUNCATED',
      'Encrypted remote payload is truncated.'
    );
  }
  let offset = MAGIC.length;
  const version = input.readUInt8(offset);
  offset += 1;
  if (version !== VERSION) {
    throw new RemoteEncryptionError(
      'REMOTE_ENCRYPTION_VERSION_UNSUPPORTED',
      `Unsupported remote encryption envelope version: ${version}.`
    );
  }
  const storedKeyId = input.subarray(offset, offset + KEY_ID_LENGTH);
  offset += KEY_ID_LENGTH;
  const expectedKeyId = keyId(key);
  if (!timingSafeEqual(storedKeyId, expectedKeyId)) {
    throw new RemoteEncryptionError(
      'REMOTE_ENCRYPTION_KEY_MISMATCH',
      'Configured remote encryption key does not match this encrypted object.'
    );
  }
  const nonce = input.subarray(offset, offset + NONCE_LENGTH);
  offset += NONCE_LENGTH;
  const authTag = input.subarray(offset, offset + AUTH_TAG_LENGTH);
  offset += AUTH_TAG_LENGTH;
  const ciphertext = input.subarray(offset);
  const decipher = createDecipheriv(REMOTE_ENCRYPTION_ALGORITHM, key, nonce);
  decipher.setAAD(aadForKey(objectKey));
  decipher.setAuthTag(authTag);
  try {
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    throw new RemoteEncryptionError(
      'REMOTE_ENCRYPTION_AUTH_FAILED',
      'Encrypted remote object failed AES-GCM authentication.'
    );
  }
}
