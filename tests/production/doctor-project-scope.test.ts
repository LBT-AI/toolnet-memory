import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('doctor project namespace', () => {
  it('uses raw storage for provider health and scoped storage for project data', () => {
    const source = readFileSync(resolve('src/production/doctor.ts'), 'utf8');

    expect(source).toContain('ProjectScopedStorageProvider');

    expect(source).toContain('const rawStorage = withStorageRetry(');

    expect(source).toMatch(
      /const storage = new ProjectScopedStorageProvider\(\s*rawStorage,\s*project\.id,\s*project\.name,\s*project\.remote \?\? project\.name\s*\)/
    );

    expect(source).toContain('const health = await new ProductionHealth(rawStorage).run();');

    expect(source).toContain(
      'const graph = await new PersistentCodeGraphStore(storage).load(project.id);'
    );

    expect(source).toContain('const memories = await new MemoryStore(storage).load(project.id);');
  });
});
