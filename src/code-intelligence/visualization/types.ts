export interface VisualizationNode {
  id: string;

  name: string;
  qualifiedName?: string;

  type: string;
  filePath: string;

  layer?: string;
  cluster?: string;
  clusterLabel?: string;

  hotspotScore?: number;

  deadCode?: {
    confidence: string;
    score: number;
  };

  incoming: number;
  outgoing: number;
}

export interface VisualizationLink {
  source: string;
  target: string;

  type: string;

  confidence?: string;
  resolver?: string;
}

export interface VisualizationGraph {
  version: 1;

  projectId: string;
  generatedAt: string;

  summary: {
    nodes: number;
    links: number;
    files: number;
    clusters: number;
  };

  nodes: VisualizationNode[];
  links: VisualizationLink[];
}
