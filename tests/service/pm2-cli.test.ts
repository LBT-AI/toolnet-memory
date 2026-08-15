import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

describe('ToolNet PM2 service installer', () => {
  it('keeps PM2 optional and uses production service bundle', () => {
    const source = readFileSync(new URL('../../src/service/cli.ts', import.meta.url), 'utf8');

    expect(source).toContain("'toolnet-memory-service'");

    expect(source).toContain("'service.js'");

    expect(source).toContain("'pm2'");

    expect(source).toContain('npm install -g pm2');
  });
});
