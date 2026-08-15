import { describe, expect, it } from 'vitest';

import {
  createMCPRuntimeState,
  markDependencyFailed,
  markDependencyReady,
  markHydrationCompleted,
  markHydrationStarted,
  markMCPConnected,
  retryOperation,
} from '../../src/mcp/runtime-state.js';

describe('MCP runtime state', () => {
  it('records startup and hydration performance', () => {
    const runtime = createMCPRuntimeState(1_000);

    markMCPConnected(runtime, 1_025);

    expect(runtime.metrics.startupMs).toBe(25);
    expect(runtime.phase).toBe('hydrating');

    markHydrationStarted(runtime, 1_100);

    markDependencyReady(runtime, 'memory', 1_130);

    markDependencyReady(runtime, 'graph', 1_150);

    markDependencyReady(runtime, 'semantic', 1_180);

    markHydrationCompleted(runtime, 1_200);

    expect(runtime.phase).toBe('ready');

    expect(runtime.metrics.hydrationMs).toBe(100);

    expect(runtime.dependencies.semantic.readyAfterMs).toBe(180);
  });

  it('reports degraded state when one dependency fails', () => {
    const runtime = createMCPRuntimeState(1_000);

    markDependencyReady(runtime, 'memory', 1_010);

    markDependencyReady(runtime, 'graph', 1_020);

    markDependencyFailed(runtime, 'semantic', new Error('embedding offline'));

    markHydrationCompleted(runtime, 1_030);

    expect(runtime.phase).toBe('degraded');

    expect(runtime.errors).toEqual(['semantic: embedding offline']);
  });

  it('retries transient failures', async () => {
    let calls = 0;
    let retries = 0;

    const result = await retryOperation(
      async () => {
        calls += 1;

        if (calls < 3) {
          throw new Error('temporary');
        }

        return 'ready';
      },
      {
        attempts: 3,
        delayMs: 0,

        onRetry: () => {
          retries += 1;
        },
      }
    );

    expect(result).toBe('ready');
    expect(calls).toBe(3);
    expect(retries).toBe(2);
  });
});
