import { createReadStream, createWriteStream, mkdirSync, statSync } from 'node:fs';

import { createHash } from 'node:crypto';

import { dirname } from 'node:path';

import { Readable, Transform } from 'node:stream';

import { createGunzip, createGzip } from 'node:zlib';

import { pipeline } from 'node:stream/promises';

import {
  ARTIFACT_CONTAINER_VERSION,
  ARTIFACT_MAGIC,
  ARTIFACT_SCHEMA_VERSION,
  ArtifactError,
} from './types.js';

import { resolveArtifactLimits, type ArtifactLimits } from './limits.js';

import { canonicalJson } from './serializer.js';

import { isArtifactComponentName } from './components.js';

/*
 * Phase 76 — streaming artifact container.
 *
 * Layout (all integers little-endian):
 *
 *   magic           4 bytes   "TNA1"
 *   version         1 byte    container layout version
 *   headerLength    4 bytes   uint32
 *   header          N bytes   canonical UTF-8 JSON component index
 *   payload         ...       component bytes, declared order
 *
 * The whole byte sequence is DEFLATE-compressed with gzip.
 *
 * DESIGN NOTES
 *
 * - The container carries NO paths. A component is identified by name only and
 *   is validated against the fixed component table, so `../../evil`, `/abs`,
 *   symlink entries and drive escapes are structurally impossible: there is no
 *   extraction target derived from archive data at all.
 * - Everything is written and read as a stream, so neither compression nor
 *   decompression ever materializes a whole archive in memory.
 * - Decompression bombs are bounded by declared sizes, a hard extracted-byte
 *   budget and an expansion-ratio check.
 */

export interface ArtifactArchiveHeaderComponent {
  name: string;
  schemaVersion: number;
  kind: 'required' | 'optional';
  portable: boolean;
  sha256: string;
  size: number;
}

/*
 * The container header deliberately carries NO timestamp.
 *
 * The archive bytes must be a pure function of the generation identity so that
 * publishing the same generation twice is a no-op instead of a byte conflict.
 * Creation time lives in the (mutable only until first commit) manifest.
 */
export interface ArtifactArchiveHeader {
  containerVersion: number;
  artifactSchemaVersion: number;
  generation: string;
  projectId: string;
  projectIdentity: string;
  components: ArtifactArchiveHeaderComponent[];
}

const MAGIC_BYTES = Buffer.from(ARTIFACT_MAGIC, 'ascii');

const FRAMING_BYTES = MAGIC_BYTES.length + 1 + 4;

export function encodeArtifactHeader(header: ArtifactArchiveHeader): Buffer {
  const headerBytes = Buffer.from(canonicalJson(header), 'utf8');

  const block = Buffer.allocUnsafe(FRAMING_BYTES + headerBytes.length);

  MAGIC_BYTES.copy(block, 0);
  block.writeUInt8(ARTIFACT_CONTAINER_VERSION, MAGIC_BYTES.length);
  block.writeUInt32LE(headerBytes.length, MAGIC_BYTES.length + 1);
  headerBytes.copy(block, FRAMING_BYTES);

  return block;
}

function safeHeaderForWrite(header: ArtifactArchiveHeader, limits: ArtifactLimits): Buffer {
  const block = encodeArtifactHeader(header);

  if (block.length > limits.maxManifestBytes + FRAMING_BYTES) {
    throw new ArtifactError('ARTIFACT_MANIFEST_INVALID', 'Artifact header exceeds the limit.');
  }

  return block;
}

function isBuffer(value: unknown): value is Buffer {
  return Buffer.isBuffer(value);
}

/**
 * Small sequential exact-length reader over an async byte stream.
 *
 * Only the head of the stream is buffered: `readExact` consumes and releases
 * chunks as it goes, so peak memory is bounded by the largest component rather
 * than by the whole archive.
 */
class ByteReader {
  private readonly chunks: Buffer[] = [];

  private buffered = 0;

  private ended = false;

  private consumed = 0;

  constructor(
    private readonly iterator: AsyncIterator<Buffer>,
    private readonly maxBytes: number
  ) {}

  get bytesConsumed(): number {
    return this.consumed;
  }

