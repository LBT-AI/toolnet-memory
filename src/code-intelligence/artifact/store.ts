import type { StorageProvider } from '../../storage/types.js';

import {
  ArtifactError,
  type ArtifactCurrentPointer,
  type CodeIntelligenceArtifactManifest,
} from './types.js';

import { canonicalJson, canonicalJsonPretty } from './serializer.js';

import { sha256Hex } from './integrity.js';

const GENERATION_PATTERN = /^gen-[0-9a-f]{32}$/u;

/**
 * How a generation is stored. Immutable once written.
 *
 *   projects/<projectId>/graph/artifacts/current.json
 *   projects/<projectId>/graph/artifacts/generations/<generation>/manifest.json
 *   projects/<projectId>/graph/artifacts/generations/<generation>/artifact.tgz
 *   projects/<projectId>/graph/artifacts/generations/<generation>/artifact.sha256
 *
 * The store is deliberately dumb: it reads and writes bytes. Fingerprinting,
 * validation and compatibility live in the surrounding modules.
 */
export class CodeIntelligenceArtifactStore {
  constructor(
    private readonly storage: StorageProvider,
    private readonly projectId: string
  ) {}

  private base(): string {
    return `projects/${this.projectId}/graph/artifacts`;
  }

  currentKey(): string {
    return `${this.base()}/current.json`;
  }

  /**
   * Local operation journal for diagnostics only.
   *
   * Deliberately NOT an artifact component: it records what this machine last
   * did, is never shipped, and is never read by adoption logic.
   */
  localStatusKey(): string {
    return `${this.base()}/local-status.json`;
  }

  generationsPrefix(): string {
    return `${this.base()}/generations/`;
  }

  generationPrefix(generation: string): string {
    assertGeneration(generation);
    return `${this.generationsPrefix()}${generation}/`;
  }

  manifestKey(generation: string): string {
    return `${this.generationPrefix(generation)}manifest.json`;
  }

  artifactKey(generation: string): string {
    return `${this.generationPrefix(generation)}artifact.tgz`;
  }

  artifactHashKey(generation: string): string {
    return `${this.generationPrefix(generation)}artifact.sha256`;
  }

  async getCurrent(): Promise<ArtifactCurrentPointer | null> {
    const text = await this.storage.getText(this.currentKey());

    if (!text) {
      return null;
    }

    try {
      const parsed = JSON.parse(text) as ArtifactCurrentPointer;
      if (typeof parsed.generation !== 'string' || !GENERATION_PATTERN.test(parsed.generation)) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  /**
   * Update the current pointer. Always the LAST step of a publish: a partial
   * upload must leave the previous generation current.
   */
  async setCurrent(pointer: ArtifactCurrentPointer): Promise<void> {
    assertGeneration(pointer.generation);

    await this.storage.put(this.currentKey(), canonicalJsonPretty(pointer), 'application/json');
  }

  async getGenerationManifest(
    generation: string
  ): Promise<CodeIntelligenceArtifactManifest | null> {
    const text = await this.storage.getText(this.manifestKey(generation));

    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text) as CodeIntelligenceArtifactManifest;
    } catch {
      return null;
    }
  }

  async getArtifactBytes(generation: string): Promise<Uint8Array | null> {
    return this.storage.get(this.artifactKey(generation));
  }

  async exists(generation: string): Promise<boolean> {
    return this.storage.exists(this.manifestKey(generation));
  }

  /** Read the local diagnostics journal (never part of an artifact). */
  async readLocalStatus<T>(): Promise<T | null> {
    try {
      const text = await this.storage.getText(this.localStatusKey());
      return text ? (JSON.parse(text) as T) : null;
    } catch {
      return null;
    }
  }

  async writeLocalStatus(value: unknown): Promise<void> {
    try {
      await this.storage.put(this.localStatusKey(), canonicalJson(value), 'application/json');
    } catch {
      /* Diagnostics only: never fail an operation because of journaling. */
    }
  }

