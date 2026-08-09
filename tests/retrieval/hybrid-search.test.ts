import { describe, expect, it } from 'vitest';

import { MemoryEngine } from '../../src/core/memory-engine.js';

import { RetrievalEngine } from '../../src/retrieval/retrieval-engine.js';

describe('Retrieval Core', () => {
  it('retrieves relevant memories without loading all into context', () => {
    const memory = new MemoryEngine();

    memory.remember({
      projectId: 'toolnet',

      type: 'rule',

      content: 'Không được sửa production trực tiếp',

      importance: 'critical',

      tags: ['deploy'],
    });

    memory.remember({
      projectId: 'toolnet',

      type: 'decision',

      content: 'Quyết định sử dụng Hugging Face Bucket làm remote storage',

      importance: 'high',

      tags: ['huggingface', 'storage'],
    });

    memory.remember({
      projectId: 'toolnet',

      type: 'todo',

      content: 'TODO thêm vector search',

      importance: 'normal',

      tags: ['vector'],
    });

    memory.remember({
      projectId: 'toolnet',

      type: 'activity',

      content: 'Modified file src/index.ts',

      importance: 'temporary',
    });

    const retrieval = new RetrievalEngine(memory);

    const results = retrieval.search('toolnet', 'Hugging Face storage', {
      topK: 2,
    });

    expect(results.length).toBeGreaterThan(0);

    expect(results[0].memory.content).toContain('Hugging Face');

    const context = retrieval.context('toolnet', 'quy tắc sửa production', {
      topK: 3,
    });

    expect(context).toContain('production');

    expect(context).not.toContain('vector search');
  });
});
