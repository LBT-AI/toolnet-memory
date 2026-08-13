import { randomUUID } from 'node:crypto';

import {
  MEMORY_HUB_SCOPES,
  type MemoryHubAclGrant,
  type MemoryHubAgent,
  type MemoryHubAgentLoadout,
  type MemoryHubEvent,
  type MemoryHubRole,
  type MemoryHubScope,
  type MemoryHubStateV1,
  type MemoryHubTeam,
} from './types.js';

import { MemoryHubStore } from './store.js';

const DEFAULT_TOOLS = [
  'memory_search',
  'memory_agent_ask',
  'skill_memory_search',
  'context_offload_read',
  'wiki_search',
  'wiki_read',
];

export class MemoryHubError extends Error {
  constructor(
    message: string,
    readonly statusCode: number
  ) {
    super(message);
  }
}

export interface CreateMemoryHubTeamInput {
  id?: string;
  name: string;
  description?: string;
}

export interface CreateMemoryHubAgentInput {
  id?: string;
  name: string;
  kind?: string;
  teamIds?: string[];
  metadata?: Record<string, unknown>;
}

export interface GrantMemoryHubAclInput {
  principal: string;
  role: MemoryHubRole;
  scopes?: MemoryHubScope[];
}

export interface SetMemoryHubLoadoutInput {
  agentId: string;
  tools?: string[];
  memoryMode?: 'local' | 'ai';
  skillMemory?: boolean;
  contextOffload?: boolean;
  maxContextChars?: number;
}

export interface MemoryHubRequestObservation {
  method: string;
  path: string;
  principal: string;
  statusCode: number;
  durationMs: number;
}