  private async ensure(target: number): Promise<void> {
    while (this.buffered < target && !this.ended) {
      const next = await this.iterator.next();

      if (next.done) {
        this.ended = true;
        break;
      }

      const chunk = isBuffer(next.value) ? next.value : Buffer.from(next.value as Uint8Array);

      this.consumed += chunk.length;

      if (this.consumed > this.maxBytes) {
        throw new ArtifactError(
          'ARTIFACT_DECOMPRESSION_LIMIT',
          'Artifact payload exceeds the decompression budget.'
        );
      }

      if (chunk.length > 0) {
        this.chunks.push(chunk);
        this.buffered += chunk.length;
      }
    }
  }

  async readExact(length: number): Promise<Buffer> {
    if (length === 0) {
      return Buffer.alloc(0);
    }

    await this.ensure(length);

    if (this.buffered < length) {
      throw new ArtifactError(
        'ARTIFACT_TRUNCATED',
        'Artifact payload ended before it was complete.'
      );
    }

    const output = Buffer.allocUnsafe(length);

    let offset = 0;

    while (offset < length) {
      const head = this.chunks[0]!;

      const take = Math.min(head.length, length - offset);

      head.copy(output, offset, 0, take);
      offset += take;

      if (take === head.length) {
        this.chunks.shift();
      } else {
        this.chunks[0] = head.subarray(take);
      }
    }

    this.buffered -= length;

    return output;
  }

  async readRemaining(): Promise<Buffer> {
    const collected: Buffer[] = [...this.chunks.splice(0)];

    let size = collected.reduce((total, chunk) => total + chunk.length, 0);

    while (!this.ended) {
      const next = await this.iterator.next();

      if (next.done) {
        this.ended = true;
        break;
      }

      const chunk = isBuffer(next.value) ? next.value : Buffer.from(next.value as Uint8Array);

      this.consumed += chunk.length;

      if (this.consumed > this.maxBytes) {
        throw new ArtifactError(
          'ARTIFACT_DECOMPRESSION_LIMIT',
          'Artifact payload exceeds the decompression budget.'
        );
      }

      collected.push(chunk);
      size += chunk.length;
    }

    this.buffered = 0;

    return Buffer.concat(collected, size);
  }
}

export interface ArtifactArchiveWriteInput {
  destination: string;
  header: ArtifactArchiveHeader;
  payload: readonly { data: Uint8Array }[];
  limits?: Partial<ArtifactLimits>;
}

export interface ArtifactArchiveWriteResult {
  sha256: string;
  bytes: number;
  extractedBytes: number;
}

/**
 * Stream an artifact archive to `destination` and return the hash of the
 * compressed bytes that were actually written.
 */
export async function writeArtifactArchive(
  input: ArtifactArchiveWriteInput
): Promise<ArtifactArchiveWriteResult> {
  const limits = resolveArtifactLimits(input.limits);

  const extractedBytes = input.payload.reduce((total, item) => total + item.data.byteLength, 0);

  if (extractedBytes > limits.maxExtractedBytes) {
    throw new ArtifactError(
      'ARTIFACT_COMPONENT_TOO_LARGE',
      'Artifact payload exceeds the configured extracted-byte limit.'
    );
  }

  const headerBlock = safeHeaderForWrite(input.header, limits);

  mkdirSync(dirname(input.destination), { recursive: true });

  const hash = createHash('sha256');

  let bytes = 0;

  const source = Readable.from(
    (async function* stream(): AsyncGenerator<Buffer> {
      yield headerBlock;
      for (const item of input.payload) {
        yield Buffer.from(item.data);
      }
    })()
  );

  const meter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      bytes += chunk.length;

      if (bytes > limits.maxArtifactBytes) {
        callback(
          new ArtifactError('ARTIFACT_TOO_LARGE', 'Artifact exceeds the configured size limit.')
        );
        return;
      }

      hash.update(chunk);
      callback(null, chunk);
    },
  });

  await pipeline(source, createGzip({ level: 6 }), meter, createWriteStream(input.destination));

  return {
    sha256: hash.digest('hex'),
    bytes,
    extractedBytes,
  };
}

export interface ArtifactArchiveReadInput {
  source: string;
  expectedSha256?: string;
  limits?: Partial<ArtifactLimits>;
}

export interface ArtifactArchiveReadResult {
  header: ArtifactArchiveHeader;
  components: Map<string, Uint8Array>;
  sha256: string;
  compressedBytes: number;
  extractedBytes: number;
}

