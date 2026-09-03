import { describe, expect, it } from 'vitest';

import {
  decryptRemotePayload,
  encryptRemotePayload,
  isRemoteEncryptedPayload,
  remoteEncryptionKeyId,
  RemoteEncryptionError,
} from '../../src/security/remote-encryption.js';

import { RemoteEncryptedStorageProvider } from '../../src/storage/encrypted-provider.js';

import type { StorageObject, StorageProvider } from '../../src/storage/types.js';

class MemoryRemoteStorage implements StorageProvider {
  readonly name = 'test-remote';
  readonly values = new Map<string, Uint8Array>();

  async put(key: string, data: string | Uint8Array): Promise<void> {
    this.values.set(key, typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data));
  }

  async get(key: string): Promise<Uint8Array | null> {
    return this.values.get(key) ?? null;
  }

  async getText(key: string): Promise<string | null> {
    const value = await this.get(key);
    return value ? Buffer.from(value).toString('utf8') : null;
  }

  async exists(key: string): Promise<boolean> {
    return this.values.has(key);
  }

  async delete(key: string): Promise<void> {
    this.values.delete(key);
  }

  async list(prefix = ''): Promise<StorageObject[]> {
    return [...this.values.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => ({ key, size: value.length }));
  }
}

function key(byte: number): Buffer {
  return Buffer.alloc(32, byte);
}

describe('Phase 27 optional remote encryption', () => {
  it('encrypts and decrypts AES-256-GCM payloads', () => {
    const encryptionKey = key(7);
    const encrypted = encryptRemotePayload(
      'projects/demo/memory.json',
      'secret durable memory',
      encryptionKey
    );
    expect(isRemoteEncryptedPayload(encrypted)).toBe(true);
    expect(Buffer.from(encrypted).includes(Buffer.from('secret durable memory'))).toBe(false);
    const decrypted = decryptRemotePayload('projects/demo/memory.json', encrypted, encryptionKey);
    expect(Buffer.from(decrypted).toString('utf8')).toBe('secret durable memory');
  });

  it('uses a random nonce for every write', () => {
    const encryptionKey = key(3);
    const first = encryptRemotePayload('same-key', 'same-data', encryptionKey);
    const second = encryptRemotePayload('same-key', 'same-data', encryptionKey);
    expect(Buffer.from(first).equals(Buffer.from(second))).toBe(false);
  });

  it('binds ciphertext to the storage object key', () => {
    const encryptionKey = key(5);
    const encrypted = encryptRemotePayload('object-a', 'payload', encryptionKey);
    expect(() => decryptRemotePayload('object-b', encrypted, encryptionKey)).toThrow(
      RemoteEncryptionError
    );
  });

  it('detects a different encryption key', () => {
    const encrypted = encryptRemotePayload('object', 'payload', key(1));
    try {
      decryptRemotePayload('object', encrypted, key(2));
      throw new Error('expected key mismatch');
    } catch (error) {
      expect(error).toBeInstanceOf(RemoteEncryptionError);
      expect((error as RemoteEncryptionError).code).toBe('REMOTE_ENCRYPTION_KEY_MISMATCH');
    }
  });

  it('produces only a non-secret key identifier', () => {
    const encryptionKey = key(9);
    const id = remoteEncryptionKeyId(encryptionKey);
    expect(id).toMatch(/^[0-9a-f]{16}$/u);
    expect(id).not.toBe(encryptionKey.toString('hex'));
  });

  it('writes ciphertext through the storage wrapper', async () => {
    const inner = new MemoryRemoteStorage();
    const provider = new RemoteEncryptedStorageProvider(inner, {
      enabled: true,
      key: key(4),
    });
    await provider.put('memory.json', '{"secret":"hello"}');
    const raw = inner.values.get('memory.json')!;
    expect(isRemoteEncryptedPayload(raw)).toBe(true);
    expect(Buffer.from(raw).toString('utf8')).not.toContain('"secret":"hello"');
    expect(await provider.getText('memory.json')).toBe('{"secret":"hello"}');
  });

  it('keeps existing plaintext objects readable after encryption is enabled', async () => {
    const inner = new MemoryRemoteStorage();
    await inner.put('legacy.json', '{"legacy":true}');
    const provider = new RemoteEncryptedStorageProvider(inner, {
      enabled: true,
      key: key(6),
    });
    expect(await provider.getText('legacy.json')).toBe('{"legacy":true}');
  });

  it('does not require a key when encryption is disabled', async () => {
    const inner = new MemoryRemoteStorage();
    const provider = new RemoteEncryptedStorageProvider(inner, {
      enabled: false,
    });
    await provider.put('plain.txt', 'plaintext');
    expect(await provider.getText('plain.txt')).toBe('plaintext');
    expect(isRemoteEncryptedPayload(inner.values.get('plain.txt')!)).toBe(false);
  });

  it('fails clearly when encrypted data is read while encryption is disabled', async () => {
    const inner = new MemoryRemoteStorage();
    const writer = new RemoteEncryptedStorageProvider(inner, {
      enabled: true,
      key: key(8),
    });
    await writer.put('encrypted.txt', 'private');
    const reader = new RemoteEncryptedStorageProvider(inner, {
      enabled: false,
    });
    await expect(reader.getText('encrypted.txt')).rejects.toMatchObject({
      code: 'REMOTE_ENCRYPTION_REQUIRED',
    });
  });

  it('requires a key only when encryption is explicitly enabled', () => {
    expect(
      () =>
        new RemoteEncryptedStorageProvider(new MemoryRemoteStorage(), {
          enabled: true,
        })
    ).toThrow('Remote client-side encryption is enabled but no encryption key is configured.');
    expect(
      () =>
        new RemoteEncryptedStorageProvider(new MemoryRemoteStorage(), {
          enabled: false,
        })
    ).not.toThrow();
  });

  it('passes list, exists, and delete through unchanged', async () => {
    const inner = new MemoryRemoteStorage();
    const provider = new RemoteEncryptedStorageProvider(inner, {
      enabled: true,
      key: key(10),
    });
    await provider.put('a/item.json', '{}');
    expect(await provider.exists('a/item.json')).toBe(true);
    expect((await provider.list('a/')).map((item) => item.key)).toEqual(['a/item.json']);
    await provider.delete('a/item.json');
    expect(await provider.exists('a/item.json')).toBe(false);
  });
});
