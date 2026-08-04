import {
  createHash,
} from "node:crypto";

import type {
  GraphEdge,
} from "../../core/types.js";

import type {
  CodeGraphStore,
} from "../graph/graph-store.js";

import type {
  ArchitectureCluster,
} from "./types.js";

const EDGE_WEIGHT:
  Partial<Record<GraphEdge["type"], number>> = {
  CALL_REFERENCE: 7,
  CALLS: 3,
  IMPORTS: 4,
  USES_TYPE: 4,
  WRITES: 5,
  INHERITS: 7,
  IMPLEMENTS: 7,
  ROUTE: 4,
  TESTS: 1,
};

function hash(
  value: string,
): string {
  return createHash("sha256")
    .update(value)
    .digest("hex")
    .slice(0, 12);
}

function normalize(
  value: string,
): string {
  return value.replaceAll("\\", "/");
}

function subsystemOf(
  filePath: string,
): string {
  const path =
    normalize(filePath);

  const parts =
    path.split("/")
      .filter(Boolean);

  if (
    parts[0] === "src" &&
    parts[1]
  ) {
    return `src/${parts[1]}`;
  }

  if (
    parts[0] === "packages" &&
    parts[1]
  ) {
    return `packages/${parts[1]}`;
  }

  if (
    parts[0] === "tests"
  ) {
    return "tests";
  }

  if (
    parts[0] === "bin"
  ) {
    return "bin";
  }

  return parts[0] ?? "root";
}