function validateHeader(header: unknown, limits: ArtifactLimits): ArtifactArchiveHeader {
  if (!header || typeof header !== 'object' || Array.isArray(header)) {
    throw new ArtifactError('ARTIFACT_MANIFEST_INVALID', 'Artifact header is not an object.');
  }

  const value = header as ArtifactArchiveHeader;

  if (value.containerVersion !== ARTIFACT_CONTAINER_VERSION) {
    throw new ArtifactError(
      'ARTIFACT_CONTAINER_UNSUPPORTED',
      `Unsupported artifact container version: ${String(value.containerVersion)}`
    );
  }

  if (
    typeof value.generation !== 'string' ||
    typeof value.projectId !== 'string' ||
    typeof value.artifactSchemaVersion !== 'number'
  ) {
    throw new ArtifactError(
      'ARTIFACT_MANIFEST_INVALID',
      'Artifact header is missing identity fields.'
    );
  }

  if (!Array.isArray(value.components) || value.components.length === 0) {
    throw new ArtifactError('ARTIFACT_MANIFEST_INVALID', 'Artifact header has no components.');
  }

  if (value.components.length > limits.maxComponents) {
    throw new ArtifactError('ARTIFACT_MANIFEST_INVALID', 'Artifact declares too many components.');
  }

  const seen = new Set<string>();

  let declaredTotal = 0;

  for (const component of value.components) {
    if (
      !component ||
      typeof component !== 'object' ||
      typeof component.name !== 'string' ||
      typeof component.size !== 'number' ||
      typeof component.sha256 !== 'string'
    ) {
      throw new ArtifactError('ARTIFACT_MANIFEST_INVALID', 'Artifact component entry is invalid.');
    }

    /*
     * Component identity is name-only and must belong to the fixed component
     * table. There is no path in the container, so `../`, absolute paths and
     * symlink-style entries are rejected as unknown component names.
     */
    if (!isArtifactComponentName(component.name)) {
      throw new ArtifactError(
        'ARTIFACT_COMPONENT_INVALID',
        `Artifact declares an unknown component: ${component.name}`
      );
    }

    if (seen.has(component.name)) {
      throw new ArtifactError(
        'ARTIFACT_COMPONENT_INVALID',
        `Artifact declares a duplicate component: ${component.name}`
      );
    }

    seen.add(component.name);

    if (!Number.isSafeInteger(component.size) || component.size < 0) {
      throw new ArtifactError(
        'ARTIFACT_COMPONENT_INVALID',
        `Artifact component ${component.name} declares an invalid size.`
      );
    }

    if (component.size > limits.maxComponentBytes) {
      throw new ArtifactError(
        'ARTIFACT_COMPONENT_TOO_LARGE',
        `Artifact component ${component.name} exceeds the component size limit.`
      );
    }

    declaredTotal += component.size;
  }

  if (declaredTotal > limits.maxExtractedBytes) {
    throw new ArtifactError(
      'ARTIFACT_DECOMPRESSION_LIMIT',
      'Artifact declares more extracted bytes than the budget allows.'
    );
  }

  return value;
}

/**
 * Read, hash and verify an artifact archive without ever writing to the
 * filesystem: every component is returned as verified bytes.
 */
