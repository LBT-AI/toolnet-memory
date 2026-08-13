import type { ProjectManifest } from '../../core/types.js';

import { memoryAgentAsk, type MemoryAgentAskInput } from '../../mcp/tools/memory-agent-ask.js';

import {
  contextOffloadRead,
  type ContextOffloadReadInput,
} from '../../mcp/tools/context-offload-read.js';

export interface ApiMemoryAskResponse {
  schema: 'toolnet.api-memory-ask.v1';
  result: Awaited<ReturnType<typeof memoryAgentAsk>>;
}

export async function apiMemoryAsk(
  project: ProjectManifest,
  input: MemoryAgentAskInput
): Promise<ApiMemoryAskResponse> {
  const result = await memoryAgentAsk(
    {
      project,
    },
    input
  );

  return {
    schema: 'toolnet.api-memory-ask.v1',
    result,
  };
}

export interface ApiContextOffloadReadResponse {
  schema: 'toolnet.api-context-offload.v1';
  result: Awaited<ReturnType<typeof contextOffloadRead>>;
}

export async function apiContextOffloadRead(
  project: ProjectManifest,
  input: ContextOffloadReadInput
): Promise<ApiContextOffloadReadResponse> {
  const result = await contextOffloadRead(
    {
      project,
    },
    input
  );

  return {
    schema: 'toolnet.api-context-offload.v1',
    result,
  };
}