function clusterLabel(
  subsystem: string,
): string {
  const value =
    subsystem
      .replace(/^src\//, "")
      .replace(/^packages\//, "");

  const map:
    Record<string, string> = {
      "code-intelligence":
        "Code Intelligence",

      memory:
        "Memory",

      storage:
        "Storage",

      retrieval:
        "Retrieval",

      runtime:
        "Runtime",

      mcp:
        "MCP",

      hooks:
        "Hooks",

      security:
        "Security",

      snapshot:
        "Snapshots",

      production:
        "Production",

      capture:
        "Capture",

      processor:
        "Processor",

      core:
        "Core",

      tests:
        "Tests",

      bin:
        "CLI",

      sdk:
        "SDK",

      cli:
        "CLI",
    };

  return (
    map[value] ??
    value
  );
}

interface Pair {
  a: string;
  b: string;
  weight: number;
}

export class ClusterDetector {
  constructor(
    private readonly graph:
      CodeGraphStore,
  ) {}

  detect(
    projectId: string,
  ): ArchitectureCluster[] {
    const symbols =
      this.graph.allSymbols(
        projectId,
      );

    const edges =
      this.graph.allEdges(
        projectId,
      );

    const symbolById =
      new Map(
        symbols.map(
          (symbol) => [
            symbol.id,
            symbol,
          ],
        ),
      );

    const files =
      [
        ...new Set(
          symbols.map(
            (symbol) =>
              normalize(
                symbol.filePath,
              ),
          ),
        ),
      ].sort();

    const pairMap =
      new Map<
        string,
        Pair
      >();

    const makeKey =
      (
        a: string,
        b: string,
      ) => {
        const sorted =
          [a, b].sort();

        return `${sorted[0]}\u0000${sorted[1]}`;
      };

    for (
      const edge
      of edges
    ) {
      const from =
        symbolById.get(
          edge.from,
        );

      const to =
        symbolById.get(
          edge.to,
        );

      if (
        !from ||
        !to
      ) {
        continue;
      }

      const a =
        normalize(
          from.filePath,
        );

      const b =
        normalize(
          to.filePath,
        );

      if (a === b) {
        continue;
      }

      const weight =
        EDGE_WEIGHT[
          edge.type
        ] ?? 0;

      if (
        weight <= 0
      ) {
        continue;
      }

      const key =
        makeKey(
          a,
          b,
        );

      const existing =
        pairMap.get(
          key,
        );

      if (existing) {
        existing.weight +=
          weight;
      } else {
        pairMap.set(
          key,
          {
            a:
              [a, b].sort()[0]!,

            b:
              [a, b].sort()[1]!,

            weight,
          },
        );
      }
    }

    /*
     * 1. Base grouping = architectural subsystem.
     */
    const subsystemFiles =
      new Map<
        string,
        string[]
      >();

    for (
      const file
      of files
    ) {
      const subsystem =
        subsystemOf(
          file,
        );

      const group =
        subsystemFiles.get(
          subsystem,
        ) ?? [];

      group.push(
        file,
      );

      subsystemFiles.set(
        subsystem,
        group,
      );
    }

    /*
     * 2. Split very large subsystems by strong internal connectivity.
     *
     * Không để code-intelligence 70+ files trở thành một khối mù.
     */
    const groups:
      {
        subsystem: string;
        files: string[];
      }[] =
      [];

    for (
      const [
        subsystem,
        subsystemGroup,
      ]
      of subsystemFiles
    ) {
      subsystemGroup.sort();

      if (
        subsystemGroup.length <=
        30
      ) {
        groups.push({
          subsystem,
          files:
            subsystemGroup,
        });

        continue;
      }

      const fileSet =
        new Set(
          subsystemGroup,
        );

      const adjacency =
        new Map<
          string,
          Set<string>
        >();

      for (
        const file
        of subsystemGroup
      ) {
        adjacency.set(
          file,
          new Set(),
        );
      }

      for (
        const pair
        of pairMap.values()
      ) {
        if (
          !fileSet.has(
            pair.a,
          ) ||
          !fileSet.has(
            pair.b,
          )
        ) {
          continue;
        }

        /*
         * Strong internal relationship only.
         */
        if (
          pair.weight >=
          8
        ) {
          adjacency.get(
            pair.a,
          )?.add(
            pair.b,
          );

          adjacency.get(
            pair.b,
          )?.add(
            pair.a,
          );
        }
      }

      const visited =
        new Set<string>();

      const components:
        string[][] =
        [];

      for (
        const start
        of subsystemGroup
      ) {
        if (
          visited.has(
            start,
          )
        ) {
          continue;
        }

        const queue =
          [start];

        const component:
          string[] =
          [];

        visited.add(
          start,
        );

        while (
          queue.length >
          0
        ) {
          const current =
            queue.shift()!;

          component.push(
            current,
          );

          for (
            const neighbor
            of adjacency.get(
              current,
            ) ?? []
          ) {
            if (
              visited.has(
                neighbor,
              )
            ) {
              continue;
            }

            visited.add(
              neighbor,
            );

            queue.push(
              neighbor,
            );
          }
        }

        components.push(
          component.sort(),
        );
      }

      /*
       * Strong components >=2 become own clusters.
       * Singleton files remain one residual subsystem cluster.
       */
      const residual:
        string[] =
        [];

      for (
        const component
        of components
      ) {
        if (
          component.length >=
          2
        ) {
          groups.push({
            subsystem,
            files:
              component,
          });
        } else {
          residual.push(
            ...component,
          );
        }
      }

      if (
        residual.length >
        0
      ) {
        groups.push({
          subsystem:
            `${subsystem}/residual`,

          files:
            residual.sort(),
        });
      }
    }

    /*
     * 3. Merge tiny cross-subsystem groups only
     * when coupling is extremely strong.
     */
    let working =
      groups.map(
        (group) => ({
          subsystem:
            group.subsystem,

          files:
            [...group.files],
        }),
      );

    for (
      let pass = 0;
      pass < 3;
      pass++
    ) {
      let merged =
        false;

      outer:
      for (
        let i = 0;
        i <
        working.length;
        i++
      ) {
        const a =
          working[i];

        if (
          !a ||
          a.files.length >
          3
        ) {
          continue;
        }

        for (
          let j = 0;
          j <
          working.length;
          j++
        ) {
          if (
            i === j
          ) {
            continue;
          }

          const b =
            working[j];

          if (!b) {
            continue;
          }

          let connection =
            0;

          const setA =
            new Set(
              a.files,
            );

          const setB =
            new Set(
              b.files,
            );

          for (
            const pair
            of pairMap.values()
          ) {
            const crosses =
              (
                setA.has(
                  pair.a,
                ) &&
                setB.has(
                  pair.b,
                )
              ) ||
              (
                setA.has(
                  pair.b,
                ) &&
                setB.has(
                  pair.a,
                )
              );

            if (
              crosses
            ) {
              connection +=
                pair.weight;
            }
          }

          if (
            connection >=
            20
          ) {
            b.files =
              [
                ...new Set([
                  ...b.files,
                  ...a.files,
                ]),
              ].sort();

            working.splice(
              i,
              1,
            );

            merged =
              true;

            break outer;
          }
        }
      }

      if (!merged) {
        break;
      }
    }

    /*
     * 4. Compute metrics.
     */
    const result:
      ArchitectureCluster[] =
      [];

    for (
      const group
      of working
    ) {
      const set =
        new Set(
          group.files,
        );

      let internalWeight =
        0;

      let externalWeight =
        0;

      for (
        const pair
        of pairMap.values()
      ) {
        const inA =
          set.has(
            pair.a,
          );

        const inB =
          set.has(
            pair.b,
          );

        if (
          inA &&
          inB
        ) {
          internalWeight +=
            pair.weight;
        }

        else if (
          inA ||
          inB
        ) {
          externalWeight +=
            pair.weight;
        }
      }

      const total =
        internalWeight +
        externalWeight;

      const baseSubsystem =
        group.subsystem
          .replace(
            /\/residual$/,
            "",
          );

      const labelBase =
        clusterLabel(
          baseSubsystem,
        );

      const label =
        group.subsystem.endsWith(
          "/residual",
        )
          ? `${labelBase} Misc`
          : labelBase;

      result.push({
        id:
          `cluster-${hash(
            `${group.subsystem}:${group.files.join("|")}`,
          )}`,

        label,

        subsystem:
          baseSubsystem,

        files:
          group.files,

        size:
          group.files.length,

        internalWeight,

        externalWeight,

        cohesion:
          total > 0
            ? Number(
                (
                  internalWeight /
                  total
                ).toFixed(
                  4,
                ),
              )
            : 0,
      });
    }

    return result
      .sort(
        (a, b) =>
          b.size -
            a.size ||
          b.cohesion -
            a.cohesion ||
          a.label.localeCompare(
            b.label,
          ),
      );
  }
}