  async listGenerations(): Promise<string[]> {
    let objects: Array<{ key: string }> = [];

    try {
      objects = await this.storage.list(this.generationsPrefix());
    } catch {
      return [];
    }

    const generations = new Set<string>();

    for (const object of objects) {
      const match = /generations\/(gen-[0-9a-f]{32})\//u.exec(object.key);
      if (match) {
        generations.add(match[1]!);
      }
    }

    return [...generations].sort();
  }

  /**
   * Write an immutable generation.
   *
   * The archive is written first and the manifest last, so a generation is only
   * visible once its bytes are durable. Re-writing identical bytes is a no-op;
   * different bytes for the same generation id are a hard conflict and are
   * never silently overwritten.
   */
  async putGeneration(
    manifest: CodeIntelligenceArtifactManifest,
    archive: Uint8Array
  ): Promise<'created' | 'unchanged'> {
    const generation = manifest.generation;

    assertGeneration(generation);

    const existing = await this.getGenerationManifest(generation);

    if (existing) {
      if (existing.integrity.artifactHash !== manifest.integrity.artifactHash) {
        throw new ArtifactError(
          'ARTIFACT_GENERATION_CONFLICT',
          `Generation ${generation} already exists with different bytes.`
        );
      }

      return 'unchanged';
    }

    await this.storage.put(this.artifactKey(generation), archive, 'application/gzip');

    await this.storage.put(
      this.artifactHashKey(generation),
      `${manifest.integrity.artifactHash}\n`,
      'text/plain'
    );

    await this.storage.put(
      this.manifestKey(generation),
      canonicalJsonPretty(manifest),
      'application/json'
    );

    return 'created';
  }

  /** Read back a generation and re-verify it end to end. */
  async verifyGeneration(
    generation: string
  ): Promise<{ manifest: CodeIntelligenceArtifactManifest; bytes: Uint8Array }> {
    const manifest = await this.getGenerationManifest(generation);

    if (!manifest) {
      throw new ArtifactError(
        'ARTIFACT_MANIFEST_MISSING',
        `Artifact generation ${generation} has no manifest.`
      );
    }

    const bytes = await this.getArtifactBytes(generation);

    if (!bytes) {
      throw new ArtifactError(
        'ARTIFACT_NOT_FOUND',
        `Artifact generation ${generation} has no archive.`
      );
    }

    if (sha256Hex(bytes) !== manifest.integrity.artifactHash) {
      throw new ArtifactError(
        'ARTIFACT_HASH_MISMATCH',
        `Artifact generation ${generation} failed verification.`
      );
    }

    const recorded = await this.storage.getText(this.artifactHashKey(generation));

    if (recorded && recorded.trim() !== manifest.integrity.artifactHash) {
      throw new ArtifactError(
        'ARTIFACT_HASH_MISMATCH',
        `Artifact generation ${generation} recorded hash does not match its manifest.`
      );
    }

    return { manifest, bytes };
  }

  async deleteGeneration(generation: string): Promise<number> {
    const prefix = this.generationPrefix(generation);

    let objects: Array<{ key: string }> = [];

    try {
      objects = await this.storage.list(prefix);
    } catch {
      return 0;
    }

    let deleted = 0;

    for (const object of objects) {
      await this.storage.delete(object.key);
      deleted += 1;
    }

    return deleted;
  }
}

function assertGeneration(generation: string): void {
  if (!GENERATION_PATTERN.test(generation)) {
    throw new ArtifactError('ARTIFACT_MANIFEST_INVALID', 'Invalid artifact generation identity.');
  }
}

/** Canonical manifest hash: the integrity block is excluded. */
export function computeManifestHash(
  manifest: Omit<CodeIntelligenceArtifactManifest, 'integrity'> | CodeIntelligenceArtifactManifest
): string {
  const body = { ...manifest } as Record<string, unknown>;

  delete body.integrity;

  return sha256Hex(canonicalJson(body));
}
