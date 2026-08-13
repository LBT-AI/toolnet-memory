export const MEMORY_HUB_SCOPES = [
  'hub:read',
  'teams:write',
  'agents:write',
  'acl:manage',
  'loadouts:write',
  'observability:read',
] as const;

export type MemoryHubScope = (typeof MEMORY_HUB_SCOPES)[number];

export type MemoryHubRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface MemoryHubProject {
  id: string;
  name: string;
  remote: string;
}

export interface MemoryHubTeam {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryHubAgent {
  id: string;
  name: string;
  kind?: string;
  teamIds: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryHubAclGrant {
  principal: string;
  role: MemoryHubRole;
  scopes: MemoryHubScope[];
  createdAt: string;
  updatedAt: string;
}

export interface MemoryHubAgentLoadout {
  agentId: string;
  tools: string[];
  memoryMode: 'local' | 'ai';
  skillMemory: boolean;
  contextOffload: boolean;
  maxContextChars: number;
  updatedAt: string;
}

export interface MemoryHubEvent {
  id: string;
  kind: 'request' | 'mutation';
  action: string;
  principal: string;
  ok: boolean;
  statusCode?: number;
  durationMs?: number;
  timestamp: string;
}

export interface MemoryHubObservability {
  requests: number;
  mutations: number;
  errors: number;
  lastActivityAt?: string;
  events: MemoryHubEvent[];
}

export interface MemoryHubStateV1 {
  schema: 'toolnet.memory-hub.v1';
  version: 1;
  ownerPrincipal: string;
  project: MemoryHubProject;
  teams: MemoryHubTeam[];
  agents: MemoryHubAgent[];
  acl: MemoryHubAclGrant[];
  loadouts: MemoryHubAgentLoadout[];
  observability: MemoryHubObservability;
  createdAt: string;
  updatedAt: string;
}
