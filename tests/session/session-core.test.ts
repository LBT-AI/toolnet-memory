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
  createSessionIdentity,
  RemoteSessionStore,
  SessionCore,
} from "../../src/session/index.js";

class MemoryStorage
  implements StorageProvider
{
  readonly name =
    "memory-test";

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
  ): Promise<void> {
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
  ): Promise<
    Uint8Array |
    null
  > {
    return (
      this.objects.get(
        key,
      ) ??
      null
    );
  }

  async getText(
    key: string,
  ): Promise<
    string |
    null
  > {
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
  ): Promise<boolean> {
    return this.objects.has(
      key,
    );
  }

  async delete(
    key: string,
  ): Promise<void> {
    this.objects.delete(
      key,
    );
  }

  async list(
    prefix:
      string = "",
  ): Promise<
    StorageObject[]
  > {
    return Array.from(
      this.objects
        .entries(),
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

const temporaryRoots:
  string[] = [];

function project():
  ProjectManifest {
  const root =
    mkdtempSync(
      join(
        tmpdir(),
        "toolnet-session-",
      ),
    );

  temporaryRoots.push(
    root,
  );

  const now =
    new Date()
      .toISOString();

  return {
    id:
      "project-test-id",

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
      temporaryRoots.length
    ) {
      rmSync(
        temporaryRoots.pop()!,
        {
          recursive: true,
          force: true,
        },
      );
    }
  },
);

describe(
  "Session Core",
  () => {
    it(
      "uses the native agent session ID as stable identity",
      () => {
        const current =
          project();

        const first =
          createSessionIdentity(
            current,
            "opencode",
            "ses_04ff0d26fffeQoqiRrE0S8ap2b",
          );

        const second =
          createSessionIdentity(
            current,
            "opencode",
            "ses_other",
          );

        expect(
          first.sessionKey,
        ).toBe(
          "opencode:ses_04ff0d26fffeQoqiRrE0S8ap2b",
        );

        expect(
          first.remotePrefix,
        ).toContain(
          "/sessions/opencode/ses_04ff0d26fffeQoqiRrE0S8ap2b",
        );

        expect(
          first.remotePrefix,
        ).not.toBe(
          second.remotePrefix,
        );

        expect(
          () =>
            createSessionIdentity(
              current,
              "agy",
              " ",
            ),
        ).toThrow(
          "Native session ID is required",
        );
      },
    );

    it(
      "writes local WAL first and uploads immutable event chunks",
      async () => {
        const storage =
          new MemoryStorage();

        const core =
          new SessionCore({
            project:
              project(),

            storage,

            agent:
              "opencode",

            nativeSessionId:
              "ses_test_123",

            title:
              "Test session",

            maxEventsPerChunk:
              100,
          });

        core.start({
          cwd:
            "/project",
        });

        core.recordMany(
          Array.from(
            {
              length:
                204,
            },
            (
              _,
              index,
            ) => ({
              type:
                "message" as const,

              sourceEventId:
                `message-${index}`,

              sourceSequence:
                index,

              role:
                index % 2 ===
                0
                  ? "user"
                  : "assistant",

              data: {
                index,
              },

              provenance: {
                source:
                  "opencode.db",

                sourceTable:
                  "message",

                sourceRowId:
                  `message-${index}`,
              },
            }),
          ),
        );

        core.setSourceCursor(
          "opencode.message",
          204,
        );

        const firstFlush =
          await core.flush();

        expect(
          firstFlush.uploadedEvents,
        ).toBe(
          205,
        );

        expect(
          firstFlush.eventCount,
        ).toBe(
          205,
        );

        expect(
          firstFlush.chunkCount,
        ).toBe(
          3,
        );

        const eventKeys =
          Array.from(
            storage.objects.keys(),
          ).filter(
            key =>
              key.includes(
                "/events/",
              ),
          );

        expect(
          eventKeys,
        ).toHaveLength(
          3,
        );

        const manifest =
          JSON.parse(
            (
              await storage.getText(
                `${core.identity.remotePrefix}/session.json`,
              )
            )!,
          );

        expect(
          manifest.nativeSessionId,
        ).toBe(
          "ses_test_123",
        );

        expect(
          manifest.eventCount,
        ).toBe(
          205,
        );

        const cursor =
          JSON.parse(
            (
              await storage.getText(
                `${core.identity.remotePrefix}/cursor.json`,
              )
            )!,
          );

        expect(
          cursor.sourceCursors[
            "opencode.message"
          ],
        ).toBe(
          "204",
        );

        /*
         * No local changes:
         * second flush uploads nothing.
         */
        const secondFlush =
          await core.flush();

        expect(
          secondFlush.uploadedEvents,
        ).toBe(
          0,
        );

        expect(
          Array.from(
            storage.objects.keys(),
          ).filter(
            key =>
              key.includes(
                "/events/",
              ),
          ),
        ).toHaveLength(
          3,
        );

        const ended =
          await core.end({
            reason:
              "agent process exited",
          });

        expect(
          ended.status,
        ).toBe(
          "idle",
        );

        expect(
          ended.eventCount,
        ).toBe(
          206,
        );
      },
    );

    it(
      "recovers sequence state from immutable chunks when pointers are missing",
      async () => {
        const storage =
          new MemoryStorage();

        const core =
          new SessionCore({
            project:
              project(),

            storage,

            agent:
              "agy",

            nativeSessionId:
              "09b96c5e-2d82-4c36-90a3-196b2de5626f",

            maxEventsPerChunk:
              2,
          });

        core.start();

        core.recordMany([
          {
            type:
              "user_prompt",

            sourceEventId:
              "step-1",

            data: {
              text:
                "one",
            },
          },
          {
            type:
              "assistant_message",

            sourceEventId:
              "step-2",

            data: {
              text:
                "two",
            },
          },
        ]);

        await core.flush();

        await storage.delete(
          `${core.identity.remotePrefix}/session.json`,
        );

        await storage.delete(
          `${core.identity.remotePrefix}/cursor.json`,
        );

        const remote =
          new RemoteSessionStore(
            storage,
            2,
          );

        const recovered =
          await remote.recover(
            core.identity,
          );

        expect(
          recovered.maxSequence,
        ).toBe(
          3,
        );

        expect(
          recovered.chunkCount,
        ).toBe(
          2,
        );
      },
    );
  },
);
