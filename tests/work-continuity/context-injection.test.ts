import {
  mkdtempSync,
  readFileSync,
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
  buildAgyPreInvocationOutput,
  buildCodexSessionStartOutput,
  getStartupBriefForInjection,
  refreshStartupBriefCache,
  startupBriefFile,
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
        ? Buffer.from(data)
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
      await this.get(key);

    return value
      ? Buffer.from(value)
          .toString("utf8")
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
    prefix = "",
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
        ([key, value]) => ({
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
        "toolnet-injection-",
      ),
    );

  roots.push(root);

  const now =
    new Date()
      .toISOString();

  return {
    id:
      "injection-project",

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
  "Cross-Agent Context Injection",
  () => {
    it(
      "pulls the remote canonical Startup Brief into local project cache",
      async () => {
        const p =
          project();

        const storage =
          new MemoryStorage();

        await storage.put(
          `projects/${p.id}/context/startup.md`,
          `[TOOLNET PROJECT CONTEXT]

MISSION
Build continuity layer.

CURRENT OBJECTIVE
Continue Phase 4 with rationale.
`,
        );

        const cache =
          await getStartupBriefForInjection(
            p,
            storage,
          );

        expect(
          cache?.text,
        ).toContain(
          "Build continuity layer",
        );

        expect(
          readFileSync(
            startupBriefFile(p),
            "utf8",
          ),
        ).toContain(
          "Continue Phase 4",
        );
      },
    );


    it(
      "Agy injects ephemeral Startup Brief and avoids immediate duplicates",
      async () => {
        const p =
          project();

        const storage =
          new MemoryStorage();

        await storage.put(
          `projects/${p.id}/context/startup.md`,
          `[TOOLNET PROJECT CONTEXT]
MISSION
Cross-agent continuity.
CURRENT OBJECTIVE
Phase 4.
`,
        );

        const markers =
          mkdtempSync(
            join(
              tmpdir(),
              "toolnet-injection-markers-",
            ),
          );

        roots.push(markers);

        const first =
          await buildAgyPreInvocationOutput({
            project:
              p,

            storage,

            conversationId:
              "agy-123",

            invocationNum:
              0,

            markerDirectory:
              markers,

            now:
              1000000,
          });

        expect(
          JSON.stringify(first),
        ).toContain(
          "userMessage",
        );

        const second =
          await buildAgyPreInvocationOutput({
            project:
              p,

            storage,

            conversationId:
              "agy-123",

            invocationNum:
              1,

            markerDirectory:
              markers,

            now:
              1001000,
          });

        expect(
          second,
        ).toEqual({});
      },
    );


    it(
      "Agy reinjects when an old conversation is resumed after a long pause",
      async () => {
        const p =
          project();

        const storage =
          new MemoryStorage();

        await storage.put(
          `projects/${p.id}/context/startup.md`,
          "MISSION\nResume safely.",
        );

        const markers =
          mkdtempSync(
            join(
              tmpdir(),
              "toolnet-resume-",
            ),
          );

        roots.push(markers);

        await buildAgyPreInvocationOutput({
          project:
            p,

          storage,

          conversationId:
            "same-uuid",

          invocationNum:
            0,

          markerDirectory:
            markers,

          now:
            1_000_000,
        });

        const resumed =
          await buildAgyPreInvocationOutput({
            project:
              p,

            storage,

            conversationId:
              "same-uuid",

            invocationNum:
              12,

            markerDirectory:
              markers,

            now:
              1_000_000 +
              7 * 60 * 60 * 1000,
          });

        expect(
          JSON.stringify(
            resumed,
          ),
        ).toContain(
          "userMessage",
        );
      },
    );


    it(
      "Codex SessionStart returns model-visible project continuity",
      async () => {
        const p =
          project();

        const storage =
          new MemoryStorage();

        await storage.put(
          `projects/${p.id}/context/startup.md`,
          `[TOOLNET PROJECT CONTEXT]
MISSION
Know what we are building.
WHY THIS WORK MATTERS
Avoid blind continuation.
`,
        );

        const output =
          await buildCodexSessionStartOutput({
            project:
              p,

            storage,
          });

        expect(
          JSON.stringify(
            output,
          ),
        ).toContain(
          "SessionStart",
        );

        expect(
          JSON.stringify(
            output,
          ),
        ).toContain(
          "Avoid blind continuation",
        );
      },
    );
  },
);
