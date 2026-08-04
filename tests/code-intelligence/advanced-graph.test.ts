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
  CallGraphTracer,
  ImpactAnalyzer,
} from "../../src/code-intelligence/index.js";

describe(
  "Advanced Code Graph",
  () => {
    it(
      "indexes imports inheritance implementations and cross-file calls",
      async () => {
        const dir =
          await mkdtemp(
            join(
              tmpdir(),
              "toolnet-graph-",
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
              "src/base.ts",
            ),
            `
export interface Repository {
  save(): boolean;
}

export class BaseService {
  boot() {
    return true;
  }
}

export function saveUser() {
  return true;
}
`,
          );

          await writeFile(
            join(
              dir,
              "src/user.ts",
            ),
            `
import {
  BaseService,
  Repository,
  saveUser
} from "./base";

export class UserService extends BaseService implements Repository {
  save() {
    return saveUser();
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
import { UserService } from "./user";

export function main() {
  const service = new UserService();
  return service.save();
}
`,
          );

          const result =
            await new RepositoryIndexer()
              .index(
                "test",
                dir,
              );

          const edges =
            result.graph
              .allEdges(
                "test",
              );

          expect(
            edges.some(
              (edge) =>
                edge.type ===
                "IMPORTS",
            ),
          ).toBe(true);

          expect(
            edges.some(
              (edge) =>
                edge.type ===
                "INHERITS",
            ),
          ).toBe(true);

          expect(
            edges.some(
              (edge) =>
                edge.type ===
                "IMPLEMENTS",
            ),
          ).toBe(true);

          const saveUser =
            result.graph
              .findByName(
                "test",
                "saveUser",
              )[0];

          const saveMethod =
            result.graph
              .findByName(
                "test",
                "UserService.save",
              )[0];

          expect(
            saveUser,
          ).toBeTruthy();

          expect(
            saveMethod,
          ).toBeTruthy();

          const tracer =
            new CallGraphTracer(
              result.graph,
            );

          const callers =
            tracer.callers(
              "test",
              saveUser!.id,
            );

          expect(
            callers.some(
              (item) =>
                item.symbol
                  .qualifiedName ===
                "UserService.save",
            ),
          ).toBe(true);

          const impact =
            new ImpactAnalyzer(
              result.graph,
            ).analyze(
              "test",
              saveUser!.id,
            );

          expect(
            impact.length,
          ).toBeGreaterThan(
            0,
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
