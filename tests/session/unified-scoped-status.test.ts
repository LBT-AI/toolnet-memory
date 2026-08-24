import { describe, expect, test } from 'vitest';

import {
  inspectUnifiedScopedIntegrationStatus,
  type UnifiedScopedStatusInspectors,
} from '../../src/session/new-agents/scoped-status.js';

import { renderUnifiedScopedIntegrationStatus } from '../../src/session/new-agents/scoped-status-renderer.js';

const project = {
  root: '/tmp/project',
  source: 'toolnet' as const,
  eligible: true,
  toolnetProject: true,
  manifestFile: '/tmp/project/.toolnet/project.json',
};

function readyBase(agent: 'cursor' | 'copilot' | 'grok') {
  return {
    installed: true,
    state: 'ready' as const,
    requestedScope: 'both' as const,
    project,
    plan: {
      agent,
      requestedScope: 'both' as const,
      project,
      canInstall: true,
      surfaces: {
        mcp: {
          surface: 'mcp' as const,
          global: { install: true, effective: false },
          project: { install: true, effective: true },
          effective: 'project' as const,
          risk:
            agent === 'cursor' ? ('precedence-unverified' as const) : ('shadowed-global' as const),
          dedupeRequired: false,
          trustRequired: true,
        },
        hooks: {
          surface: 'hooks' as const,
          global: { install: true, effective: true },
          project: { install: true, effective: true },
          effective: 'both' as const,
          risk: 'additive-duplicate' as const,
          dedupeRequired: true,
          trustRequired: true,
        },
        work: {
          surface: 'work' as const,
          global: { install: agent === 'grok', effective: false },
          project: { install: true, effective: true },
          effective: 'project' as const,
          risk: agent === 'grok' ? ('shadowed-global' as const) : ('none' as const),
          dedupeRequired: false,
          trustRequired: false,
        },
      },
    },
    dedupeReady: true,
    trustRequired: true,
    warnings: [],
  };
}

function rawStatus(configFile: string, hooksFile: string) {
  return {
    installed: true,
    state: 'ready' as const,
    mcp: {
      configured: true,
      configFile,
    },
    hooks: {
      configured: true,
      hooksFile,
      events: ['sessionStart'],
    },
    errors: [],
  };
}

const inspectors: UnifiedScopedStatusInspectors = {
  cursor: () => ({
    ...readyBase('cursor'),
    global: rawStatus('/home/u/.cursor/mcp.json', '/home/u/.cursor/hooks.json'),
    projectScope: {
      ...rawStatus('/tmp/project/.cursor/mcp.json', '/tmp/project/.cursor/hooks.json'),
      rule: {
        configured: true,
        ruleFile: '/tmp/project/.cursor/rules/toolnet-memory.mdc',
      },
    },
  }),

  copilot: () => ({
    ...readyBase('copilot'),
    global: rawStatus(
      '/home/u/.copilot/mcp-config.json',
      '/home/u/.copilot/hooks/toolnet-memory.json'
    ),
    projectScope: {
      ...rawStatus(
        '/tmp/project/.github/mcp.json',
        '/tmp/project/.github/hooks/toolnet-memory.json'
      ),
      instruction: {
        configured: true,
        instructionFile: '/tmp/project/.github/instructions/toolnet-memory.instructions.md',
      },
    },
    alternateProjectMcp: {
      file: '/tmp/project/.mcp.json',
      toolnetDefined: false,
    },
  }),

  grok: () => ({
    ...readyBase('grok'),
    global: {
      ...rawStatus('/home/u/.grok/config.toml', '/home/u/.grok/hooks/toolnet-memory.json'),
      skill: {
        configured: true,
        skillFile: '/home/u/.grok/skills/toolnet-continuity/SKILL.md',
      },
    },
    projectScope: {
      ...rawStatus(
        '/tmp/project/.grok/config.toml',
        '/tmp/project/.grok/hooks/toolnet-memory.json'
      ),
      skill: {
        configured: true,
        skillFile: '/tmp/project/.grok/skills/toolnet-continuity/SKILL.md',
      },
    },
    effective: {
      mcp: 'project' as const,
      hooks: 'both' as const,
      skill: 'project' as const,
    },
  }),
};

describe('unified scoped integration status', () => {
  test('normalizes all three agents into one contract', () => {
    const status = inspectUnifiedScopedIntegrationStatus(
      {
        scope: 'both',
        projectRoot: '/tmp/project',
      },
      inspectors
    );

    expect(status.installed).toBe(true);
    expect(status.state).toBe('ready');
    expect(status.summary).toEqual({
      total: 3,
      ready: 3,
      partial: 0,
      invalid: 0,
      missing: 0,
    });

    expect(status.agents.map((agent) => agent.agent)).toEqual(['cursor', 'copilot', 'grok']);

    for (const agent of status.agents) {
      expect(agent.effective.mcp).toBe('project');
      expect(agent.effective.hooks).toBe('both');
      expect(agent.effective.work).toBe('project');
      expect(agent.dedupe.required).toBe(true);
      expect(agent.dedupe.ready).toBe(true);
      expect(agent.trust.state).toBe('required-unverified');
    }
  });

  test('maps Cursor rule, Copilot instruction and Grok skill as distinct work types', () => {
    const status = inspectUnifiedScopedIntegrationStatus(
      {
        scope: 'both',
        projectRoot: '/tmp/project',
      },
      inspectors
    );

    const cursor = status.agents.find((agent) => agent.agent === 'cursor');
    const copilot = status.agents.find((agent) => agent.agent === 'copilot');
    const grok = status.agents.find((agent) => agent.agent === 'grok');

    expect(cursor?.project?.work?.kind).toBe('rule');
    expect(copilot?.project?.work?.kind).toBe('instruction');
    expect(grok?.global?.work?.kind).toBe('skill');
    expect(grok?.project?.work?.kind).toBe('skill');
  });

  test('supports filtering to one agent', () => {
    const status = inspectUnifiedScopedIntegrationStatus(
      {
        scope: 'both',
        projectRoot: '/tmp/project',
        agents: ['copilot'],
      },
      inspectors
    );

    expect(status.summary.total).toBe(1);
    expect(status.agents).toHaveLength(1);
    expect(status.agents[0].agent).toBe('copilot');
  });

  test('renderer exposes effective scope, dedupe, trust and risk', () => {
    const status = inspectUnifiedScopedIntegrationStatus(
      {
        scope: 'both',
        projectRoot: '/tmp/project',
      },
      inspectors
    );

    const rendered = renderUnifiedScopedIntegrationStatus(status);

    expect(rendered).toContain('Cursor CLI — READY');
    expect(rendered).toContain('GitHub Copilot CLI — READY');
    expect(rendered).toContain('Grok Build — READY');
    expect(rendered).toContain('MCP=project Hooks=both Work=project');
    expect(rendered).toContain('Dedupe     ready (required)');
    expect(rendered).toContain('Trust      required / native trust unverified');
    expect(rendered).toContain('Summary : 3/3 ready');
  });

  test('does not falsely claim native workspace trust', () => {
    const status = inspectUnifiedScopedIntegrationStatus(
      {
        scope: 'both',
        projectRoot: '/tmp/project',
      },
      inspectors
    );

    expect(JSON.stringify(status)).not.toContain('"trusted"');
    expect(JSON.stringify(status)).toContain('required-unverified');
  });
});
