import "dotenv/config";

import {
  createReadStream,
} from "node:fs";

import {
  createServer,
} from "node:http";

import {
  resolve,
} from "node:path";

import {
  loadConfig,
  ProjectManager,
} from "../core/index.js";

import {
  CodeGraphStore,
  VisualizationBuilder,
} from "../code-intelligence/index.js";

import {
  createStorageProvider,
  withStorageRetry,
} from "../storage/index.js";

const PORT =
  Number(
    process.env
      .TOOLNET_GRAPH_PORT ??
    9749,
  );

const HOST =
  process.env
    .TOOLNET_GRAPH_HOST ??
  "127.0.0.1";

interface DashboardProject {
  id: string;
  name: string;
  remote: string;

  hasGraph: boolean;
  hasArchitecture: boolean;
  hasAnalysis: boolean;
  hasVisualization: boolean;
}

function extractKey(
  item: unknown,
): string | null {
  if (
    typeof item ===
    "string"
  ) {
    return item;
  }

  if (
    !item ||
    typeof item !==
      "object"
  ) {
    return null;
  }

  const value =
    item as Record<
      string,
      unknown
    >;

  for (
    const field
    of [
      "key",
      "Key",
      "path",
      "name",
    ]
  ) {
    if (
      typeof value[field] ===
      "string"
    ) {
      return value[field] as
        string;
    }
  }

  return null;
}

async function listKeys(
  storage: {
    list:
      (
        prefix: string,
      ) => Promise<unknown[]>;
  },

  prefix: string,
): Promise<string[]> {
  const items =
    await storage.list(
      prefix,
    );

  return items
    .map(
      extractKey,
    )
    .filter(
      (
        value,
      ): value is string =>
        Boolean(
          value,
        ),
    );
}

async function readJson(
  storage: {
    getText:
      (
        key: string,
      ) => Promise<
        string |
        null
      >;
  },

  key: string,
): Promise<any | null> {
  const text =
    await storage.getText(
      key,
    );

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(
      text,
    );
  } catch {
    return null;
  }
}

async function discoverProjects(
  storage: any,
): Promise<
  DashboardProject[]
> {
  const keys =
    await listKeys(
      storage,
      "projects/",
    );

  /*
   * Registry rule:
   *
   * Only folders containing project.json are real projects.
   *
   * Backups / random directories never enter dashboard.
   */
  const remotes =
    [
      ...new Set(
        keys
          .filter(
            key =>
              /^projects\/[^/]+\/project\.json$/
                .test(
                  key,
                ),
          )
          .map(
            key =>
              key.split(
                "/",
              )[1],
          ),
      ),
    ];

  const keySet =
    new Set(
      keys,
    );

  const projects:
    DashboardProject[] =
    [];

  for (
    const remote
    of remotes
  ) {
    const manifest =
      await readJson(
        storage,
        `projects/${remote}/project.json`,
      );

    if (
      !manifest ||
      typeof manifest.id !==
        "string"
    ) {
      continue;
    }

    projects.push({
      id:
        manifest.id,

      name:
        typeof manifest.name ===
          "string"
          ? manifest.name
          : remote,

      remote,

      hasGraph:
        keySet.has(
          `projects/${remote}/code/graph/current.json`,
        ),

      hasArchitecture:
        keySet.has(
          `projects/${remote}/code/architecture/current.json`,
        ),

      hasAnalysis:
        keySet.has(
          `projects/${remote}/code/analysis/current.json`,
        ),

      hasVisualization:
        keySet.has(
          `projects/${remote}/code/visualization/graph.json`,
        ),
    });
  }

  return projects.sort(
    (
      a,
      b,
    ) =>
      a.name.localeCompare(
        b.name,
      ),
  );
}

