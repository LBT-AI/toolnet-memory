export interface ToolNetApiClientOptions {
  baseUrl: string;
  token?: string;
  principal?: string;
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

export type ToolNetHubRole = 'owner' | 'admin' | 'member' | 'viewer';

export type ToolNetHubScope =
  | 'hub:read'
  | 'teams:write'
  | 'agents:write'
  | 'acl:manage'
  | 'loadouts:write'
  | 'observability:read'
  | 'wiki:read'
  | 'wiki:write';

export interface ToolNetHubTeam {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ToolNetHubAgent {
  id: string;
  name: string;
  kind?: string;
  teamIds: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ToolNetHubAclGrant {
  principal: string;
  role: ToolNetHubRole;
  scopes: ToolNetHubScope[];
  createdAt: string;
  updatedAt: string;
}

export interface ToolNetHubLoadout {
  agentId: string;
  tools: string[];
  memoryMode: 'local' | 'ai';
  skillMemory: boolean;
  contextOffload: boolean;
  maxContextChars: number;
  updatedAt: string;
}

export interface ToolNetHubEvent {
  id: string;
  kind: 'request' | 'mutation';
  action: string;
  principal: string;
  ok: boolean;
  statusCode?: number;
  durationMs?: number;
  timestamp: string;
}

export interface ToolNetApiHubSummary {
  schema: 'toolnet.api-hub-summary.v1';
  hub: {
    schema: 'toolnet.memory-hub.v1';
    project: {
      id: string;
      name: string;
      remote: string;
    };
    teams: number;
    agents: number;
    aclGrants: number;
    loadouts: number;
    updatedAt: string;
  };
}

export interface ToolNetApiHubTeams {
  schema: 'toolnet.api-hub-teams.v1';
  teams: ToolNetHubTeam[];
}

export interface ToolNetApiCreateHubTeamInput {
  id?: string;
  name: string;
  description?: string;
}

export interface ToolNetApiHubTeam {
  schema: 'toolnet.api-hub-team.v1';
  team: ToolNetHubTeam;
}

export interface ToolNetApiHubAgents {
  schema: 'toolnet.api-hub-agents.v1';
  agents: ToolNetHubAgent[];
}

export interface ToolNetApiCreateHubAgentInput {
  id?: string;
  name: string;
  kind?: string;
  teamIds?: string[];
  metadata?: Record<string, unknown>;
}

export interface ToolNetApiHubAgent {
  schema: 'toolnet.api-hub-agent.v1';
  agent: ToolNetHubAgent;
}

export interface ToolNetApiHubAcl {
  schema: 'toolnet.api-hub-acl.v1';
  grants: ToolNetHubAclGrant[];
}

export interface ToolNetApiGrantHubAclInput {
  principal: string;
  role: ToolNetHubRole;
  scopes?: ToolNetHubScope[];
}

export interface ToolNetApiHubAclGrant {
  schema: 'toolnet.api-hub-acl-grant.v1';
  grant: ToolNetHubAclGrant;
}

export interface ToolNetApiHubAclRevoke {
  schema: 'toolnet.api-hub-acl-revoke.v1';
  principal: string;
  revoked: true;
}

export interface ToolNetApiHubLoadouts {
  schema: 'toolnet.api-hub-loadouts.v1';
  loadouts: ToolNetHubLoadout[];
}

export interface ToolNetApiSetHubLoadoutInput {
  agentId: string;
  tools?: string[];
  memoryMode?: 'local' | 'ai';
  skillMemory?: boolean;
  contextOffload?: boolean;
  maxContextChars?: number;
}

export interface ToolNetApiHubLoadout {
  schema: 'toolnet.api-hub-loadout.v1';
  loadout: ToolNetHubLoadout;
}

export interface ToolNetApiHubObservability {
  schema: 'toolnet.api-hub-observability.v1';
  observability: {
    requests: number;
    mutations: number;
    errors: number;
    lastActivityAt?: string;
    events: ToolNetHubEvent[];
  };
}

export interface ToolNetWikiPage {
  id: string;
  slug: string;
  title: string;
  summary?: string;
  content: string;
  tags: string[];
  links: string[];
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface ToolNetWikiRevision {
  id: string;
  pageId: string;
  slug: string;
  revision: number;
  title: string;
  summary?: string;
  content: string;
  tags: string[];
  links: string[];
  createdAt: string;
}

export interface ToolNetWikiSearchResult {
  page: ToolNetWikiPage;
  score: number;
}

export interface ToolNetApiWikiSummary {
  schema: 'toolnet.api-wiki-summary.v1';
  wiki: {
    schema: 'toolnet.wiki-summary.v1';
    projectId: string;
    pages: number;
    revisions: number;
    tags: string[];
    links: number;
    orphanPages: number;
    automatedPages: number;
    updatedAt: string;
  };
}

export interface ToolNetApiWikiPages {
  schema: 'toolnet.api-wiki-pages.v1';
  pages: ToolNetWikiPage[];
}

export interface ToolNetApiWikiPage {
  schema: 'toolnet.api-wiki-page.v1';
  page: ToolNetWikiPage;
}

export interface ToolNetApiCreateWikiPageInput {
  slug?: string;
  title: string;
  summary?: string;
  content: string;
  tags?: string[];
}

export interface ToolNetApiUpdateWikiPageInput {
  title?: string;
  summary?: string;
  content?: string;
  tags?: string[];
}

export interface ToolNetApiWikiSearch {
  schema: 'toolnet.api-wiki-search.v1';
  query: string;
  results: ToolNetWikiSearchResult[];
}

export interface ToolNetApiWikiHistory {
  schema: 'toolnet.api-wiki-history.v1';
  revisions: ToolNetWikiRevision[];
}

export interface ToolNetApiWikiBacklinks {
  schema: 'toolnet.api-wiki-backlinks.v1';
  pages: ToolNetWikiPage[];
}
