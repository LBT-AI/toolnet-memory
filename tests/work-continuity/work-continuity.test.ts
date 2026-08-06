import {
  mkdtempSync,
  rmSync,
} from "node:fs";

import {
  tmpdir,
} from "node:os";

import {
  join,
} from "node:path";

import {
  afterEach,
  describe,
  expect,
  it,
} from "vitest";

import type {
  ProjectManifest,
} from "../../src/core/types.js";

import type {
  StorageObject,
  StorageProvider,
} from "../../src/storage/types.js";

import {
  SessionCore,
} from "../../src/session/core.js";

import {
  loadWorkState,
  reconcileWorkState,
} from "../../src/work-continuity/index.js";

class MemoryStorage
  implements StorageProvider
{
  readonly name =
    "memory";

  readonly objects =
    new Map<
      string,
      Uint8Array
    >();

  async put(
    key: string,
    data:
      string |
      Uint8Array,
  ) {
    this.objects.set(
      key,
      typeof data ===
        "string"
        ? Buffer.from(
            data,
          )
        : data,
    );
  }

  async get(
    key: string,
  ) {
    return this.objects.get(
      key,
    ) ??
    null;
  }

  async getText(
    key: string,
  ) {
    const value =
      await this.get(
        key,
      );

    return value
      ? Buffer.from(
          value,
        ).toString(
          "utf8",
        )
      : null;
  }

  async exists(
    key: string,
  ) {
    return this.objects.has(
      key,
    );
  }

  async delete(
    key: string,
  ) {
    this.objects.delete(
      key,
    );
  }

  async list(
    prefix =
      "",
  ): Promise<
    StorageObject[]
  > {
    return Array.from(
      this.objects.entries(),
    )
      .filter(
        ([key]) =>
          key.startsWith(
            prefix,
          ),
      )
      .map(
        (
          [key, value],
        ) => ({
          key,
          size:
            value.byteLength,
        }),
      );
  }
}

const roots:
  string[] = [];

function project():
  ProjectManifest {
  const root =
    mkdtempSync(
      join(
        tmpdir(),
        "toolnet-work-",
      ),
    );

  roots.push(
    root,
  );

  const now =
    new Date()
      .toISOString();

  return {
    id:
      "project-work-test",

    name:
      "ProjectA",

    remote:
      "ProjectA",

    rootPath:
      root,

    createdAt:
      now,

    updatedAt:
      now,

    graphVersion:
      0,

    memoryVersion:
      0,
  };
}

afterEach(
  () => {
    while (
      roots.length
    ) {
      rmSync(
        roots.pop()!,
        {
          recursive:
            true,

          force:
            true,
        },
      );
    }
  },
);

