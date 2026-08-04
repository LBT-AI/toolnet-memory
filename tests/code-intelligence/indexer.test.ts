import {
  mkdtemp,
  rm,
  writeFile,
} from "node:fs/promises";

import {
  join,
} from "node:path";

import {
  tmpdir,
} from "node:os";

import {
  describe,
  expect,
  it,
} from "vitest";

import {
  RepositoryIndexer,
} from "../../src/code-intelligence/indexer/repository-indexer.js";

import {
  ReferenceResolver,
} from "../../src/code-intelligence/symbols/reference-resolver.js";

describe(
  "Code Intelligence",
  () => {
    it(
      "indexes symbols and call relationships",
      async () => {
        const dir =
          await mkdtemp(
            join(
              tmpdir(),
              "toolnet-code-",
            ),
          );

        try {
          await writeFile(
            join(
              dir,
              "app.ts",
            ),
            `
function saveUser() {
  return true;
}

function createUser() {
  return saveUser();
}

createUser();
`,
          );

          const result =
            await new RepositoryIndexer()
              .index(
                "test",
                dir,
              );

          expect(
            result.files,
          ).toBe(1);

          const createUser =
            result.graph
              .findByName(
                "test",
                "createUser",
              )[0];

          const saveUser =
            result.graph
              .findByName(
                "test",
                "saveUser",
              )[0];

          expect(
            createUser,
          ).toBeTruthy();

          expect(
            saveUser,
          ).toBeTruthy();

          const resolver =
            new ReferenceResolver(
              result.graph,
            );

          const callers =
            resolver.findCallers(
              "test",
              saveUser!.id,
            );

          expect(
            callers.some(
              (symbol) =>
                symbol.name ===
                "createUser",
            ),
          ).toBe(true);
        } finally {
          await rm(
            dir,
            {
              recursive: true,
              force: true,
            },
          );
        }
      },
    );
  },
);
