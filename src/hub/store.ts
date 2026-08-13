import type { ProjectManifest } from '../core/types.js';

import { MEMORY_HUB_SCOPES, type MemoryHubStateV1 } from './types.js';

const STATE_KEY = 'hub/state.v1.json';

export interface MemoryHubStorage {
  getText(key: string): Promise<string | null>;
  put(key: string, data: string | Uint8Array, contentType?: string): Promise<void>;
}

function initialState(project: ProjectManifest, ownerPrincipal: string): MemoryHubStateV1 {
  const now = new Date().toISOString();

  return {
    schema: 'toolnet.memory-hub.v1',
    version: 1,
    ownerPrincipal,
    project: {
      id: project.id,
      name: project.name,
      remote: project.remote ?? project.name,
    },
    teams: [],
    agents: [],
    acl: [
      {
        principal: ownerPrincipal,
        role: 'owner',
        scopes: [...MEMORY_HUB_SCOPES],
        createdAt: now,
        updatedAt: now,
      },
    ],
    loadouts: [],
    observability: {
      requests: 0,
      mutations: 0,
      errors: 0,
      events: [],
    },
    createdAt: now,
    updatedAt: now,
  };
}

function parseState(text: string, project: ProjectManifest): MemoryHubStateV1 {
  const value = JSON.parse(text) as Partial<MemoryHubStateV1>;

  if (
    value.schema !== 'toolnet.memory-hub.v1' ||
    value.version !== 1 ||
    !value.project ||
    value.project.id !== project.id ||
    !Array.isArray(value.teams) ||
    !Array.isArray(value.agents) ||
    !Array.isArray(value.acl) ||
    !Array.isArray(value.loadouts) ||
    !value.observability ||
    !Array.isArray(value.observability.events)
  ) {
    throw new Error('Invalid ToolNet Memory Hub state');
  }

  return value as MemoryHubStateV1;
}

export class MemoryHubStore {
  constructor(
    private readonly storage: MemoryHubStorage,
    private readonly project: ProjectManifest,
    private readonly ownerPrincipal: string
  ) {}

  async load(): Promise<MemoryHubStateV1> {
    const text = await this.storage.getText(STATE_KEY);

    if (!text) {
      const state = initialState(this.project, this.ownerPrincipal);

      await this.save(state);

      return state;
    }

    return parseState(text, this.project);
  }

  async save(state: MemoryHubStateV1): Promise<void> {
    await this.storage.put(STATE_KEY, JSON.stringify(state, null, 2), 'application/json');
  }
}
