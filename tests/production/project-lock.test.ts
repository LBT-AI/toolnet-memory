import {
  randomUUID,
} from "node:crypto";

import {
  describe,
  expect,
  it,
} from "vitest";

import {
  ProjectLock,
} from "../../src/production/project-lock.js";

describe(
  "Project Lock",
  () => {
    it(
      "prevents concurrent writers",
      async () => {
        const id =
          randomUUID();

        const first =
          new ProjectLock(id);

        const second =
          new ProjectLock(id);

        await first.acquire();

        await expect(
          second.acquire(),
        ).rejects.toThrow(
          "already running",
        );

        await first.release();

        await second.acquire();
        await second.release();
      },
    );
  },
);
