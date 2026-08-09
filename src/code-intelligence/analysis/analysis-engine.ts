import type { CodeGraphStore } from '../graph/graph-store.js';

import { DeadCodeAnalyzer } from './dead-code-analyzer.js';

import { DependencyAnalyzer } from './dependency-analyzer.js';

import type { CodeAnalysisSnapshot } from './types.js';

export class CodeAnalysisEngine {
  constructor(private readonly graph: CodeGraphStore) {}

  analyze(projectId: string): CodeAnalysisSnapshot {
    const deadCode = new DeadCodeAnalyzer(this.graph).analyze(projectId);

    const dependencies = new DependencyAnalyzer(this.graph).analyze(projectId);

    return {
      version: 1,

      projectId,

      updatedAt: new Date().toISOString(),

      summary: {
        deadCodeCandidates: deadCode.length,

        highConfidenceDeadCode: deadCode.filter((item) => item.confidence === 'high').length,

        files: dependencies.length,
      },

      deadCode,

      dependencies,
    };
  }
}
