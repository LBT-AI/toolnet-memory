export type DeadCodeConfidence = 'high' | 'medium' | 'low';

export interface DeadCodeCandidate {
  symbolId: string;
  name: string;
  qualifiedName?: string;
  type: string;
  filePath: string;
  startLine?: number;
  confidence: DeadCodeConfidence;
  score: number;
  reasons: string[];
}

export interface FileDependency {
  filePath: string;
  dependencies: string[];
  dependents: string[];
  outgoingEdges: number;
  incomingEdges: number;
}

export interface CodeAnalysisSnapshot {
  version: 1;

  projectId: string;
  updatedAt: string;

  summary: {
    deadCodeCandidates: number;
    highConfidenceDeadCode: number;
    files: number;
  };

  deadCode: DeadCodeCandidate[];

  dependencies: FileDependency[];
}