export async function readArtifactArchive(
  input: ArtifactArchiveReadInput
): Promise<ArtifactArchiveReadResult> {
  const limits = resolveArtifactLimits(input.limits);

  /*
   * Reject an oversized archive before reading a single byte of it, so the
   * failure is deterministic and no stream is left in flight.
   */
  const sizeOnDisk = statSync(input.source).size;

  if (sizeOnDisk > limits.maxArtifactBytes) {
    throw new ArtifactError('ARTIFACT_TOO_LARGE', 'Artifact exceeds the configured size limit.');
  }

  const hash = createHash('sha256');

  let compressedBytes = 0;

  const file = createReadStream(input.source);

  const compressedMeter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      compressedBytes += chunk.length;

      if (compressedBytes > limits.maxArtifactBytes) {
        file.destroy();
        callback(
          new ArtifactError('ARTIFACT_TOO_LARGE', 'Artifact exceeds the configured size limit.')
        );
        return;
      }

      hash.update(chunk);
      callback(null, chunk);
    },
  });

  const gunzip = createGunzip({
    maxOutputLength: limits.maxExtractedBytes,
  });

  const gunzipErrors: unknown[] = [];

  /*
   * Every stream error is surfaced through the async iterator below. Attaching
   * no-op handlers keeps a rejected stream from becoming an unhandled 'error'
   * event while still propagating the failure to the reader.
   */
  file.on('error', () => {});
  compressedMeter.on('error', () => {});

  gunzip.on('error', (error: unknown) => {
    gunzipErrors.push(error);
  });

  file.pipe(compressedMeter).pipe(gunzip);

  const iterator = gunzip[Symbol.asyncIterator]();

  const reader = new ByteReader(iterator as AsyncIterator<Buffer>, limits.maxExtractedBytes);

  try {
    const framing = await reader.readExact(FRAMING_BYTES);

    if (!framing.subarray(0, MAGIC_BYTES.length).equals(MAGIC_BYTES)) {
      throw new ArtifactError('ARTIFACT_MANIFEST_INVALID', 'Artifact magic header is invalid.');
    }

    const containerVersion = framing.readUInt8(MAGIC_BYTES.length);

    if (containerVersion !== ARTIFACT_CONTAINER_VERSION) {
      throw new ArtifactError(
        'ARTIFACT_CONTAINER_UNSUPPORTED',
        `Unsupported artifact container version: ${containerVersion}`
      );
    }

    const headerLength = framing.readUInt32LE(MAGIC_BYTES.length + 1);

    if (headerLength === 0 || headerLength > limits.maxManifestBytes) {
      throw new ArtifactError('ARTIFACT_MANIFEST_INVALID', 'Artifact header length is invalid.');
    }

    const headerBytes = await reader.readExact(headerLength);

    let parsedHeader: unknown;

    try {
      parsedHeader = JSON.parse(headerBytes.toString('utf8'));
    } catch {
      throw new ArtifactError('ARTIFACT_MANIFEST_INVALID', 'Artifact header is not valid JSON.');
    }

    const header = validateHeader(parsedHeader, limits);

    const components = new Map<string, Uint8Array>();

    for (const component of header.components) {
      const data = await reader.readExact(component.size);

      const digest = createHash('sha256').update(data).digest('hex');

      if (digest !== component.sha256) {
        throw new ArtifactError(
          'ARTIFACT_COMPONENT_HASH_MISMATCH',
          `Artifact component ${component.name} failed its integrity check.`
        );
      }

      components.set(component.name, new Uint8Array(data));
    }

    const trailing = await reader.readRemaining();

    if (trailing.length > 0) {
      throw new ArtifactError(
        'ARTIFACT_MANIFEST_INVALID',
        'Artifact contains unexpected trailing data.'
      );
    }

    const extractedBytes = reader.bytesConsumed;

    if (
      compressedBytes > 0 &&
      extractedBytes > compressedBytes * limits.maxCompressionRatio &&
      extractedBytes > 1024 * 1024
    ) {
      throw new ArtifactError(
        'ARTIFACT_DECOMPRESSION_LIMIT',
        'Artifact expansion ratio exceeds the accepted limit.'
      );
    }

    const sha256 = hash.digest('hex');

    if (input.expectedSha256 && input.expectedSha256 !== sha256) {
      throw new ArtifactError('ARTIFACT_HASH_MISMATCH', 'Artifact integrity check failed.');
    }

    return {
      header,
      components,
      sha256,
      compressedBytes,
      extractedBytes,
    };
  } catch (error) {
    if (error instanceof ArtifactError) {
      throw error;
    }

    /*
     * zlib reports a decompression-bomb breach as a stream error; surface it as
     * a deterministic artifact reason code instead of a raw zlib message.
     */
    if (gunzipErrors.length > 0) {
      throw new ArtifactError(
        'ARTIFACT_DECOMPRESSION_LIMIT',
        'Artifact could not be decompressed within the configured limits.'
      );
    }

    throw new ArtifactError(
      'ARTIFACT_IO_ERROR',
      error instanceof Error ? error.message : 'Artifact archive could not be read.'
    );
  } finally {
    file.destroy();
    compressedMeter.destroy();
    gunzip.destroy();
  }
}

/** The artifact schema version recorded by the current runtime. */
export function currentArtifactSchemaVersion(): number {
  return ARTIFACT_SCHEMA_VERSION;
}
