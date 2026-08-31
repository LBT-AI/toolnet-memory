import { describe, expect, it } from 'vitest';

import { CodeFtsIndex } from '../../src/code-intelligence/semantic/code-fts.js';
import type { CodeChunk } from '../../src/code-intelligence/chunks/types.js';

function chunk(id: string, content: string, filePath = `${id}.ts`): CodeChunk {
  return {
    id,
    projectId: 'p1',
    filePath,
    symbolName: id,
    symbolType: 'function',
    startLine: 1,
    endLine: 10,
    content,
    contentHash: id,
  };
}

describe('CodeFtsIndex', () => {
  it('returns the best matching chunk first', () => {
    const index = new CodeFtsIndex('p1');

    index.build([
      chunk('auth', 'function login(user, password) { return validate(user) }'),
      chunk('math', 'function add(a, b) { return a + b }'),
    ]);

    const results = index.search('login password', 5);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].chunk.id).toBe('auth');
    expect(results[0].score).toBeGreaterThan(0);
    expect(results[0].score).toBeLessThanOrEqual(1);

    index.close();
  });

  it('returns nothing for empty or whitespace queries', () => {
    const index = new CodeFtsIndex('p1');

    index.build([chunk('a', 'hello world')]);

    expect(index.search('   ')).toEqual([]);
    expect(index.search('')).toEqual([]);

    index.close();
  });

  it('matches across multiple OR terms', () => {
    const index = new CodeFtsIndex('p1');

    index.build([
      chunk('one', 'retry with backoff and timeout'),
      chunk('two', 'parse configuration from env'),
    ]);

    const results = index.search('timeout env', 5);

    expect(results.length).toBeGreaterThan(0);
    expect(results.map((hit) => hit.chunk.id).sort()).toEqual(['one', 'two']);

    index.close();
  });

  it('reports size and excludes stale chunks on rebuild', () => {
    const index = new CodeFtsIndex('p1');

    index.build([chunk('a', 'alpha'), chunk('b', 'beta')]);
    expect(index.size).toBe(2);

    index.build([chunk('c', 'gamma')]);
    expect(index.size).toBe(1);

    const results = index.search('gamma', 5);
    expect(results.map((hit) => hit.chunk.id)).toEqual(['c']);

    index.close();
  });

  it('clears index and chunks on empty rebuild', () => {
    const index = new CodeFtsIndex('p1');

    index.build([chunk('a', 'alpha'), chunk('b', 'beta')]);
    expect(index.size).toBe(2);

    const cleared = index.build([]);
    expect(cleared).toBe(0);
    expect(index.size).toBe(0);

    const results = index.search('alpha', 5);
    expect(results).toEqual([]);

    index.close();
  });
});

describe('CodeFtsIndex hardening', () => {
  it('does not throw on queries with FTS5 special characters', () => {
    const index = new CodeFtsIndex('p1');

    index.build([chunk('a', 'user authentication flow')]);

    const queries = [
      'foo-bar',
      'a:b',
      '(test)',
      'foo*bar',
      'AND',
      'OR',
      'NOT',
      'user AND auth',
      'foo "quoted" bar',
      'SELECT * FROM',
    ];

    for (const query of queries) {
      const results = index.search(query, 5);

      expect(Array.isArray(results)).toBe(true);
    }

    index.close();
  });

  it('isolates results per projectId', () => {
    const a = new CodeFtsIndex('project-a');
    const b = new CodeFtsIndex('project-b');

    a.build([chunk('secret', 'unique project a secret token')]);
    b.build([chunk('other', 'unrelated content here')]);

    const fromA = a.search('secret', 5);
    const fromB = b.search('secret', 5);

    expect(fromA.map((hit) => hit.chunk.id)).toEqual(['secret']);
    expect(fromB).toEqual([]);

    a.close();
    b.close();
  });

  it('does not duplicate rows across repeated builds', () => {
    const index = new CodeFtsIndex('p1');

    for (let i = 0; i < 3; i += 1) {
      index.build([chunk('a', 'alpha'), chunk('b', 'beta')]);
    }

    expect(index.size).toBe(2);

    const results = index.search('alpha', 10);
    const ids = results.map((hit) => hit.chunk.id);

    expect(ids.filter((id) => id === 'a').length).toBe(1);

    index.close();
  });

  it('returns no results for empty or whitespace queries', () => {
    const index = new CodeFtsIndex('p1');

    index.build([chunk('a', 'alpha')]);

    expect(index.search('')).toEqual([]);
    expect(index.search('   ')).toEqual([]);
    expect(index.search('\t\n')).toEqual([]);

    index.close();
  });
});
