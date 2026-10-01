import type { ProjectManifest } from '../core/types.js';

import type { WikiStateV1 } from './types.js';

import {
  classifyWikiState,
  migrateWikiState,
  WIKI_SCHEMA,
  WIKI_SCHEMA_VERSION,
  wikiInitialState,
  wikiStateToError,
  type WikiStateClassification,
} from './state.js';

const STATE_KEY = 'wiki/state.v1.json';

const PENDING_KEY = 'wiki/state.v1.json.pending';

export interface WikiStorage {
  getText(key: string): Promise<string | null>;
  put(key: string, data: string | Uint8Array, contentType?: string): Promise<void>;
}

/**
 * Phase 86E WikiStore.
 *
 * Contract:
 *
 * - `readState()` / `load()` are PURE. Reading a Wiki never writes. A missing
 *   state file is a valid unused subsystem, not corruption, and never
 *   materialises an empty file on disk.
 * - The first real mutation persists the state, so a Wiki the user has never
 *   touched leaves no file behind.
 * - `save()` validates before writing, so a broken in-memory state can never
 *   replace a valid on-disk one.
 * - A state owned by another project, a future schema version, or a corrupt
 *   file is reported with a typed error and left untouched.
 */
export class WikiStore {
  constructor(
    private readonly storage: WikiStorage,
    private readonly project: ProjectManifest
  ) {}

  get key(): string {
    return STATE_KEY;
  }

  /** Content-free classification. Never writes. */
  async readState(): Promise<WikiStateClassification> {
    return classifyWikiState(await this.storage.getText(STATE_KEY), this.project.id);
  }

  /**
   * Load the current state. Returns the in-memory empty state when the Wiki
   * has never been used; throws a typed error for mismatch/corruption.
   */
  async load(): Promise<WikiStateV1> {
    const classification = await this.readState();

    if (classification.status === 'missing') {
      return wikiInitialState(this.project.id);
    }

    const error = wikiStateToError(classification);

    if (error) {
      throw error;
    }

    if (classification.status === 'current' || classification.status === 'empty') {
      return classification.state;
    }

    throw wikiStateToError(classification) ?? new Error('Unreachable Wiki state classification');
  }

  async save(state: WikiStateV1): Promise<void> {
    if (state.schema !== WIKI_SCHEMA || state.version !== WIKI_SCHEMA_VERSION) {
      throw new Error('Refusing to persist an unsupported Wiki schema');
    }

    if (state.projectId !== this.project.id) {
      throw new Error('Refusing to persist Wiki state for a different project');
    }

    /*
     * Atomic-ish publish: stage the payload, verify it, then publish. With the
     * provider contract (single put) a crash before the final put leaves the
     * previous, valid state in place; a half-written publish is classified as
     * corrupt and never silently overwritten.
     */
    const payload = JSON.stringify(state, null, 2);

    await this.storage.put(PENDING_KEY, payload, 'application/json');

    const staged = await this.storage.getText(PENDING_KEY);

    if (staged !== payload) {
      throw new Error('Wiki state staging verification failed');
    }

    await this.storage.put(STATE_KEY, payload, 'application/json');
  }

  /**
   * Migrate the stored state into the current schema. Unsupported or future
   * versions throw; the original payload is never rewritten.
   */
  async migrate(): Promise<{ migrated: boolean; fromVersion: number }> {
    const text = await this.storage.getText(STATE_KEY);

    if (!text) {
      return { migrated: false, fromVersion: WIKI_SCHEMA_VERSION };
    }

    const { state, migrated, fromVersion } = migrateWikiState(text, this.project.id);

    if (migrated) {
      await this.save(state);
    }

    return { migrated, fromVersion };
  }
}
