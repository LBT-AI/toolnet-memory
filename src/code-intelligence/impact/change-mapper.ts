import type { CodeSymbol } from '../../core/types.js';

import type { CodeGraphStore } from '../graph/graph-store.js';

import type { ChangedFile } from '../git/git-diff.js';

export interface ChangedSymbol {
  symbol: CodeSymbol;

  fileStatus: ChangedFile['status'];

  direct: boolean;
}

function intersects(
  symbol: CodeSymbol,

  file: ChangedFile
): boolean {
  /*
   * Nếu không lấy được line diff:
   * coi toàn file bị thay đổi.
   */
  if (file.ranges.length === 0) {
    return true;
  }

  if (typeof symbol.startLine !== 'number' || typeof symbol.endLine !== 'number') {
    return false;
  }

  return file.ranges.some(
    (range) => symbol.startLine! <= range.endLine && symbol.endLine! >= range.startLine
  );
}

export class ChangeMapper {
  constructor(private readonly graph: CodeGraphStore) {}

  map(projectId: string, changes: ChangedFile[]): ChangedSymbol[] {
    const symbols = this.graph.allSymbols(projectId);

    const output: ChangedSymbol[] = [];

    for (const file of changes) {
      const fileSymbols = symbols.filter((symbol) => symbol.filePath === file.filePath);

      const semanticSymbols = fileSymbols.filter((symbol) => symbol.type !== 'file');

      const direct = semanticSymbols.filter((symbol) => intersects(symbol, file));

      /*
       * Nếu diff nằm ngoài function/class,
       * vẫn đưa file node vào blast radius.
       */
      if (direct.length === 0) {
        const fileNode = fileSymbols.find((symbol) => symbol.type === 'file');

        if (fileNode) {
          output.push({
            symbol: fileNode,

            fileStatus: file.status,

            direct: true,
          });
        }

        continue;
      }

      for (const symbol of direct) {
        output.push({
          symbol,
          fileStatus: file.status,

          direct: true,
        });
      }
    }

    return output;
  }

  mapFile(projectId: string, filePath: string): ChangedSymbol[] {
    return this.map(projectId, [
      {
        filePath,
        status: 'modified',
        ranges: [],
      },
    ]);
  }
}
