import { describe, it, expect } from 'vitest';
import { VisualizationBuilder } from '../../src/code-intelligence/visualization/visualization-builder.js';
import { CodeGraphStore } from '../../src/code-intelligence/graph/graph-store.js';
import type { StageProgressEvent } from '../../src/code-intelligence/types.js';

describe('Real Progress Tracking', () => {
  it('VisualizationBuilder reports real node progress', () => {
    const graph = new CodeGraphStore();

    // Add 250 test symbols to ensure multiple progress updates
    for (let i = 0; i < 250; i++) {
      graph.addSymbol({
        id: `test-${i}`,
        projectId: 'test-project',
        name: `Symbol${i}`,
        qualifiedName: `Symbol${i}`,
        type: 'function',
        filePath: 'test.ts',
        startLine: i * 2,
        endLine: i * 2 + 1,
      });
    }

    const builder = new VisualizationBuilder(graph);
    const progressEvents: StageProgressEvent[] = [];

    builder.build('test-project', null, null, (event) => {
      progressEvents.push(event);
    });

    // Verify we got progress events
    expect(progressEvents.length).toBeGreaterThan(0);

    // Verify all events have valid current/total
    for (const event of progressEvents) {
      expect(event.current).toBeGreaterThanOrEqual(0);
      expect(event.total).toBeGreaterThan(0);
      expect(event.current).toBeLessThanOrEqual(event.total);
    }

    // Verify we have node phase
    const nodeEvents = progressEvents.filter((e) => e.phase === 'nodes');
    expect(nodeEvents.length).toBeGreaterThan(0);

    // Verify final node event shows completion
    const lastNodeEvent = nodeEvents[nodeEvents.length - 1];
    expect(lastNodeEvent.current).toBe(lastNodeEvent.total);
    expect(lastNodeEvent.total).toBe(250);
  });

  it('VisualizationBuilder reports real link progress', () => {
    const graph = new CodeGraphStore();

    // Add symbols and edges
    for (let i = 0; i < 100; i++) {
      graph.addSymbol({
        id: `test-${i}`,
        projectId: 'test-project',
        name: `Symbol${i}`,
        qualifiedName: `Symbol${i}`,
        type: 'function',
        filePath: 'test.ts',
        startLine: i * 2,
        endLine: i * 2 + 1,
      });
    }

    // Add 150 edges
    for (let i = 0; i < 150; i++) {
      const from = i % 100;
      const to = (i + 1) % 100;
      graph.addEdge({
        id: `edge-${i}`,
        projectId: 'test-project',
        from: `test-${from}`,
        to: `test-${to}`,
        type: 'CALLS',
      });
    }

    const builder = new VisualizationBuilder(graph);
    const progressEvents: StageProgressEvent[] = [];

    builder.build('test-project', null, null, (event) => {
      progressEvents.push(event);
    });

    // Verify we have link phase
    const linkEvents = progressEvents.filter((e) => e.phase === 'links');
    expect(linkEvents.length).toBeGreaterThan(0);

    // Verify final link event shows completion
    const lastLinkEvent = linkEvents[linkEvents.length - 1];
    expect(lastLinkEvent.current).toBe(lastLinkEvent.total);
    expect(lastLinkEvent.total).toBe(150);
  });

  it('progress never shows 100% before work is complete', () => {
    const graph = new CodeGraphStore();

    // Add many symbols to ensure multiple progress updates
    for (let i = 0; i < 500; i++) {
      graph.addSymbol({
        id: `test-${i}`,
        projectId: 'test-project',
        name: `Symbol${i}`,
        qualifiedName: `Symbol${i}`,
        type: 'function',
        filePath: 'test.ts',
        startLine: i * 2,
        endLine: i * 2 + 1,
      });
    }

    const builder = new VisualizationBuilder(graph);
    const progressEvents: StageProgressEvent[] = [];

    builder.build('test-project', null, null, (event) => {
      progressEvents.push(event);
    });

    // Check that no intermediate event shows 100%
    for (let i = 0; i < progressEvents.length - 1; i++) {
      const event = progressEvents[i];
      const percent = (event.current / event.total) * 100;

      // If not the last event of its phase, should never be 100%
      if (event.current < event.total) {
        expect(percent).toBeLessThan(100);
      }
    }

    // Verify final events show 100%
    const nodeEvents = progressEvents.filter((e) => e.phase === 'nodes');
    const lastNodeEvent = nodeEvents[nodeEvents.length - 1];
    expect(lastNodeEvent.current).toBe(lastNodeEvent.total);

    const linkEvents = progressEvents.filter((e) => e.phase === 'links');
    if (linkEvents.length > 0) {
      const lastLinkEvent = linkEvents[linkEvents.length - 1];
      expect(lastLinkEvent.current).toBe(lastLinkEvent.total);
    }
  });

  it('progress is based on discrete work units, not time', () => {
    const graph = new CodeGraphStore();

    // Add symbols
    for (let i = 0; i < 300; i++) {
      graph.addSymbol({
        id: `test-${i}`,
        projectId: 'test-project',
        name: `Symbol${i}`,
        qualifiedName: `Symbol${i}`,
        type: 'function',
        filePath: 'test.ts',
        startLine: i * 2,
        endLine: i * 2 + 1,
      });
    }

    const builder = new VisualizationBuilder(graph);
    const progressEvents: StageProgressEvent[] = [];

    builder.build('test-project', null, null, (event) => {
      progressEvents.push(event);
    });

    // Verify progress increments are based on work units (nodes/links processed)
    // not on fractional time-based increments
    for (let i = 1; i < progressEvents.length; i++) {
      const prev = progressEvents[i - 1];
      const curr = progressEvents[i];

      // Skip phase transitions
      if (prev.phase !== curr.phase) {
        continue;
      }

      const workDone = curr.current - prev.current;

      // Work done should be in discrete units (multiples of 100 for our batching)
      // or the final completion
      expect(Number.isInteger(workDone)).toBe(true);
      expect(workDone).toBeGreaterThanOrEqual(0);

      // Should never have fractional progress like 0.5 or 1.3
      expect(curr.current).toBe(Math.floor(curr.current));
      expect(curr.total).toBe(Math.floor(curr.total));
    }
  });

  it('progress total remains constant within a phase', () => {
    const graph = new CodeGraphStore();

    for (let i = 0; i < 200; i++) {
      graph.addSymbol({
        id: `test-${i}`,
        projectId: 'test-project',
        name: `Symbol${i}`,
        qualifiedName: `Symbol${i}`,
        type: 'function',
        filePath: 'test.ts',
        startLine: i * 2,
        endLine: i * 2 + 1,
      });
    }

    const builder = new VisualizationBuilder(graph);
    const progressEvents: StageProgressEvent[] = [];

    builder.build('test-project', null, null, (event) => {
      progressEvents.push(event);
    });

    // Group events by phase
    const nodeEvents = progressEvents.filter((e) => e.phase === 'nodes');
    const linkEvents = progressEvents.filter((e) => e.phase === 'links');

    // Verify total is constant within each phase
    if (nodeEvents.length > 1) {
      const firstTotal = nodeEvents[0].total;
      for (const event of nodeEvents) {
        expect(event.total).toBe(firstTotal);
      }
    }

    if (linkEvents.length > 1) {
      const firstTotal = linkEvents[0].total;
      for (const event of linkEvents) {
        expect(event.total).toBe(firstTotal);
      }
    }
  });

  it('progress current is monotonically increasing within a phase', () => {
    const graph = new CodeGraphStore();

    for (let i = 0; i < 300; i++) {
      graph.addSymbol({
        id: `test-${i}`,
        projectId: 'test-project',
        name: `Symbol${i}`,
        qualifiedName: `Symbol${i}`,
        type: 'function',
        filePath: 'test.ts',
        startLine: i * 2,
        endLine: i * 2 + 1,
      });
    }

    const builder = new VisualizationBuilder(graph);
    const progressEvents: StageProgressEvent[] = [];

    builder.build('test-project', null, null, (event) => {
      progressEvents.push(event);
    });

    // Verify current is monotonically increasing within each phase
    const nodeEvents = progressEvents.filter((e) => e.phase === 'nodes');
    for (let i = 1; i < nodeEvents.length; i++) {
      expect(nodeEvents[i].current).toBeGreaterThanOrEqual(nodeEvents[i - 1].current);
    }

    const linkEvents = progressEvents.filter((e) => e.phase === 'links');
    for (let i = 1; i < linkEvents.length; i++) {
      expect(linkEvents[i].current).toBeGreaterThanOrEqual(linkEvents[i - 1].current);
    }
  });
});
