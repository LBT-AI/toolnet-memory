import type { ProjectManifest } from '../core/types.js';

import type { WikiStateV1 } from './types.js';

const STATE_KEY = 'wiki/state.v1.json';

export interface WikiStorage {
  getText(key: string): Promise<string | null>;
  put(key: string, data: string | Uint8Array, contentType?: string): Promise<void>;
}

function initialState(project: ProjectManifest): WikiStateV1 {
  const now = new Date().toISOString();

  return {
    schema: 'toolnet.wiki.v1',
    version: 1,
    projectId: project.id,
    pages: [],
    revisions: [],
    createdAt: now,
    updatedAt: now,
  };
}

function parseState(text: string, project: ProjectManifest): WikiStateV1 {
  const value = JSON.parse(text) as Partial<WikiStateV1>;

  if (
    value.schema !== 'toolnet.wiki.v1' ||
    value.version !== 1 ||
    value.projectId !== project.id ||
    !Array.isArray(value.pages) ||
    !Array.isArray(value.revisions)
  ) {
    throw new Error('Invalid ToolNet Wiki state');
  }

  return value as WikiStateV1;
}

export class WikiStore {
  constructor(
    private readonly storage: WikiStorage,
    private readonly project: ProjectManifest
  ) {}

  async load(): Promise<WikiStateV1> {
    const text = await this.storage.getText(STATE_KEY);

    if (!text) {
      const state = initialState(this.project);

      await this.save(state);

      return state;
    }

    return parseState(text, this.project);
  }

  async save(state: WikiStateV1): Promise<void> {
    await this.storage.put(STATE_KEY, JSON.stringify(state, null, 2), 'application/json');
  }
}
