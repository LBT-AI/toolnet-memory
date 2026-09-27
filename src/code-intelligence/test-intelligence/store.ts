/*
 * Phase 82 — bounded derived test-run store.
 *
 * Test runs are DERIVED, observational evidence with a different lifecycle from
 * Memory, Tasks, Sessions, ADRs and the Phase 76 graph artifact. The store is
 * in-memory and bounded; it is never an authority and is safe to discard.
 *
 * Retention keeps the most recent N runs per project, and identical execution
 * fingerprints are reused (never a different change/generation).
 */

import type { TestRun, TestSelection } from './types.js';

interface ProjectState {
  selection: TestSelection | null;
  runs: TestRun[];
}

export class TestIntelligenceStore {
  private readonly projects = new Map<string, ProjectState>();

  constructor(private readonly maxRetainedRuns: number) {}

  private state(projectId: string): ProjectState {
    const existing = this.projects.get(projectId);

    if (existing) {
      return existing;
    }

    const created: ProjectState = { selection: null, runs: [] };

    this.projects.set(projectId, created);

    return created;
  }

  putSelection(selection: TestSelection): void {
    this.state(selection.projectId).selection = selection;
  }

  getSelection(projectId: string, selectionId: string): TestSelection | null {
    const state = this.state(projectId);

    if (!state.selection || state.selection.selectionId !== selectionId) {
      return null;
    }

    return state.selection;
  }

  latestSelection(projectId: string): TestSelection | null {
    return this.state(projectId).selection;
  }

  /** Reuse only an exact execution-fingerprint match. */
  findRun(projectId: string, runId: string): TestRun | null {
    return this.state(projectId).runs.find((run) => run.id === runId) ?? null;
  }

  putRun(run: TestRun): void {
    const state = this.state(run.projectId);

    state.runs = [run, ...state.runs.filter((existing) => existing.id !== run.id)].slice(
      0,
      this.maxRetainedRuns
    );
  }

  listRuns(projectId: string, limit = 10): TestRun[] {
    return this.state(projectId).runs.slice(0, Math.max(0, limit));
  }

  clear(projectId?: string): void {
    if (projectId === undefined) {
      this.projects.clear();
      return;
    }

    this.projects.delete(projectId);
  }
}
