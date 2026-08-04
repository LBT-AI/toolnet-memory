import type {
  MemoryType,
} from "../core/types.js";

export interface QueryAnalysis {
  query: string;
  preferredTypes: MemoryType[];
}

export class QueryAnalyzer {
  analyze(
    query: string,
  ): QueryAnalysis {
    const text =
      query.toLowerCase();

    const preferredTypes:
      MemoryType[] = [];

    if (
      text.includes("quyết định") ||
      text.includes("decision") ||
      text.includes("đã chọn")
    ) {
      preferredTypes.push(
        "decision",
      );
    }

    if (
      text.includes("todo") ||
      text.includes("cần làm") ||
      text.includes("tiếp theo") ||
      text.includes("chưa xong")
    ) {
      preferredTypes.push(
        "todo",
      );
    }

    if (
      text.includes("quy tắc") ||
      text.includes("rule") ||
      text.includes("không được") ||
      text.includes("bắt buộc")
    ) {
      preferredTypes.push(
        "rule",
      );
    }

    if (
      text.includes("tóm tắt") ||
      text.includes("summary") ||
      text.includes("đã làm")
    ) {
      preferredTypes.push(
        "summary",
      );
    }

    return {
      query,
      preferredTypes,
    };
  }
}
