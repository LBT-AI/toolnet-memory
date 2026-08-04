export interface CodeChunk {
  id: string;
  projectId: string;

  filePath: string;

  symbolId?: string;
  symbolName?: string;
  symbolType?: string;

  startLine: number;
  endLine: number;

  content: string;
  contentHash: string;
}
