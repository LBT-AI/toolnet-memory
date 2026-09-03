import type { StorageObject, StorageProvider } from './types.js';
import {
  decryptRemotePayload,
  encryptRemotePayload,
  isRemoteEncryptedPayload,
  loadRemoteEncryptionKey,
  remoteEncryptionEnabled,
  RemoteEncryptionError,
} from '../security/remote-encryption.js';

export interface RemoteEncryptedStorageOptions {
  enabled: boolean;
  key?: Uint8Array;
}

export class RemoteEncryptedStorageProvider implements StorageProvider {
  readonly name: string;

  constructor(
    private readonly inner: StorageProvider,
    private readonly options: RemoteEncryptedStorageOptions
  ) {
    this.name = inner.name;
    if (options.enabled && !options.key) {
      throw new RemoteEncryptionError(
        'REMOTE_ENCRYPTION_KEY_REQUIRED',
        'Remote client-side encryption is enabled but no encryption key is configured.'
      );
    }
  }

  async put(key: string, data: string | Uint8Array, contentType?: string): Promise<void> {
    if (!this.options.enabled) {
      await this.inner.put(key, data, contentType);
      return;
    }
    const encryptionKey = this.options.key;
    if (!encryptionKey) {
      throw new RemoteEncryptionError(
        'REMOTE_ENCRYPTION_KEY_REQUIRED',
        'Remote encryption key is unavailable.'
      );
    }
    const encrypted = encryptRemotePayload(key, data, encryptionKey);
    await this.inner.put(key, encrypted, 'application/octet-stream');
  }

  async get(key: string): Promise<Uint8Array | null> {
    const stored = await this.inner.get(key);
    if (!stored) {
      return null;
    }
    if (!isRemoteEncryptedPayload(stored)) {
      // Backward compatibility: existing plaintext remote objects remain
      // readable after encryption is enabled.
      return stored;
    }
    if (!this.options.enabled) {
      throw new RemoteEncryptionError(
        'REMOTE_ENCRYPTION_REQUIRED',
        [
          'Remote object is client-side encrypted.',
          'Enable TOOLNET_REMOTE_ENCRYPTION and configure the matching key.',
        ].join(' ')
      );
    }
    const encryptionKey = this.options.key;
    if (!encryptionKey) {
      throw new RemoteEncryptionError(
        'REMOTE_ENCRYPTION_KEY_REQUIRED',
        'Remote object is encrypted but no decryption key is configured.'
      );
    }
    return decryptRemotePayload(key, stored, encryptionKey);
  }

  async getText(key: string): Promise<string | null> {
    const data = await this.get(key);
    if (!data) {
      return null;
    }
    return Buffer.from(data).toString('utf8');
  }

  async exists(key: string): Promise<boolean> {
    return this.inner.exists(key);
  }

  async delete(key: string): Promise<void> {
    await this.inner.delete(key);
  }

  async list(prefix = ''): Promise<StorageObject[]> {
    return this.inner.list(prefix);
  }
}

export function withOptionalRemoteEncryption(
  provider: StorageProvider,
  env: NodeJS.ProcessEnv = process.env
): StorageProvider {
  if (provider.name === 'local') {
    if (remoteEncryptionEnabled(env)) {
      console.warn(
        '[storage] Remote encryption requested but active storage provider is local; local data remains unchanged.'
      );
    }
    return provider;
  }
  const enabled = remoteEncryptionEnabled(env);
  const key = enabled ? loadRemoteEncryptionKey(env) : undefined;
  return new RemoteEncryptedStorageProvider(provider, {
    enabled,
    key,
  });
}
