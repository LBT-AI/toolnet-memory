import {
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";

import {
  tmpdir,
} from "node:os";

import {
  join,
} from "node:path";

import {
  DatabaseSync,
} from "node:sqlite";

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
  syncOpenCodeSession,
} from "../../src/session/opencode/index.js";

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
    return (
      this.objects.get(
        key,
      ) ??
      null
    );
  }

  async getText(
    key: string,
  ) {
    const data =
      await this.get(
        key,
      );

    return data
      ? Buffer.from(
          data,
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
        (
          [key, data],
        ) => ({
          key,
          size:
            data.byteLength,
        }),
      );
  }
}

const roots:
  string[] = [];

function createProject():
  ProjectManifest {
  const root =
    mkdtempSync(
      join(
        tmpdir(),
        "tn-opencode-project-",
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
      "project-opencode-test",

    name:
      "test-project",

    remote:
      "test-project",

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

function createDatabase(
  project:
    ProjectManifest,
) {
  const directory =
    mkdtempSync(
      join(
        tmpdir(),
        "tn-opencode-db-",
      ),
    );

  roots.push(
    directory,
  );

  const path =
    join(
      directory,
      "opencode.db",
    );

  const db =
    new DatabaseSync(
      path,
    );

  db.exec(`
    CREATE TABLE project (
      id TEXT PRIMARY KEY,
      worktree TEXT,
      name TEXT,
      time_created INTEGER,
      time_updated INTEGER
    );

    CREATE TABLE project_directory (
      project_id TEXT,
      directory TEXT,
      type TEXT,
      strategy TEXT,
      time_created INTEGER,
      PRIMARY KEY (
        project_id,
        directory
      )
    );

    CREATE TABLE session (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      directory TEXT,
      path TEXT,
      title TEXT,
      time_created INTEGER,
      time_updated INTEGER
    );

    CREATE TABLE message (
      id TEXT PRIMARY KEY,
      session_id TEXT,
      time_created INTEGER,
      time_updated INTEGER,
      data TEXT
    );

    CREATE TABLE part (
      id TEXT PRIMARY KEY,
      message_id TEXT,
      session_id TEXT,
      time_created INTEGER,
      time_updated INTEGER,
      data TEXT
    );
  `);

  db.prepare(
    `
    INSERT INTO project
    VALUES (?, ?, ?, ?, ?)
    `,
  ).run(
    "oc-project",
    project.rootPath,
    "test",
    1000,
    1000,
  );

  db.prepare(
    `
    INSERT INTO project_directory
    VALUES (?, ?, ?, ?, ?)
    `,
  ).run(
    "oc-project",
    project.rootPath,
    "worktree",
    "default",
    1000,
  );

  db.prepare(
    `
    INSERT INTO session
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(
    "ses_test",
    "oc-project",
    project.rootPath,
    project.rootPath,
    "Test conversation",
    1000,
    2000,
  );

  return {
    db,
    path,
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
  "OpenCode adapter",
  () => {
    it(
      "imports message + part incrementally with native session ID",
      async () => {
        const project =
          createProject();

        const storage =
          new MemoryStorage();

        const {
          db,
          path,
        } =
          createDatabase(
            project,
          );

        db.prepare(
          `
          INSERT INTO message
          VALUES (?, ?, ?, ?, ?)
          `,
        ).run(
          "msg_1",
          "ses_test",
          1100,
          1100,
          JSON.stringify({
            role:
              "user",

            path: {
              cwd:
                project.rootPath,

              root:
                project.rootPath,
            },
          }),
        );

        db.prepare(
          `
          INSERT INTO part
          VALUES (?, ?, ?, ?, ?, ?)
          `,
        ).run(
          "part_1",
          "msg_1",
          "ses_test",
          1200,
          1200,
          JSON.stringify({
            type:
              "text",

            text:
              "hello",
          }),
        );

        db.close();

        const first =
          await syncOpenCodeSession({
            project,
            storage,

            nativeSessionId:
              "ses_test",

            dbPath:
              path,

            idle:
              true,
          });

        expect(
          first
            .importedMessages,
        ).toBe(
          1,
        );

        expect(
          first
            .importedParts,
        ).toBe(
          1,
        );

        expect(
          first.eventCount,
        ).toBe(
          4,
        );

        /*
         * Same source state:
         * nothing should be duplicated.
         */
        const second =
          await syncOpenCodeSession({
            project,
            storage,

            nativeSessionId:
              "ses_test",

            dbPath:
              path,

            idle:
              true,
          });

        expect(
          second
            .importedMessages,
        ).toBe(
          0,
        );

        expect(
          second
            .importedParts,
        ).toBe(
          0,
        );

        expect(
          second.eventCount,
        ).toBe(
          4,
        );
      },
    );

    it(
      "captures updated rows and redacts secrets",
      async () => {
        const project =
          createProject();

        const storage =
          new MemoryStorage();

        const {
          db,
          path,
        } =
          createDatabase(
            project,
          );

        db.prepare(
          `
          INSERT INTO message
          VALUES (?, ?, ?, ?, ?)
          `,
        ).run(
          "msg_1",
          "ses_test",
          1100,
          1100,
          JSON.stringify({
            role:
              "assistant",
          }),
        );

        db.prepare(
          `
          INSERT INTO part
          VALUES (?, ?, ?, ?, ?, ?)
          `,
        ).run(
          "part_1",
          "msg_1",
          "ses_test",
          1200,
          1200,
          JSON.stringify({
            type:
              "tool",

            tool:
              "bash",

            token:
              "super-secret-token",

            state: {
              input: {
                command:
                  "echo hello",
              },

              output:
                "done",
            },
          }),
        );

        db.close();

        await syncOpenCodeSession({
          project,
          storage,

          nativeSessionId:
            "ses_test",

          dbPath:
            path,
        });

        const remoteText =
          Array.from(
            storage.objects
              .values(),
          )
            .map(
              value =>
                Buffer.from(
                  value,
                ).toString(
                  "utf8",
                ),
            )
            .join(
              "\n",
            );

        expect(
          remoteText,
        ).not.toContain(
          "super-secret-token",
        );

        expect(
          remoteText,
        ).toContain(
          "[REDACTED]",
        );
      },
    );

    it(
      "refuses cross-project session capture",
      async () => {
        const project =
          createProject();

        const storage =
          new MemoryStorage();

        const {
          db,
          path,
        } =
          createDatabase(
            project,
          );

        db.prepare(
          `
          UPDATE session
          SET directory = ?
          WHERE id = ?
          `,
        ).run(
          "/completely/different/project",
          "ses_test",
        );

        db.prepare(
          `
          UPDATE project
          SET worktree = ?
          WHERE id = ?
          `,
        ).run(
          "/completely/different/project",
          "oc-project",
        );

        db.prepare(
          `
          UPDATE project_directory
          SET directory = ?
          WHERE project_id = ?
          `,
        ).run(
          "/completely/different/project",
          "oc-project",
        );

        db.close();

        await expect(
          syncOpenCodeSession({
            project,
            storage,

            nativeSessionId:
              "ses_test",

            dbPath:
              path,
          }),
        ).rejects.toThrow(
          "does not belong",
        );
      },
    );
  },
);
