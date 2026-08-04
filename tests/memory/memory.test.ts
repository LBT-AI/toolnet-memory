import {
  describe,
  expect,
  it,
} from "vitest";

import {
  MemoryEngine,
} from "../../src/core/memory-engine.js";

import {
  MemoryProcessor,
} from "../../src/processor/memory-processor.js";

describe(
  "Auto Memory Processor",
  () => {
    it(
      "extracts rule decision todo and summary",
      () => {
        const memory =
          new MemoryEngine();

        const processor =
          new MemoryProcessor(
            memory,
          );

        processor.process([
          {
            id: "1",
            projectId: "test",
            type: "user_prompt",
            timestamp:
              new Date().toISOString(),
            data: {
              content:
                "Không được sửa production trực tiếp",
            },
          },
          {
            id: "2",
            projectId: "test",
            type: "decision",
            timestamp:
              new Date().toISOString(),
            data: {
              content:
                "Quyết định dùng PostgreSQL",
            },
          },
          {
            id: "3",
            projectId: "test",
            type: "todo",
            timestamp:
              new Date().toISOString(),
            data: {
              content:
                "TODO thêm vector search",
            },
          },
          {
            id: "4",
            projectId: "test",
            type: "file_write",
            timestamp:
              new Date().toISOString(),
            data: {
              filePath:
                "src/auth.ts",
            },
          },
        ]);

        const records =
          memory.list(
            "test",
          );

        expect(
          records.some(
            (item) =>
              item.type ===
              "rule",
          ),
        ).toBe(true);

        expect(
          records.some(
            (item) =>
              item.type ===
              "decision",
          ),
        ).toBe(true);

        expect(
          records.some(
            (item) =>
              item.type ===
              "todo",
          ),
        ).toBe(true);

        expect(
          records.some(
            (item) =>
              item.type ===
              "summary",
          ),
        ).toBe(true);
      },
    );
  },
);
