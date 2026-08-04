import {
  createHash,
} from "node:crypto";

import {
  readFile,
} from "node:fs/promises";

import {
  join,
} from "node:path";

import type {
  CodeSymbol,
} from "../../core/types.js";

import {
  Sanitizer,
} from "../../security/sanitizer.js";

import type {
  CodeChunk,
} from "./types.js";

export interface SmartChunkerOptions {
  maxLines?: number;
  overlapLines?: number;
}

function hash(
  value: string,
): string {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

export class SmartCodeChunker {
  private readonly sanitizer =
    new Sanitizer();

  async build(
    projectId: string,
    rootPath: string,
    symbols: CodeSymbol[],
    options:
      SmartChunkerOptions = {},
  ): Promise<CodeChunk[]> {
    const maxLines =
      options.maxLines ?? 80;

    const overlapLines =
      options.overlapLines ?? 10;

    const byFile =
      new Map<
        string,
        CodeSymbol[]
      >();

    for (const symbol of symbols) {
      const list =
        byFile.get(
          symbol.filePath,
        ) ?? [];

      list.push(symbol);

      byFile.set(
        symbol.filePath,
        list,
      );
    }

    const chunks:
      CodeChunk[] = [];

    for (
      const [filePath, fileSymbols]
      of byFile
    ) {
      let text: string;

      try {
        text =
          await readFile(
            join(
              rootPath,
              filePath,
            ),
            "utf8",
          );
      } catch {
        continue;
      }

      const lines =
        text.split(/\r?\n/);

      const semanticSymbols =
        fileSymbols.filter(
          (symbol) =>
            symbol.type !==
              "file" &&
            typeof symbol.startLine ===
              "number" &&
            typeof symbol.endLine ===
              "number",
        );

      /*
       * Có symbol -> chunk theo symbol.
       * Không có symbol -> fallback chia file theo cửa sổ.
       */
      if (
        semanticSymbols.length >
        0
      ) {
        for (
          const symbol
          of semanticSymbols
        ) {
          chunks.push(
            ...this.chunkRange({
              projectId,
              filePath,
              lines,

              symbol,

              startLine:
                symbol.startLine!,
              endLine:
                symbol.endLine!,

              maxLines,
              overlapLines,
            }),
          );
        }
      } else {
        chunks.push(
          ...this.chunkRange({
            projectId,
            filePath,
            lines,

            startLine: 1,
            endLine:
              Math.max(
                1,
                lines.length,
              ),

            maxLines,
            overlapLines,
          }),
        );
      }
    }

    return chunks;
  }

  private chunkRange(
    input: {
      projectId: string;
      filePath: string;
      lines: string[];

      symbol?: CodeSymbol;

      startLine: number;
      endLine: number;

      maxLines: number;
      overlapLines: number;
    },
  ): CodeChunk[] {
    const {
      projectId,
      filePath,
      lines,
      symbol,
      maxLines,
    } = input;

    const overlapLines =
      Math.min(
        input.overlapLines,
        Math.max(
          0,
          maxLines - 1,
        ),
      );

    const start =
      Math.max(
        1,
        input.startLine,
      );

    const end =
      Math.min(
        lines.length,
        Math.max(
          start,
          input.endLine,
        ),
      );

    const output:
      CodeChunk[] = [];

    let cursor =
      start;

    let part =
      0;

    while (
      cursor <= end
    ) {
      const chunkEnd =
        Math.min(
          end,
          cursor +
            maxLines -
            1,
        );

      const raw =
        lines
          .slice(
            cursor - 1,
            chunkEnd,
          )
          .join("\n")
          .trim();

      if (raw) {
        const content =
          this.sanitizer
            .sanitize(raw)
            .text;

        const contentHash =
          hash(content);

        const identity = [
          projectId,
          filePath,
          symbol?.id ?? "file",
          String(part),
          contentHash,
        ].join(":");

        output.push({
          id:
            hash(identity)
              .slice(0, 32),

          projectId,

          filePath,

          symbolId:
            symbol?.id,

          symbolName:
            symbol?.qualifiedName ??
            symbol?.name,

          symbolType:
            symbol?.type,

          startLine:
            cursor,

          endLine:
            chunkEnd,

          content,

          contentHash,
        });
      }

      if (
        chunkEnd >= end
      ) {
        break;
      }

      cursor =
        chunkEnd -
        overlapLines +
        1;

      part++;
    }

    return output;
  }
}
