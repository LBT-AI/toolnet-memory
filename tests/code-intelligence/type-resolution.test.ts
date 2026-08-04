import {
  mkdtemp,
  mkdir,
  rm,
  writeFile,
} from "node:fs/promises";

import {
  tmpdir,
} from "node:os";

import {
  join,
} from "node:path";

import {
  describe,
  expect,
  it,
} from "vitest";

import {
  RepositoryIndexer,
  TypeScriptTypeResolver,
} from "../../src/code-intelligence/index.js";

describe(
  "TypeScript Type Resolution",
  () => {
    it(
      "resolves obj.method() to the exact method declaration",
      async () => {
        const dir =
          await mkdtemp(
            join(
              tmpdir(),
              "toolnet-resolve-",
            ),
          );

        try {
          await mkdir(
            join(
              dir,
              "src",
            ),
            {
              recursive: true,
            },
          );

          await writeFile(
            join(
              dir,
              "tsconfig.json",
            ),
            JSON.stringify({
              compilerOptions: {
                target:
                  "ES2022",

                module:
                  "NodeNext",

                moduleResolution:
                  "NodeNext",

                strict:
                  true,
              },

              include: [
                "src/**/*.ts",
              ],
            }),
          );

          await writeFile(
            join(
              dir,
              "src/store.ts",
            ),
            `
export class Store {
  save(value: string) {
    return value;
  }
}
`,
          );

          await writeFile(
            join(
              dir,
              "src/app.ts",
            ),
            `
import { Store } from "./store.js";

export function main() {
  const store = new Store();
  return store.save("ok");
}
`,
          );

          const indexed =
            await new RepositoryIndexer()
              .index(
                "test",
                dir,
              );

          const resolution =
            await new TypeScriptTypeResolver(
              indexed.graph,
            ).resolveProject(
              "test",
              dir,
            );

          const save =
            resolution
              .resolutions
              .find(
                (item) =>
                  item.expression ===
                  "store.save",
              );

          expect(
            save,
          ).toBeTruthy();

          expect(
            save?.targetFile,
          ).toBe(
            "src/store.ts",
          );

          expect(
            save?.confidence,
          ).not.toBe(
            "fallback",
          );
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
