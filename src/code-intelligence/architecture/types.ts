export type EntryPointKind =
  | "cli"
  | "route"
  | "main"
  | "package"
  | "runtime";

export interface ArchitectureEntryPoint {
  symbolId: string;
  filePath: string;
  name: string;
  kind: EntryPointKind;
  score: number;
  reasons: string[];
}

export interface ArchitectureHotspot {
  filePath: string;
  score: number;
  symbols: number;
  incoming: number;
  outgoing: number;
  reasons: string[];
}

export type ArchitectureLayerName =
  | "interface"
  | "application"
  | "domain"
  | "infrastructure"
  | "tests"
  | "unknown";

export interface ArchitectureLayer {
  filePath: string;
  layer: ArchitectureLayerName;
  confidence: number;
  reasons: string[];
}

export interface ArchitectureCluster {
  id: string;
  label: string;
  subsystem: string;
  files: string[];
  size: number;
  internalWeight: number;
  externalWeight: number;
  cohesion: number;
}

export interface ArchitectureSummary {
  files: number;
  entryPoints: number;
  hotspots: number;
  layers: number;
  clusters: number;
}

export interface ArchitectureSnapshot {
  version: 1;

  projectId: string;
  updatedAt: string;

  summary: ArchitectureSummary;

  entryPoints: ArchitectureEntryPoint[];
  hotspots: ArchitectureHotspot[];
  layers: ArchitectureLayer[];
  clusters: ArchitectureCluster[];
}
