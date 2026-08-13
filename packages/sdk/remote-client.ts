import type {
  ToolNetApiContextOffloadReadInput,
  ToolNetApiContextOffloadRead,
  ToolNetApiClientOptions,
  ToolNetApiHealth,
  ToolNetApiMemoryAsk,
  ToolNetApiMemoryAskInput,
  ToolNetApiMemorySearch,
  ToolNetApiMemorySearchInput,
  ToolNetApiProject,
  ToolNetApiSkillSearch,
  ToolNetApiSkillSearchInput,
  ToolNetApiCreateHubAgentInput,
  ToolNetApiCreateHubTeamInput,
  ToolNetApiGrantHubAclInput,
  ToolNetApiHubAcl,
  ToolNetApiHubAclGrant,
  ToolNetApiHubAclRevoke,
  ToolNetApiHubAgent,
  ToolNetApiHubAgents,
  ToolNetApiHubLoadout,
  ToolNetApiHubLoadouts,
  ToolNetApiHubObservability,
  ToolNetApiHubSummary,
  ToolNetApiHubTeam,
  ToolNetApiHubTeams,
  ToolNetApiSetHubLoadoutInput,
} from './types.js';

export class ToolNetApiClient {
  private readonly baseUrl: string;
  private readonly token?: string;
  private readonly principal?: string;
  private readonly timeoutMs: number;

  constructor(options: ToolNetApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/u, '');
    this.token = options.token;
    this.principal = options.principal;
    this.timeoutMs = options.timeoutMs ?? 10_000;
  }

  health(): Promise<ToolNetApiHealth> {
    return this.request<ToolNetApiHealth>('/v1/health');
  }

  project(): Promise<ToolNetApiProject> {
    return this.request<ToolNetApiProject>('/v1/project');
  }

  memoryAsk(input: ToolNetApiMemoryAskInput): Promise<ToolNetApiMemoryAsk> {
    return this.request<ToolNetApiMemoryAsk>('/v1/memory/ask', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  memorySearch(input: ToolNetApiMemorySearchInput): Promise<ToolNetApiMemorySearch> {
    return this.request<ToolNetApiMemorySearch>('/v1/memory/search', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  skillSearch(input: ToolNetApiSkillSearchInput): Promise<ToolNetApiSkillSearch> {
    return this.request<ToolNetApiSkillSearch>('/v1/skills/search', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  offloadRead(input: ToolNetApiContextOffloadReadInput): Promise<ToolNetApiContextOffloadRead> {
    return this.request<ToolNetApiContextOffloadRead>('/v1/offload/read', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  hub(): Promise<ToolNetApiHubSummary> {
    return this.request<ToolNetApiHubSummary>('/v1/hub');
  }

  hubTeams(): Promise<ToolNetApiHubTeams> {
    return this.request<ToolNetApiHubTeams>('/v1/hub/teams');
  }

  createHubTeam(input: ToolNetApiCreateHubTeamInput): Promise<ToolNetApiHubTeam> {
    return this.request<ToolNetApiHubTeam>('/v1/hub/teams', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  hubAgents(): Promise<ToolNetApiHubAgents> {
    return this.request<ToolNetApiHubAgents>('/v1/hub/agents');
  }

  createHubAgent(input: ToolNetApiCreateHubAgentInput): Promise<ToolNetApiHubAgent> {
    return this.request<ToolNetApiHubAgent>('/v1/hub/agents', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  hubAcl(): Promise<ToolNetApiHubAcl> {
    return this.request<ToolNetApiHubAcl>('/v1/hub/acl');
  }

  grantHubAcl(input: ToolNetApiGrantHubAclInput): Promise<ToolNetApiHubAclGrant> {
    return this.request<ToolNetApiHubAclGrant>('/v1/hub/acl/grant', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  revokeHubAcl(principal: string): Promise<ToolNetApiHubAclRevoke> {
    return this.request<ToolNetApiHubAclRevoke>('/v1/hub/acl/revoke', {
      method: 'POST',
      body: JSON.stringify({ principal }),
    });
  }

  hubLoadouts(): Promise<ToolNetApiHubLoadouts> {
    return this.request<ToolNetApiHubLoadouts>('/v1/hub/loadouts');
  }

  setHubLoadout(input: ToolNetApiSetHubLoadoutInput): Promise<ToolNetApiHubLoadout> {
    return this.request<ToolNetApiHubLoadout>('/v1/hub/loadouts', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  hubObservability(): Promise<ToolNetApiHubObservability> {
    return this.request<ToolNetApiHubObservability>('/v1/hub/observability');
  }

  protected async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, this.timeoutMs);

    try {
      const headers = new Headers(init.headers);

      headers.set('accept', 'application/json');

      if (init.body !== undefined) {
        headers.set('content-type', 'application/json');
      }

      if (this.token) {
        headers.set('authorization', `Bearer ${this.token}`);
      }

      if (this.principal) {
        headers.set('x-toolnet-principal', this.principal);
      }

      const response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers,
        signal: controller.signal,
      });

      const text = await response.text();

      const body = text ? JSON.parse(text) : null;

      if (!response.ok) {
        const message =
          body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
            ? body.error
            : `ToolNet API request failed: HTTP ${response.status}`;

        throw new Error(message);
      }

      return body as T;
    } finally {
      clearTimeout(timeout);
    }
  }
}