describe(
  "Work Continuity",
  () => {
    it(
      "tracks plan progress and unfinished work",
      async () => {
        const p =
          project();

        const storage =
          new MemoryStorage();

        const opencode =
          new SessionCore({
            project:
              p,

            storage,

            agent:
              "opencode",

            nativeSessionId:
              "ses_plan",
          });

        opencode.record({
          type:
            "assistant_message",

          role:
            "assistant",

          data: {
            content:
`Mục tiêu: Hoàn thiện hệ thống memory mới
Kế hoạch: triển khai theo 4 phase
Phase 1 - Session Core
Phase 2 - Work Continuity
Phase 3 - Context Injection
Phase 4 - Guardrails
TODO 1: Hoàn thiện schema
TODO 2: Viết adapter
TODO 3: Chạy E2E`,
          },
        });

        opencode.record({
          type:
            "assistant_message",

          role:
            "assistant",

          data: {
            content:
`Phase 1 hoàn thành
Phase 2 đang làm
TODO 1 hoàn thành
TODO 2 đang làm`,
          },
        });

        await opencode.flush();

        const state =
          await loadWorkState(
            p,
            storage,
          );

        expect(
          state?.goal,
        ).toContain(
          "memory mới",
        );

        expect(
          state?.currentPhase
            ?.order,
        ).toBe(
          2,
        );

        expect(
          state?.progress
            .phasesCompleted,
        ).toBe(
          1,
        );

        expect(
          state?.currentTask
            ?.title,
        ).toContain(
          "Viết adapter",
        );
      },
    );

    it(
      "continues same project across OpenCode -> Agy -> Codex",
      async () => {
        const p =
          project();

        const storage =
          new MemoryStorage();

        const opencode =
          new SessionCore({
            project:
              p,

            storage,

            agent:
              "opencode",

            nativeSessionId:
              "ses_A",
          });

        opencode.record({
          type:
            "assistant_message",

          role:
            "assistant",

          data: {
            content:
`Phase 1 - Setup
Phase 2 - Build
Phase 3 - Test
Phase 4 - Deploy
Phase 1 hoàn thành
Phase 2 đang làm`,
          },
        });

        await opencode.flush();

        const agy =
          new SessionCore({
            project:
              p,

            storage,

            agent:
              "agy",

            nativeSessionId:
              "agy-B",
          });

        agy.record({
          type:
            "assistant_message",

          role:
            "assistant",

          data: {
            content:
`Phase 2 hoàn thành
Phase 3 đang làm
Bước tiếp theo: hoàn tất Phase 3 rồi chuyển Phase 4`,
          },
        });

        await agy.flush();

        const codex =
          new SessionCore({
            project:
              p,

            storage,

            agent:
              "codex",

            nativeSessionId:
              "thread-C",
          });

        codex.record({
          type:
            "session_idle",

          data: {},
        });

        await codex.flush();

        const state =
          await reconcileWorkState(
            p,
            storage,
          );

        expect(
          state.currentPhase
            ?.order,
        ).toBe(
          3,
        );

        expect(
          state.progress
            .phasesCompleted,
        ).toBe(
          2,
        );

        expect(
          state.lastSession
            ?.agent,
        ).toBe(
          "codex",
        );

        expect(
          state.nextActions
            .some(
              value =>
                value.includes(
                  "Phase 3",
                ),
            ),
        ).toBe(
          true,
        );
      },
    );

    it(
      "does not mutate phase status from a next-action reference",
      async () => {
        const p =
          project();

        const storage =
          new MemoryStorage();

        const core =
          new SessionCore({
            project:
              p,

            storage,

            agent:
              "agy",

            nativeSessionId:
              "agy-next-action",
          });

        core.record({
          type:
            "assistant_message",

          role:
            "assistant",

          data: {
            content:
`Phase 1 - Setup
Phase 2 - Build
Phase 3 - Test
Phase 4 - Deploy
Phase 1 hoàn thành
Phase 2 hoàn thành
Phase 3 đang làm
Bước tiếp theo: hoàn tất Phase 3 rồi chuyển Phase 4`,
          },
        });

        await core.flush();

        const state =
          await loadWorkState(
            p,
            storage,
          );

        expect(
          state?.currentPhase?.order,
        ).toBe(
          3,
        );

        expect(
          state?.phases.find(
            item =>
              item.order === 3,
          )?.status,
        ).toBe(
          "in_progress",
        );

        expect(
          state?.phases.find(
            item =>
              item.order === 4,
          )?.status,
        ).toBe(
          "pending",
        );

        expect(
          state?.nextActions.some(
            item =>
              item.includes(
                "Phase 3",
              ),
          ),
        ).toBe(
          true,
        );
      },
    );

    it(
      "does not reset completed phase when old plan is restated",
      async () => {
        const p =
          project();

        const storage =
          new MemoryStorage();

        const first =
          new SessionCore({
            project:
              p,

            storage,

            agent:
              "opencode",

            nativeSessionId:
              "one",
          });

        first.record({
          type:
            "assistant_message",

          role:
            "assistant",

          data: {
            content:
              "Phase 1 hoàn thành",
          },
        });

        await first.flush();

        const second =
          new SessionCore({
            project:
              p,

            storage,

            agent:
              "agy",

            nativeSessionId:
              "two",
          });

        second.record({
          type:
            "assistant_message",

          role:
            "assistant",

          data: {
            content:
              "Phase 1 - Setup",
          },
        });

        await second.flush();

        const state =
          await loadWorkState(
            p,
            storage,
          );

        expect(
          state?.phases[0]
            .status,
        ).toBe(
          "completed",
        );
      },
    );
  },
);
