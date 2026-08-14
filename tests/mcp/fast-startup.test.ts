import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

import { describe, expect, it } from 'vitest';

function inheritedEnvironment(): Record<string, string> {
  const output: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      output[key] = value;
    }
  }

  return output;
}

describe('MCP fast startup', () => {
  it('completes MCP initialize before deliberately unreachable S3 hydration', async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'toolnet-mcp-fast-'));

    const emptyGlobalEnv = join(projectRoot, 'empty.env');

    writeFileSync(
      join(projectRoot, 'package.json'),
      JSON.stringify(
        {
          name: 'toolnet-mcp-fast-startup-test',
          private: true,
        },
        null,
        2
      )
    );

    writeFileSync(emptyGlobalEnv, '');

    const transport = new StdioClientTransport({
      command: resolve('node_modules/.bin/tsx'),

      args: [resolve('src/mcp/bootstrap.ts')],

      cwd: projectRoot,

      env: {
        ...inheritedEnvironment(),

        /*
         * Point storage at an unreachable endpoint.
         *
         * If bootstrap accidentally waits for S3 again,
         * client.connect() will hit our short timeout.
         */
        TOOLNET_GLOBAL_ENV: emptyGlobalEnv,

        MEMORY_STORAGE_PROVIDER: 's3',

        S3_ENDPOINT: 'http://10.255.255.1:9',
        S3_REGION: 'us-east-1',
        S3_BUCKET: 'toolnet-fast-startup-test',
        S3_ACCESS_KEY_ID: 'test',
        S3_SECRET_ACCESS_KEY: 'test',
        S3_FORCE_PATH_STYLE: 'true',

        AWS_EC2_METADATA_DISABLED: 'true',
      },
    });

    const client = new Client({
      name: 'toolnet-fast-startup-test',
      version: '1.0.0',
    });

    const startedAt = Date.now();

    try {
      await Promise.race([
        client.connect(transport),

        new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error('MCP initialize exceeded 3000ms'));
          }, 3000);
        }),
      ]);

      const elapsedMs = Date.now() - startedAt;

      expect(elapsedMs).toBeLessThan(3000);

      const listed = await client.listTools();

      expect(listed.tools.map((tool) => tool.name)).toContain('memory_agent_ask');
    } finally {
      await client.close().catch(() => undefined);

      rmSync(projectRoot, {
        recursive: true,
        force: true,
      });
    }
  }, 10_000);
});
