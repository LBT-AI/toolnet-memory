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
  ToolNetApiCreateWikiPageInput,
  ToolNetApiUpdateWikiPageInput,
  ToolNetApiWikiBacklinks,
  ToolNetApiWikiHistory,
  ToolNetApiWikiPage,
  ToolNetApiWikiPages,
  ToolNetApiWikiSearch,
  ToolNetApiWikiSummary,
} from './types.js';

import type {
  ToolNetApiGovernancePolicy,
  ToolNetApiGovernanceReview,
  ToolNetApiGovernanceReviews,
  ToolNetApiGovernanceSummary,
  ToolNetApiKnowledgeQuality,
  ToolNetGovernanceDecisionInput,
  ToolNetKnowledgeGovernancePolicy,
  ToolNetKnowledgeGovernanceReviewStatus,
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

  wiki(): Promise<ToolNetApiWikiSummary> {
    return this.request<ToolNetApiWikiSummary>('/v1/wiki');
  }

  wikiPages(): Promise<ToolNetApiWikiPages> {
    return this.request<ToolNetApiWikiPages>('/v1/wiki/pages');
  }

  createWikiPage(input: ToolNetApiCreateWikiPageInput): Promise<ToolNetApiWikiPage> {
    return this.request<ToolNetApiWikiPage>('/v1/wiki/pages', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  wikiPage(slug: string): Promise<ToolNetApiWikiPage> {
    return this.request<ToolNetApiWikiPage>(`/v1/wiki/pages/${encodeURIComponent(slug)}`);
  }

  updateWikiPage(slug: string, input: ToolNetApiUpdateWikiPageInput): Promise<ToolNetApiWikiPage> {
    return this.request<ToolNetApiWikiPage>(`/v1/wiki/pages/${encodeURIComponent(slug)}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  }

  wikiSearch(query: string, limit = 10): Promise<ToolNetApiWikiSearch> {
    const params = new URLSearchParams({
      q: query,
      limit: String(limit),
    });

    return this.request<ToolNetApiWikiSearch>(`/v1/wiki/search?${params.toString()}`);
  }

  wikiHistory(slug: string): Promise<ToolNetApiWikiHistory> {
    return this.request<ToolNetApiWikiHistory>(
      `/v1/wiki/pages/${encodeURIComponent(slug)}/history`
    );
  }

  wikiBacklinks(slug: string): Promise<ToolNetApiWikiBacklinks> {
    return this.request<ToolNetApiWikiBacklinks>(
      `/v1/wiki/pages/${encodeURIComponent(slug)}/backlinks`
    );
  }

  governance(): Promise<ToolNetApiGovernanceSummary> {
    return this.request<ToolNetApiGovernanceSummary>('/v1/governance');
  }

  governanceReviews(
    status?: ToolNetKnowledgeGovernanceReviewStatus
  ): Promise<ToolNetApiGovernanceReviews> {
    const suffix = status ? `?status=${encodeURIComponent(status)}` : '';

    return this.request<ToolNetApiGovernanceReviews>(`/v1/governance/reviews${suffix}`);
  }

  reviewKnowledge(
    reviewId: string,
    input: ToolNetGovernanceDecisionInput
  ): Promise<ToolNetApiGovernanceReview> {
    return this.request<ToolNetApiGovernanceReview>(
      `/v1/governance/reviews/${encodeURIComponent(reviewId)}`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      }
    );
  }

  knowledgeQuality(): Promise<ToolNetApiKnowledgeQuality> {
    return this.request<ToolNetApiKnowledgeQuality>('/v1/governance/quality');
  }

  governancePolicy(): Promise<ToolNetApiGovernancePolicy> {
    return this.request<ToolNetApiGovernancePolicy>('/v1/governance/policy');
  }

  setGovernancePolicy(
    input: Partial<ToolNetKnowledgeGovernancePolicy>
  ): Promise<ToolNetApiGovernancePolicy> {
    return this.request<ToolNetApiGovernancePolicy>('/v1/governance/policy', {
      method: 'PUT',
      body: JSON.stringify(input),
    });
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
