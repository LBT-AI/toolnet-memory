import type { ProjectManifest } from '../../core/types.js';

import type { RetrievalEngine } from '../../retrieval/retrieval-engine.js';

import { memorySearch } from '../../mcp/tools/memory-search.js';

import {
  skillMemorySearch,
  type SkillMemorySearchInput,
} from '../../mcp/tools/skill-memory-search.js';

export type ApiMemorySearchInput = Parameters<typeof memorySearch>[1];

export interface ApiMemorySearchResponse {
  schema: 'toolnet.api-memory-search.v1';
  results: Awaited<ReturnType<typeof memorySearch>>;
}

export async function apiMemorySearch(
  project: ProjectManifest,
  retrieval: RetrievalEngine,
  input: ApiMemorySearchInput
): Promise<ApiMemorySearchResponse> {
  const results = await memorySearch(
    {
      project,
      retrieval,
    },
    input
  );

  return {
    schema: 'toolnet.api-memory-search.v1',
    results,
  };
}

export interface ApiSkillMemorySearchResponse {
  schema: 'toolnet.api-skill-search.v1';
  result: Awaited<ReturnType<typeof skillMemorySearch>>;
}

export async function apiSkillMemorySearch(
  project: ProjectManifest,
  input: SkillMemorySearchInput
): Promise<ApiSkillMemorySearchResponse> {
  const result = await skillMemorySearch(
    {
      project,
    },
    input
  );

  return {
    schema: 'toolnet.api-skill-search.v1',
    result,
  };
}
