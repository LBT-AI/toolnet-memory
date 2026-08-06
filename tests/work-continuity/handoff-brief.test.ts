import {
  mkdtempSync,
  rmSync,
  writeFileSync,
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
  ensureProjectManual,
} from "../../src/project-manual/index.js";

import {
  SessionCore,
} from "../../src/session/core.js";

import {
  buildStartupBrief,
  loadLatestHandoff,
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
  string[] =
  [];


function project():
  ProjectManifest {
  const root =
    mkdtempSync(
      join(
        tmpdir(),
        "toolnet-handoff-",
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
      "handoff-project",

    name:
      "Mercedes",

    remote:
      "Mercedes",

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
  "Smart Handoff + Startup Brief",
  () => {
    it(
      "creates a handoff for unfinished work automatically",
      async () => {
        const p =
          project();

        const storage =
          new MemoryStorage();

        const manual =
          ensureProjectManual(
            p,
          );

        writeFileSync(
          manual,
`# Mercedes

## Critical Rules
- [enforce] Only edit source at /root/mercedes/mercedes-vns
- [enforce] Never edit production directly.
`,
        );

        const core =
          new SessionCore({
            project:
              p,

            storage,

            agent:
              "opencode",

            nativeSessionId:
              "ses_yesterday",
          });

        core.record({
          type:
            "assistant_message",

          role:
            "assistant",

          data: {
            content:
`Mục tiêu: Hoàn thiện theme Mercedes
Phase 1 - Audit
Phase 2 - Fix mobile
Phase 3 - Deploy
Phase 1 hoàn thành
Phase 2 đang làm
TODO 1: sửa menu mobile
TODO 1 đang làm
Bước tiếp theo: hoàn tất Phase 2 rồi chạy QA`,
          },
        });

        await core.idle({
          reason:
            "user stopped",
        });

        const handoff =
          await loadLatestHandoff(
            p,
            storage,
          );

        expect(
          handoff,
        ).not.toBeNull();

        expect(
          handoff
            ?.currentPhase
            ?.order,
        ).toBe(
          2,
        );

        expect(
          handoff
            ?.currentTask
            ?.title,
        ).toContain(
          "sửa menu mobile",
        );

        expect(
          handoff
            ?.attention
            .some(
              item =>
                item.includes(
                  "Never edit production",
                ),
            ),
        ).toBe(
          true,
        );

        expect(
          handoff
            ?.nextActions
            .some(
              item =>
                item.includes(
                  "Phase 2",
                ),
            ),
        ).toBe(
          true,
        );
      },
    );


    it(
      "does not create duplicate historical handoffs for unchanged state",
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
              "codex",

            nativeSessionId:
              "thread-1",
          });

        core.record({
          type:
            "assistant_message",

          role:
            "assistant",

          data: {
            content:
`Phase 1 - Build
Phase 2 - Test
Phase 1 đang làm`,
          },
        });

        await core.flush();

        const first =
          (
            await storage.list(
              `projects/${p.id}/work/handoffs/`,
            )
          )
          .filter(
            item =>
              item.key.endsWith(
                ".json",
              ),
          );

        /*
         * Another durable event but no work-state change.
         */
        core.record({
          type:
            "assistant_message",

          role:
            "assistant",

          data: {
            content:
              "Đang tiếp tục xử lý.",
          },
        });

        await core.flush();

        const second =
          (
            await storage.list(
              `projects/${p.id}/work/handoffs/`,
            )
          )
          .filter(
            item =>
              item.key.endsWith(
                ".json",
              ),
          );

        expect(
          second.length,
        ).toBe(
          first.length,
        );
      },
    );


    it(
      "builds a compact startup brief with rules and unfinished work",
      async () => {
        const p =
          project();

        const storage =
          new MemoryStorage();

        const manual =
          ensureProjectManual(
            p,
          );

        writeFileSync(
          manual,
`# Mercedes Project

## Critical Rules
- [enforce] Only edit /root/mercedes/mercedes-vns
- [enforce] Never edit /var/www/mercedesbenz-vns.com directly.
- [enforce] Deploy only with ./deploy-theme.sh --apply

## Workflow
Purge cache after deploy.
Verify HTTP 200.
`,
        );

        const core =
          new SessionCore({
            project:
              p,

            storage,

            agent:
              "agy",

            nativeSessionId:
              "agy-old",
          });

        core.record({
          type:
            "assistant_message",

          role:
            "assistant",

          data: {
            content:
`Mục tiêu: Hoàn thiện giao diện mobile
Phase 1 - Header
Phase 2 - Product Cards
Phase 3 - QA
Phase 1 hoàn thành
Phase 2 đang làm
TODO 1: fix card spacing
TODO 1 đang làm
Bước tiếp theo: hoàn tất Product Cards`,
          },
        });

        await core.idle();

        const brief =
          await buildStartupBrief({
            project:
              p,

            storage,

            maxTokens:
              700,
          });

        expect(
          brief.text,
        ).toContain(
          "Never edit /var/www",
        );

        expect(
          brief.text,
        ).toContain(
          "Current phase: Phase 2",
        );

        expect(
          brief.text,
        ).toContain(
          "fix card spacing",
        );

        expect(
          brief.text,
        ).toContain(
          "agy-old",
        );

        expect(
          brief.estimatedTokens,
        ).toBeLessThanOrEqual(
          700,
        );

        expect(
          brief.hasManual,
        ).toBe(
          true,
        );

        expect(
          brief.hasWorkState,
        ).toBe(
          true,
        );

        expect(
          brief.hasHandoff,
        ).toBe(
          true,
        );
      },
    );
  },
);
