import {
  describe,
  expect,
  it,
} from "vitest";

import {
  diffManifest,
  type CodeManifest,
} from "../../src/code-intelligence/incremental/manifest.js";

describe("Incremental Code Index", () => {
  it("detects added modified deleted and unchanged files", () => {
    const previous: CodeManifest = {
      version: 1,
      projectId: "test",
      updatedAt: "",
      files: {
        "same.ts": {
          path: "same.ts",
          hash: "1",
        },
        "modified.ts": {
          path: "modified.ts",
          hash: "old",
        },
        "deleted.ts": {
          path: "deleted.ts",
          hash: "3",
        },
      },
    };

    const current: CodeManifest = {
      version: 1,
      projectId: "test",
      updatedAt: "",
      files: {
        "same.ts": {
          path: "same.ts",
          hash: "1",
        },
        "modified.ts": {
          path: "modified.ts",
          hash: "new",
        },
        "added.ts": {
          path: "added.ts",
          hash: "4",
        },
      },
    };

    const result =
      diffManifest(previous, current);

    expect(result.added).toEqual([
      "added.ts",
    ]);

    expect(result.modified).toEqual([
      "modified.ts",
    ]);

    expect(result.deleted).toEqual([
      "deleted.ts",
    ]);

    expect(result.unchanged).toEqual([
      "same.ts",
    ]);
  });
});