function roleScopes(role: MemoryHubRole): MemoryHubScope[] {
  if (role === 'owner' || role === 'admin') {
    return [...MEMORY_HUB_SCOPES];
  }

  return ['hub:read'];
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function copyState(state: MemoryHubStateV1): MemoryHubStateV1 {
  return structuredClone(state);
}

export class MemoryHubService {
  private state?: MemoryHubStateV1;

  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly store: MemoryHubStore,
    private readonly maxEvents = 100
  ) {}

  async initialize(): Promise<void> {
    await this.ensureState();
  }

  private async ensureState(): Promise<MemoryHubStateV1> {
    if (!this.state) {
      this.state = await this.store.load();
    }

    return this.state;
  }

  private async mutate<T>(operation: (state: MemoryHubStateV1) => T): Promise<T> {
    let result!: T;

    const current = this.queue.then(async () => {
      const state = await this.ensureState();

      result = operation(state);

      state.updatedAt = new Date().toISOString();

      await this.store.save(state);
    });

    this.queue = current.then(
      () => undefined,
      () => undefined
    );

    await current;

    return result;
  }

  private grantFor(state: MemoryHubStateV1, principal: string): MemoryHubAclGrant | undefined {
    return state.acl.find((grant) => grant.principal === principal);
  }

  async authorize(principal: string, scope: MemoryHubScope): Promise<boolean> {
    const state = await this.ensureState();

    const grant = this.grantFor(state, principal);

    return Boolean(
      grant && (grant.role === 'owner' || grant.role === 'admin' || grant.scopes.includes(scope))
    );
  }

  private async requireScope(principal: string, scope: MemoryHubScope): Promise<void> {
    if (!(await this.authorize(principal, scope))) {
      throw new MemoryHubError(`Principal '${principal}' lacks '${scope}'`, 403);
    }
  }

  private event(
    kind: MemoryHubEvent['kind'],
    action: string,
    principal: string,
    ok: boolean
  ): MemoryHubEvent {
    return {
      id: randomUUID(),
      kind,
      action,
      principal,
      ok,
      timestamp: new Date().toISOString(),
    };
  }

  private pushEvent(state: MemoryHubStateV1, event: MemoryHubEvent): void {
    state.observability.events.push(event);

    if (state.observability.events.length > this.maxEvents) {
      state.observability.events = state.observability.events.slice(-this.maxEvents);
    }

    state.observability.lastActivityAt = event.timestamp;
  }

  private mutation(state: MemoryHubStateV1, action: string, principal: string): void {
    state.observability.mutations += 1;

    this.pushEvent(state, this.event('mutation', action, principal, true));
  }

  async summary(principal: string) {
    await this.requireScope(principal, 'hub:read');

    const state = await this.ensureState();

    return {
      schema: state.schema,
      project: { ...state.project },
      teams: state.teams.length,
      agents: state.agents.length,
      aclGrants: state.acl.length,
      loadouts: state.loadouts.length,
      updatedAt: state.updatedAt,
    };
  }

  async listTeams(principal: string): Promise<MemoryHubTeam[]> {
    await this.requireScope(principal, 'hub:read');

    return structuredClone((await this.ensureState()).teams);
  }

  async createTeam(principal: string, input: CreateMemoryHubTeamInput): Promise<MemoryHubTeam> {
    await this.requireScope(principal, 'teams:write');

    return this.mutate((state) => {
      const now = new Date().toISOString();

      const id = input.id?.trim() || `team-${randomUUID().slice(0, 8)}`;

      if (state.teams.some((team) => team.id === id)) {
        throw new MemoryHubError(`Team already exists: ${id}`, 409);
      }

      const team: MemoryHubTeam = {
        id,
        name: input.name.trim(),
        ...(input.description?.trim() ? { description: input.description.trim() } : {}),
        createdAt: now,
        updatedAt: now,
      };

      state.teams.push(team);

      this.mutation(state, `team:create:${id}`, principal);

      return structuredClone(team);
    });
  }

  async listAgents(principal: string): Promise<MemoryHubAgent[]> {
    await this.requireScope(principal, 'hub:read');

    return structuredClone((await this.ensureState()).agents);
  }

  async createAgent(principal: string, input: CreateMemoryHubAgentInput): Promise<MemoryHubAgent> {
    await this.requireScope(principal, 'agents:write');

    return this.mutate((state) => {
      const now = new Date().toISOString();

      const id = input.id?.trim() || `agent-${randomUUID().slice(0, 8)}`;

      if (state.agents.some((agent) => agent.id === id)) {
        throw new MemoryHubError(`Agent already exists: ${id}`, 409);
      }

      const teamIds = uniqueStrings(input.teamIds ?? []);

      for (const teamId of teamIds) {
        if (!state.teams.some((team) => team.id === teamId)) {
          throw new MemoryHubError(`Team not found: ${teamId}`, 404);
        }
      }

      const agent: MemoryHubAgent = {
        id,
        name: input.name.trim(),
        ...(input.kind?.trim() ? { kind: input.kind.trim() } : {}),
        teamIds,
        ...(input.metadata
          ? {
              metadata: structuredClone(input.metadata),
            }
          : {}),
        createdAt: now,
        updatedAt: now,
      };

      state.agents.push(agent);

      state.loadouts.push({
        agentId: id,
        tools: [...DEFAULT_TOOLS],
        memoryMode: 'local',
        skillMemory: true,
        contextOffload: true,
        maxContextChars: 6400,
        updatedAt: now,
      });

      this.mutation(state, `agent:create:${id}`, principal);

      return structuredClone(agent);
    });
  }

  async listAcl(principal: string): Promise<MemoryHubAclGrant[]> {
    await this.requireScope(principal, 'acl:manage');

    return structuredClone((await this.ensureState()).acl);
  }

  async grantAcl(principal: string, input: GrantMemoryHubAclInput): Promise<MemoryHubAclGrant> {
    await this.requireScope(principal, 'acl:manage');

    return this.mutate((state) => {
      const now = new Date().toISOString();

      const scopes = uniqueStrings(input.scopes ?? roleScopes(input.role)) as MemoryHubScope[];

      for (const scope of scopes) {
        if (!MEMORY_HUB_SCOPES.includes(scope)) {
          throw new MemoryHubError(`Unknown Memory Hub scope: ${scope}`, 400);
        }
      }

      const existing = state.acl.find((grant) => grant.principal === input.principal);

      if (existing) {
        existing.role = input.role;
        existing.scopes = [...scopes];
        existing.updatedAt = now;

        this.mutation(state, `acl:update:${input.principal}`, principal);

        return structuredClone(existing);
      }

      const grant: MemoryHubAclGrant = {
        principal: input.principal,
        role: input.role,
        scopes: [...scopes],
        createdAt: now,
        updatedAt: now,
      };

      state.acl.push(grant);

      this.mutation(state, `acl:grant:${input.principal}`, principal);

      return structuredClone(grant);
    });
  }

  async revokeAcl(principal: string, targetPrincipal: string): Promise<void> {
    await this.requireScope(principal, 'acl:manage');

    await this.mutate((state) => {
      if (targetPrincipal === state.ownerPrincipal) {
        throw new MemoryHubError('Memory Hub owner ACL cannot be revoked', 409);
      }

      const before = state.acl.length;

      state.acl = state.acl.filter((grant) => grant.principal !== targetPrincipal);

      if (state.acl.length === before) {
        throw new MemoryHubError(`ACL principal not found: ${targetPrincipal}`, 404);
      }

      this.mutation(state, `acl:revoke:${targetPrincipal}`, principal);
    });
  }

  async listLoadouts(principal: string): Promise<MemoryHubAgentLoadout[]> {
    await this.requireScope(principal, 'hub:read');

    return structuredClone((await this.ensureState()).loadouts);
  }

  async getLoadout(principal: string, agentId: string): Promise<MemoryHubAgentLoadout> {
    await this.requireScope(principal, 'hub:read');

    const loadout = (await this.ensureState()).loadouts.find((item) => item.agentId === agentId);

    if (!loadout) {
      throw new MemoryHubError(`Agent loadout not found: ${agentId}`, 404);
    }

    return structuredClone(loadout);
  }

  async setLoadout(
    principal: string,
    input: SetMemoryHubLoadoutInput
  ): Promise<MemoryHubAgentLoadout> {
    await this.requireScope(principal, 'loadouts:write');

    return this.mutate((state) => {
      if (!state.agents.some((agent) => agent.id === input.agentId)) {
        throw new MemoryHubError(`Agent not found: ${input.agentId}`, 404);
      }

      const now = new Date().toISOString();

      let loadout = state.loadouts.find((item) => item.agentId === input.agentId);

      if (!loadout) {
        loadout = {
          agentId: input.agentId,
          tools: [...DEFAULT_TOOLS],
          memoryMode: 'local',
          skillMemory: true,
          contextOffload: true,
          maxContextChars: 6400,
          updatedAt: now,
        };

        state.loadouts.push(loadout);
      }

      if (input.tools) {
        loadout.tools = uniqueStrings(input.tools);
      }

      if (input.memoryMode) {
        loadout.memoryMode = input.memoryMode;
      }

      if (input.skillMemory !== undefined) {
        loadout.skillMemory = input.skillMemory;
      }

      if (input.contextOffload !== undefined) {
        loadout.contextOffload = input.contextOffload;
      }

      if (input.maxContextChars !== undefined) {
        loadout.maxContextChars = input.maxContextChars;
      }

      loadout.updatedAt = now;

      this.mutation(state, `loadout:set:${input.agentId}`, principal);

      return structuredClone(loadout);
    });
  }

  async observability(principal: string) {
    await this.requireScope(principal, 'observability:read');

    return structuredClone((await this.ensureState()).observability);
  }

  async recordRequest(observation: MemoryHubRequestObservation): Promise<void> {
    await this.mutate((state) => {
      const ok = observation.statusCode < 400;

      state.observability.requests += 1;

      if (!ok) {
        state.observability.errors += 1;
      }

      const event: MemoryHubEvent = {
        ...this.event(
          'request',
          `${observation.method} ${observation.path}`,
          observation.principal,
          ok
        ),
        statusCode: observation.statusCode,
        durationMs: Math.max(0, Math.floor(observation.durationMs)),
      };

      this.pushEvent(state, event);
    });
  }

  async snapshot(): Promise<MemoryHubStateV1> {
    return copyState(await this.ensureState());
  }
}