async function main() {
  const config =
    loadConfig();

  const currentProject =
    new ProjectManager()
      .detect();

  const rawStorage =
    withStorageRetry(
      createStorageProvider({
        provider:
          config.storage.provider,

        huggingface:
          config.storage.huggingface,

        localRoot:
          config.storage.localRoot,
      }),
      {
        attempts:
          3,
      },
    );

  if (
    rawStorage.name !==
    "huggingface"
  ) {
    console.warn(
      "[graph-ui] Remote Hugging Face storage is not active.",
    );
  }

  const publicDir =
    resolve(
      "src/visualization/public",
    );

  const vendorFile =
    resolve(
      "node_modules/3d-force-graph/dist/3d-force-graph.min.js",
    );

  async function getCatalog() {
    const projects =
      await discoverProjects(
        rawStorage,
      );

    const currentRemote =
      currentProject.remote ??
      currentProject.name;

    const current =
      projects.find(
        project =>
          project.remote ===
            currentRemote &&
          project.hasGraph,
      );

    const firstGraph =
      projects.find(
        project =>
          project.hasGraph,
      );

    return {
      projects,

      defaultProject:
        current?.remote ??
        firstGraph?.remote ??
        null,
    };
  }

  async function buildProjectVisualization(
    project:
      DashboardProject,
  ) {
    const prefix =
      `projects/${project.remote}`;

    const graphSnapshot =
      await readJson(
        rawStorage,
        `${prefix}/code/graph/current.json`,
      );

    if (
      !graphSnapshot ||
      !Array.isArray(
        graphSnapshot.symbols,
      ) ||
      !Array.isArray(
        graphSnapshot.edges,
      )
    ) {
      throw new Error(
        `Code graph missing for project ${project.name}`,
      );
    }

    const architecture =
      await readJson(
        rawStorage,
        `${prefix}/code/architecture/current.json`,
      );

    const analysis =
      await readJson(
        rawStorage,
        `${prefix}/code/analysis/current.json`,
      );

    const graph =
      new CodeGraphStore();

    graph.import(
      graphSnapshot.symbols,
      graphSnapshot.edges,
    );

    const visualization =
      new VisualizationBuilder(
        graph,
      ).build(
        project.id,
        architecture,
        analysis,
      );

    /*
     * Keep a cached visualization in that project's own
     * namespace. It never crosses into another project.
     */
    await rawStorage.put(
      `${prefix}/code/visualization/graph.json`,

      JSON.stringify(
        visualization,
        null,
        2,
      ),

      "application/json",
    );

    return {
      ...visualization,

      dashboard: {
        id:
          project.id,

        name:
          project.name,

        remote:
          project.remote,

        hasArchitecture:
          Boolean(
            architecture,
          ),

        hasAnalysis:
          Boolean(
            analysis,
          ),
      },
    };
  }

  const server =
    createServer(
      async (
        req,
        res,
      ) => {
        try {
          const url =
            new URL(
              req.url ??
                "/",

              `http://${
                req.headers.host ??
                "localhost"
              }`,
            );

          if (
            url.pathname ===
            "/api/health"
          ) {
            const catalog =
              await getCatalog();

            res.setHeader(
              "content-type",
              "application/json; charset=utf-8",
            );

            res.setHeader(
              "cache-control",
              "no-store",
            );

            res.end(
              JSON.stringify({
                ok: true,

                mode:
                  "multi-project",

                projects:
                  catalog.projects
                    .length,

                indexedProjects:
                  catalog.projects
                    .filter(
                      item =>
                        item.hasGraph,
                    )
                    .length,

                defaultProject:
                  catalog.defaultProject,
              }),
            );

            return;
          }

          if (
            url.pathname ===
            "/api/projects"
          ) {
            const catalog =
              await getCatalog();

            res.setHeader(
              "content-type",
              "application/json; charset=utf-8",
            );

            res.setHeader(
              "cache-control",
              "no-store",
            );

            res.end(
              JSON.stringify(
                catalog,
              ),
            );

            return;
          }

          if (
            url.pathname ===
            "/api/graph"
          ) {
            const catalog =
              await getCatalog();

            const requested =
              url.searchParams.get(
                "project",
              ) ??
              catalog.defaultProject;

            if (!requested) {
              res.statusCode =
                404;

              res.setHeader(
                "content-type",
                "application/json; charset=utf-8",
              );

              res.end(
                JSON.stringify({
                  error:
                    "No indexed ToolNet project found.",
                }),
              );

              return;
            }

            const project =
              catalog.projects
                .find(
                  item =>
                    item.remote ===
                    requested,
                );

            if (!project) {
              res.statusCode =
                404;

              res.setHeader(
                "content-type",
                "application/json; charset=utf-8",
              );

              res.end(
                JSON.stringify({
                  error:
                    "Project not found.",

                  project:
                    requested,
                }),
              );

              return;
            }

            if (
              !project.hasGraph
            ) {
              res.statusCode =
                409;

              res.setHeader(
                "content-type",
                "application/json; charset=utf-8",
              );

              res.end(
                JSON.stringify({
                  error:
                    "Project is registered but has not been indexed yet.",

                  project,
                }),
              );

              return;
            }

            const visualization =
              await buildProjectVisualization(
                project,
              );

            res.setHeader(
              "content-type",
              "application/json; charset=utf-8",
            );

            res.setHeader(
              "cache-control",
              "no-store",
            );

            res.end(
              JSON.stringify(
                visualization,
              ),
            );

            return;
          }

          if (
            url.pathname ===
            "/vendor/3d-force-graph.min.js"
          ) {
            res.setHeader(
              "content-type",
              "application/javascript; charset=utf-8",
            );

            createReadStream(
              vendorFile,
            ).pipe(
              res,
            );

            return;
          }

          if (
            url.pathname ===
              "/" ||
            url.pathname ===
              "/index.html"
          ) {
            res.setHeader(
              "content-type",
              "text/html; charset=utf-8",
            );

            res.setHeader(
              "cache-control",
              "no-store",
            );

            createReadStream(
              resolve(
                publicDir,
                "index.html",
              ),
            ).pipe(
              res,
            );

            return;
          }

          res.statusCode =
            404;

          res.end(
            "Not found",
          );
        } catch (
          error
        ) {
          console.error(
            error,
          );

          res.statusCode =
            500;

          res.setHeader(
            "content-type",
            "application/json; charset=utf-8",
          );

          res.end(
            JSON.stringify({
              error:
                error instanceof Error
                  ? error.message
                  : String(
                      error,
                    ),
            }),
          );
        }
      },
    );

  server.listen(
    PORT,
    HOST,
    () => {
      console.log(
        "ToolNet Multi-Project 3D Graph",
      );

      console.log(
        `Listening: http://${HOST}:${PORT}`,
      );
    },
  );
}

main().catch(
  error => {
    console.error(
      error,
    );

    process.exit(1);
  },
);
