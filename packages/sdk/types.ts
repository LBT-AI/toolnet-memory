export interface ToolNetApiClientOptions {
  baseUrl: string;
  token?: string;
  timeoutMs?: number;
}

export interface ToolNetApiHealth {
  ok: true;
  service: 'toolnet-memory';
  schema: 'toolnet.api-health.v1';
  project: {
    id: string;
    name: string;
    remote: string;
  };
}

export interface ToolNetApiProject {
  schema: 'toolnet.api-project.v1';
  project: {
    id: string;
    name: string;
    remote: string;
    graphVersion: number;
    memoryVersion: number;
    createdAt: string;
    updatedAt: string;
  };
}

export interface ToolNetApiMemoryAskInput {
  question: string;
  mode?: 'ai' | 'local';
}

export interface ToolNetApiMemoryAsk {
  schema: 'toolnet.api-memory-ask.v1';
  result: {
    answer: string;
    mode: 'ai' | 'local';
    usedAi: boolean;
    source?: string;
    intent?: string;
    provider?: string;
    model?: string;
  };
}

export interface ToolNetApiMemorySearchInput {
  query: string;
  limit?: number;
}

export interface ToolNetApiMemorySearchResult {
  id: string;
  type: 'code' | 'activity' | 'decision' | 'rule' | 'todo' | 'summary';
  content: string;
  importance: 'critical' | 'high' | 'normal' | 'temporary';
  score: number;
  tags: string[];
}

export interface ToolNetApiMemorySearch {
  schema: 'toolnet.api-memory-search.v1';
  results: ToolNetApiMemorySearchResult[];
}

export interface ToolNetApiSkillSearchInput {
  query: string;
  limit?: number;
}

export interface ToolNetApiSkillSource {
  agent: string;
  nativeSessionId: string;
  sessionKey: string;
  firstSequence: number;
  lastSequence: number;
  eventIds: string[];
}

export interface ToolNetApiSkillSearchMatch {
  id: string;
  title: string;
  task: string;
  summary: string;
  steps: string[];
  verification: string[];
  files: string[];
  source: ToolNetApiSkillSource;
  createdAt: string;
  score: number;
}

export interface ToolNetApiSkillSearch {
  schema: 'toolnet.api-skill-search.v1';
  result: {
    schema: 'toolnet.skill-memory-search.v1';
    query: string;
    count: number;
    matches: ToolNetApiSkillSearchMatch[];
  };
}

export interface ToolNetApiContextOffloadReadInput {
  assetId: string;
  maxChars?: number;
}

export interface ToolNetApiContextOffloadRead {
  schema: 'toolnet.api-context-offload.v1';
  result: {
    assetId: string;
    kind: string;
    bytes: number;
    truncated: boolean;
    content: string;
  };
}
