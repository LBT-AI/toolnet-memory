import { describe, expect, it } from 'vitest';

import type { NormalizedSessionEvent, SessionIdentity } from '../../src/session/types.js';

import { runMemoryPipelineV2 } from '../../src/memory/pipeline-v2.js';

const identity: SessionIdentity = {
  projectId: 'project-1',

  projectName: 'demo',

  projectRoot: '/tmp/demo',

  agent: 'codex',

  nativeSessionId: 'session-1',

  sessionKey: 'codex:session-1',

  remotePrefix: 'projects/demo/sessions/codex/session-1',

  localDirectory: '/tmp/demo/.toolnet/session',
};

function event(
  sequence: number,
  input: {
    id?: string;

    sourceEventId?: string;

    type?: NormalizedSessionEvent['type'];

    role?: string;

    text: string;

    sourcePath?: string;
  }
): NormalizedSessionEvent {
  return {
    version: 1,

    id: input.id ?? `event-${sequence}`,

    sequence,

    projectId: identity.projectId,

    agent: identity.agent,

    nativeSessionId: identity.nativeSessionId,

    type: input.type ?? 'message',

    timestamp: new Date(1_700_000_000_000 + sequence * 1000).toISOString(),

    role: input.role,

    sourceEventId: input.sourceEventId,

    data: {
      text: input.text,
    },

    provenance: {
      source: identity.agent,

      sourcePath: input.sourcePath,
    },
  };
}

describe('Memory Pipeline v2', () => {
  it('normalizes, classifies and builds compact task state', () => {
    const events = [
      event(1, {
        role: 'user',

        text: 'Always use TypeScript strict mode for this project.',
      }),

      event(2, {
        role: 'user',

        type: 'todo',

        text: 'Next step: update src/auth.ts and run authentication tests.',

        sourcePath: 'src/auth.ts',
      }),

      event(3, {
        role: 'user',

        text: 'Blocker: cannot deploy until authentication tests pass.',
      }),

      event(4, {
        role: 'assistant',

        text: 'Fixed authentication bug in src/auth.ts and tests now pass.',

        sourcePath: 'src/auth.ts',
      }),

      event(5, {
        role: 'assistant',

        text: 'npm notice added 123 packages in 4s',
      }),

      /*
       * Duplicate native event: later copy must win.
       */
      event(6, {
        id: 'duplicate-a',

        sourceEventId: 'native-duplicate',

        role: 'user',

        text: 'Next step: old duplicate value.',
      }),

      event(7, {
        id: 'duplicate-b',

        sourceEventId: 'native-duplicate',

        role: 'user',

        text: 'Next step: release after tests are green.',
      }),
    ];

    const result = runMemoryPipelineV2(
      identity,

      events
    );

    expect(result.version).toBe(2);

    expect(result.stats.inputEvents).toBe(7);

    expect(result.stats.normalizedEvents).toBe(6);

    expect(result.candidates.length).toBeGreaterThan(0);

    expect(result.candidates.some((candidate) => candidate.knowledgeClass === 'permanent')).toBe(
      true
    );

    expect(result.candidates.some((candidate) => candidate.knowledgeClass === 'task')).toBe(true);

    expect(result.candidates.every((candidate) => candidate.knowledgeClass !== 'transient')).toBe(
      true
    );

    expect(result.candidates.some((candidate) => candidate.tags.includes('class:permanent'))).toBe(
      true
    );

    expect(result.state.files.some((file) => file.includes('src/auth.ts'))).toBe(true);

    expect(result.state.blockers.join(' ')).toMatch(/cannot deploy/i);

    expect(result.state.nextActions.join(' ')).toMatch(/release|auth|test/i);

    expect(result.retrievalIndex).toHaveLength(result.candidates.length);

    expect(result.retrievalIndex.every((entry) => entry.terms.length > 0)).toBe(true);

    expect(result.hierarchy.schema).toBe('toolnet.memory-hierarchy.v1');

    expect(result.hierarchy.stats.raw).toBe(result.stats.normalizedEvents);

    expect(result.hierarchy.stats.facts).toBe(result.candidates.length);

    expect(result.hierarchy.stats.scenes).toBeGreaterThan(0);

    expect(result.hierarchy.stats.knowledge).toBeGreaterThan(0);

    expect(result.candidates.some((candidate) => /npm notice added/i.test(candidate.content))).toBe(
      false
    );
  });

  it('distinguishes permanent, task, session and transient policy', () => {
    const result = runMemoryPipelineV2(identity, [
      event(1, {
        role: 'user',

        text: 'Rule: never commit API keys to this repository.',
      }),

      event(2, {
        role: 'user',

        type: 'decision',

        text: 'Decision: use PostgreSQL for the current implementation.',
      }),

      event(3, {
        role: 'user',

        text: 'Repository path is /srv/toolnet/current-project.',
      }),
    ]);

    expect(result.stats.permanent).toBeGreaterThan(0);

    expect(result.stats.task).toBeGreaterThan(0);

    /*
     * Context/path facts are intentionally session knowledge,
     * not permanent project rules.
     */
    expect(result.candidates.some((candidate) => candidate.knowledgeClass === 'session')).toBe(
      true
    );
  });
});
