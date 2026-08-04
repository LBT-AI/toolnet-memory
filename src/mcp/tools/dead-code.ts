import {
  z,
} from "zod";

import {
  DeadCodeAnalyzer,
} from "../../code-intelligence/analysis/dead-code-analyzer.js";

import type {
  DeadCodeConfidence,
} from "../../code-intelligence/analysis/types.js";

import type {
  MCPContext,
} from "../context.js";

export const deadCodeSchema = {
  confidence:
    z.enum([
      "high",
      "medium",
      "low",
      "all",
    ])
      .optional(),

  filePath:
    z.string()
      .min(1)
      .optional(),

  limit:
    z.number()
      .int()
      .min(1)
      .max(500)
      .optional(),
};

const RANK:
  Record<
    DeadCodeConfidence,
    number
  > = {
  high: 3,
  medium: 2,
  low: 1,
};

export async function deadCode(
  ctx: MCPContext,
  input: {
    confidence?:
      | DeadCodeConfidence
      | "all";

    filePath?:
      string;

    limit?:
      number;
  },
) {
  const analyzer =
    new DeadCodeAnalyzer(
      ctx.graph,
    );

  let result =
    analyzer.analyze(
      ctx.project.id,
    );

  if (
    input.confidence &&
    input.confidence !==
      "all"
  ) {
    const minimum =
      RANK[
        input.confidence
      ];

    result =
      result.filter(
        (item) =>
          RANK[
            item.confidence
          ] >= minimum,
      );
  }

  if (
    input.filePath
  ) {
    result =
      result.filter(
        (item) =>
          item.filePath ===
          input.filePath,
      );
  }

  const total =
    result.length;

  const limit =
    input.limit ??
    100;

  return {
    total,

    high:
      result.filter(
        (item) =>
          item.confidence ===
          "high",
      ).length,

    medium:
      result.filter(
        (item) =>
          item.confidence ===
          "medium",
      ).length,

    low:
      result.filter(
        (item) =>
          item.confidence ===
          "low",
      ).length,

    warning:
      "Dead-code results are candidates only. Verify before deleting code.",

    candidates:
      result
        .slice(
          0,
          limit,
        ),
  };
}
