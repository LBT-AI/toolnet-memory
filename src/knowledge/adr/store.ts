import type { ProjectManifest } from '../../core/types.js';

import { ADR_SCHEMA, type AdrStateV1 } from './types.js';

/**
 * Absolute logical authority key.
 *
 * The key is deliberately rooted at `projects/<projectId>/...`: that is the
 * only shape the ProjectScopedStorageProvider rewrites into the owning
 * project's physical namespace. A bare relative key would be shared by every
 * project on the same storage root, which would break project isolation.
 */
export function adrStateKey(projectId: string): string {
  return `projects/${projectId}/knowledge/adr/state.v1.json`;
}

/** Server-controlled Markdown projection prefix. Never caller supplied. */
export function adrMarkdownPrefix(projectId: string): string {
  return `projects/${projectId}/knowledge/adr/markdown/`;
}

export interface AdrStorage {
  getText(key: string): Promise<string | null>;
  put(key: string, data: string | Uint8Array, contentType?: string): Promise<void>;
}

function nowIso(): string {
  return new Date().toISOString();
}

function initialState(project: ProjectManifest): AdrStateV1 {
  const now = nowIso();

  return {
    schema: ADR_SCHEMA,
    version: 1,
    projectId: project.id,
    nextNumber: 1,
    records: [],
    history: [],
    createdAt: now,
    updatedAt: now,
  };
}

function parseState(text: string, project: ProjectManifest): AdrStateV1 {
  let value: Partial<AdrStateV1>;

  try {
    value = JSON.parse(text) as Partial<AdrStateV1>;
  } catch (error) {
    throw new Error(
      `Invalid ToolNet ADR state at ${adrStateKey(project.id)}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  if (
    value.schema !== ADR_SCHEMA ||
    value.version !== 1 ||
    value.projectId !== project.id ||
    !Array.isArray(value.records) ||
    !Array.isArray(value.history) ||
    typeof value.nextNumber !== 'number'
  ) {
    throw new Error('Invalid ToolNet ADR state');
  }

  return value as AdrStateV1;
}

/**
 * Structured, project-scoped ADR authority store.
 *
 * The store is intentionally dumb: allocation, validation, transitions and
 * idempotency live in `ArchitectureDecisionService`.
 */
export class AdrStore {
  constructor(
    private readonly storage: AdrStorage,
    private readonly project: ProjectManifest
  ) {}

  async load(): Promise<AdrStateV1> {
    const text = await this.storage.getText(adrStateKey(this.project.id));

    if (!text) {
      const state = initialState(this.project);

      await this.save(state);

      return state;
    }

    return parseState(text, this.project);
  }

  async save(state: AdrStateV1): Promise<void> {
    state.updatedAt = nowIso();

    await this.storage.put(
      adrStateKey(this.project.id),
      JSON.stringify(state, null, 2) + '\n',
      'application/json'
    );
  }

  /**
   * Deterministic Markdown projection. Stored under a fixed, server-controlled
   * prefix so a caller can never redirect the write target.
   */
  async writeMarkdown(filename: string, body: string): Promise<string> {
    const key = `${adrMarkdownPrefix(this.project.id)}${filename}`;

    await this.storage.put(key, body, 'text/markdown');

    return key;
  }
}
