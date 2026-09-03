# Optional Remote Client-Side Encryption

ToolNet Memory supports optional client-side encryption for remote object
storage. It is disabled by default. Normal local-first usage does not require
an encryption key.

## Scope

Encryption applies to supported remote storage providers created through the
ToolNet storage factory:

- Cloudflare R2
- generic S3-compatible storage
- Hugging Face S3-compatible storage

Local storage is not changed by this feature.

## Algorithm

```text
AES-256-GCM
key size:   32 bytes
nonce:      12 random bytes per object write
auth tag:   16 bytes
```

Each encrypted object carries a compact ToolNet envelope containing:

- format magic,
- envelope version,
- non-secret key identifier,
- nonce,
- GCM authentication tag,
- ciphertext.

The key itself is never written into the object.

### Object-key binding

The storage object key is included as AES-GCM additional authenticated data
(AAD). A ciphertext copied to another object key without decrypting and
re-encrypting will fail authentication. This prevents silent ciphertext
swapping between ToolNet storage paths.

## Enable

```bash
export TOOLNET_REMOTE_ENCRYPTION=on
export TOOLNET_REMOTE_ENCRYPTION_KEY="$(openssl rand -base64 32)"
```

The key is required only when encryption is explicitly enabled.

## Key file

For containers and services, a protected key file is preferable:

```bash
export TOOLNET_REMOTE_ENCRYPTION=on
export TOOLNET_REMOTE_ENCRYPTION_KEY_FILE=/run/secrets/toolnet_remote_encryption_key
```

Configure either the inline key or the key file, never both.

## Existing remote data

Existing plaintext remote objects remain readable after encryption is
enabled. New or rewritten objects are encrypted.

ToolNet does not silently bulk-rewrite an existing bucket when encryption is
turned on. This avoids an implicit destructive migration. A future explicit
migration tool can encrypt existing plaintext objects after backup and
operator approval.

## Disabling after encrypted writes

If ToolNet encounters an encrypted remote object while encryption is
disabled, it fails with a clear encryption-required error. It does not
return ciphertext as ordinary JSON/text. Re-enable encryption with the
matching key to read the object.

## Wrong key

Encrypted objects include a short non-secret identifier derived from the
key. When a different key is configured, ToolNet fails before returning data.
AES-GCM authentication also verifies ciphertext integrity.

## Key rotation

Phase 27 intentionally does not introduce a multi-key keyring or automatic
key rotation. This keeps key management optional and small. Do not replace
the active key while encrypted objects still depend on it unless the data
has first been explicitly decrypted/re-encrypted.

## Remote provider boundary

Encryption occurs before `StorageProvider.put()` reaches the remote backend.
Decryption occurs after `StorageProvider.get()` returns data. Therefore the
remote provider receives ciphertext rather than ToolNet plaintext for
encrypted writes. Provider TLS and provider-side encryption can still be used
in addition to ToolNet client-side encryption.

## Local fallback

If remote credentials are unavailable and ToolNet falls back to local
storage, the local provider remains unchanged. Remote-encryption mode does
not silently transform ToolNet local storage.

## Not included

This feature does not add:

- LLMs,
- embedding providers,
- vector databases,
- mandatory encryption keys,
- automatic bucket migration,
- distributed key management.
