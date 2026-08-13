import {
  MEMORY_HUB_SCOPES,
  type CreateMemoryHubAgentInput,
  type CreateMemoryHubTeamInput,
  type GrantMemoryHubAclInput,
  type MemoryHubRole,
  type MemoryHubScope,
  type MemoryHubService,
  type SetMemoryHubLoadoutInput,
} from '../../hub/index.js';

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid Memory Hub request');
  }

  return value as Record<string, unknown>;
}

function text(value: unknown, name: string, min = 1, max = 200): string {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) {
    throw new Error(`Invalid ${name}`);
  }

  return value.trim();
}

function optionalText(value: unknown, name: string, max = 500): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return text(value, name, 1, max);
}

function stringArray(value: unknown, name: string, maxItems = 64): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (
    !Array.isArray(value) ||
    value.length > maxItems ||
    value.some((item) => typeof item !== 'string' || !item.trim())
  ) {
    throw new Error(`Invalid ${name}`);
  }

  return value.map((item) => item.trim());
}

export async function apiHubSummary(hub: MemoryHubService, principal: string) {
  return {
    schema: 'toolnet.api-hub-summary.v1',
    hub: await hub.summary(principal),
  };
}

export async function apiHubTeams(hub: MemoryHubService, principal: string) {
  return {
    schema: 'toolnet.api-hub-teams.v1',
    teams: await hub.listTeams(principal),
  };
}

export async function apiHubCreateTeam(hub: MemoryHubService, principal: string, value: unknown) {
  const input = object(value);

  const teamInput: CreateMemoryHubTeamInput = {
    ...(input.id !== undefined
      ? {
          id: text(input.id, 'team id', 2, 100),
        }
      : {}),
    name: text(input.name, 'team name', 2, 100),
    ...(input.description !== undefined
      ? {
          description: optionalText(input.description, 'team description', 500),
        }
      : {}),
  };

  return {
    schema: 'toolnet.api-hub-team.v1',
    team: await hub.createTeam(principal, teamInput),
  };
}

export async function apiHubAgents(hub: MemoryHubService, principal: string) {
  return {
    schema: 'toolnet.api-hub-agents.v1',
    agents: await hub.listAgents(principal),
  };
}

export async function apiHubCreateAgent(hub: MemoryHubService, principal: string, value: unknown) {
  const input = object(value);

  const agentInput: CreateMemoryHubAgentInput = {
    ...(input.id !== undefined
      ? {
          id: text(input.id, 'agent id', 2, 100),
        }
      : {}),
    name: text(input.name, 'agent name', 2, 100),
    ...(input.kind !== undefined
      ? {
          kind: optionalText(input.kind, 'agent kind', 100),
        }
      : {}),
    ...(input.teamIds !== undefined
      ? {
          teamIds: stringArray(input.teamIds, 'teamIds', 64),
        }
      : {}),
    ...(input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata)
      ? {
          metadata: input.metadata as Record<string, unknown>,
        }
      : {}),
  };

  return {
    schema: 'toolnet.api-hub-agent.v1',
    agent: await hub.createAgent(principal, agentInput),
  };
}

export async function apiHubAcl(hub: MemoryHubService, principal: string) {
  return {
    schema: 'toolnet.api-hub-acl.v1',
    grants: await hub.listAcl(principal),
  };
}

export async function apiHubGrantAcl(hub: MemoryHubService, principal: string, value: unknown) {
  const input = object(value);

  const role = text(input.role, 'role', 4, 20) as MemoryHubRole;

  if (!['owner', 'admin', 'member', 'viewer'].includes(role)) {
    throw new Error('Invalid role');
  }

  const scopes = stringArray(input.scopes, 'scopes', MEMORY_HUB_SCOPES.length) as
    MemoryHubScope[] | undefined;

  if (scopes?.some((scope) => !MEMORY_HUB_SCOPES.includes(scope))) {
    throw new Error('Invalid Memory Hub scope');
  }

  const grantInput: GrantMemoryHubAclInput = {
    principal: text(input.principal, 'principal', 1, 120),
    role,
    ...(scopes ? { scopes } : {}),
  };

  return {
    schema: 'toolnet.api-hub-acl-grant.v1',
    grant: await hub.grantAcl(principal, grantInput),
  };
}

export async function apiHubRevokeAcl(hub: MemoryHubService, principal: string, value: unknown) {
  const input = object(value);

  const targetPrincipal = text(input.principal, 'principal', 1, 120);

  await hub.revokeAcl(principal, targetPrincipal);

  return {
    schema: 'toolnet.api-hub-acl-revoke.v1',
    principal: targetPrincipal,
    revoked: true,
  };
}

export async function apiHubLoadouts(hub: MemoryHubService, principal: string) {
  return {
    schema: 'toolnet.api-hub-loadouts.v1',
    loadouts: await hub.listLoadouts(principal),
  };
}

export async function apiHubSetLoadout(hub: MemoryHubService, principal: string, value: unknown) {
  const input = object(value);

  const maxContextChars = input.maxContextChars;

  if (
    maxContextChars !== undefined &&
    (!Number.isInteger(maxContextChars) ||
      (maxContextChars as number) < 500 ||
      (maxContextChars as number) > 50_000)
  ) {
    throw new Error('Invalid maxContextChars');
  }

  const memoryMode = input.memoryMode;

  if (memoryMode !== undefined && memoryMode !== 'local' && memoryMode !== 'ai') {
    throw new Error('Invalid memoryMode');
  }

  if (input.skillMemory !== undefined && typeof input.skillMemory !== 'boolean') {
    throw new Error('Invalid skillMemory');
  }

  if (input.contextOffload !== undefined && typeof input.contextOffload !== 'boolean') {
    throw new Error('Invalid contextOffload');
  }

  const loadoutInput: SetMemoryHubLoadoutInput = {
    agentId: text(input.agentId, 'agentId', 2, 100),
    ...(input.tools !== undefined
      ? {
          tools: stringArray(input.tools, 'tools', 64),
        }
      : {}),
    ...(memoryMode ? { memoryMode } : {}),
    ...(input.skillMemory !== undefined
      ? {
          skillMemory: input.skillMemory as boolean,
        }
      : {}),
    ...(input.contextOffload !== undefined
      ? {
          contextOffload: input.contextOffload as boolean,
        }
      : {}),
    ...(maxContextChars !== undefined
      ? {
          maxContextChars: maxContextChars as number,
        }
      : {}),
  };

  return {
    schema: 'toolnet.api-hub-loadout.v1',
    loadout: await hub.setLoadout(principal, loadoutInput),
  };
}

export async function apiHubObservability(hub: MemoryHubService, principal: string) {
  return {
    schema: 'toolnet.api-hub-observability.v1',
    observability: await hub.observability(principal),
  };
}
