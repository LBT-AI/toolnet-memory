import type { CodeGraphStore } from '../graph/graph-store.js';

import { readGitChanges } from '../git/git-diff.js';

import { ChangeMapper } from './change-mapper.js';

import { BlastRadiusAnalyzer } from './blast-radius.js';

export interface ImpactGuardOptions {
  maxDepth?: number;
}

export class ImpactGuard {
  private readonly mapper: ChangeMapper;

  private readonly blast: BlastRadiusAnalyzer;

  constructor(private readonly graph: CodeGraphStore) {
    this.mapper = new ChangeMapper(graph);

    this.blast = new BlastRadiusAnalyzer(graph);
  }

  async analyzeGitDiff(projectId: string, rootPath: string, options: ImpactGuardOptions = {}) {
    const changes = await readGitChanges(rootPath);

    const changedSymbols = this.mapper.map(projectId, changes);

    const result = this.blast.analyze(projectId, changedSymbols, options.maxDepth ?? 4);

    return {
      mode: 'git_diff' as const,

      changes,

      ...result,
    };
  }

  analyzeFile(projectId: string, filePath: string, options: ImpactGuardOptions = {}) {
    const changedSymbols = this.mapper.mapFile(projectId, filePath);

    return {
      mode: 'planned_file' as const,

      filePath,

      ...this.blast.analyze(projectId, changedSymbols, options.maxDepth ?? 4),
    };
  }
}
