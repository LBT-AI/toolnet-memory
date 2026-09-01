import { describe, expect, it } from 'vitest';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { TOOLNET_MCP_SERVER_INSTRUCTIONS } from '../../src/mcp/server.js';

describe('ToolNet MCP Server Instructions', () => {
  it('teaches MCP clients to use memory_agent_ask for continuity', () => {
    expect(TOOLNET_MCP_SERVER_INSTRUCTIONS).toContain('memory_agent_ask');

    expect(TOOLNET_MCP_SERVER_INSTRUCTIONS).toContain('mode="local"');

    expect(TOOLNET_MCP_SERVER_INSTRUCTIONS).toContain('local-only');

    expect(TOOLNET_MCP_SERVER_INSTRUCTIONS).toContain('.toolnet/sessions/**');

    expect(TOOLNET_MCP_SERVER_INSTRUCTIONS).toContain('~/.gemini/antigravity-cli/brain/**');

    expect(TOOLNET_MCP_SERVER_INSTRUCTIONS).toContain(
      'Current repository evidence overrides stale memory'
    );
  });

  it('is accepted by the installed MCP SDK as native server instructions', () => {
    const server = new McpServer(
      {
        name: 'toolnet-memory-test',

        version: '0.0.0-test',
      },
      {
        instructions: TOOLNET_MCP_SERVER_INSTRUCTIONS,
      }
    );

    expect(server).toBeDefined();
  });
});
