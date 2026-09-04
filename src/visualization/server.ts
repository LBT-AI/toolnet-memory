import 'dotenv/config';

import { createReadStream } from 'node:fs';

import { createServer } from 'node:http';

import { dirname, resolve } from 'node:path';

import { fileURLToPath } from 'node:url';

import { loadConfig, ProjectManager } from '../core/index.js';

import { CodeGraphStore, VisualizationBuilder } from '../code-intelligence/index.js';

import { createStorageProvider, withStorageRetry } from '../storage/index.js';
import { TaskStore } from '../tasks/store.js';
import { buildTaskPanelView } from './tasks-panel.js';
import {
  applyGraphSecurityHeaders,
  graphBearerAuthorized,
  graphHostHeaderAllowed,
  graphTokenIsStrong,
  isLoopbackGraphHost,
  isSameOriginGraphRequest,
  parseGraphAllowedHosts,
} from './security.js';
const PORT = Number(process.env.TOOLNET_GRAPH_PORT ?? 9749);
const HOST = process.env.TOOLNET_GRAPH_HOST ?? '127.0.0.1';
const GRAPH_TOKEN = process.env.TOOLNET_GRAPH_TOKEN?.trim() || undefined;
const GRAPH_ALLOWED_HOSTS = parseGraphAllowedHosts(process.env.TOOLNET_GRAPH_ALLOWED_HOSTS);

interface DashboardProject {
  id: string;
  name: string;
  remote: string;

  hasGraph: boolean;
  hasArchitecture: boolean;
  hasAnalysis: boolean;
  hasVisualization: boolean;
}

function extractKey(item: unknown): string | null {
  if (typeof item === 'string') {
    return item;
  }

  if (!item || typeof item !== 'object') {
    return null;
  }

  const value = item as Record<string, unknown>;

  for (const field of ['key', 'Key', 'path', 'name']) {
    if (typeof value[field] === 'string') {
      return value[field] as string;
    }
  }

  return null;
}

async function listKeys(
  storage: {
    list: (prefix: string) => Promise<unknown[]>;
  },

  prefix: string
): Promise<string[]> {
  const items = await storage.list(prefix);

  return items.map(extractKey).filter((value): value is string => Boolean(value));
}

async function readJson(
  storage: {
    getText: (key: string) => Promise<string | null>;
  },

  key: string
): Promise<any | null> {
  const text = await storage.getText(key);

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function discoverProjects(storage: any): Promise<DashboardProject[]> {
  const keys = await listKeys(storage, 'projects/');

  /*
   * Registry rule:
   *
   * Only folders containing project.json are real projects.
   *
   * Backups / random directories never enter dashboard.
   */
  const remotes = [
    ...new Set(
      keys
        .filter((key) => /^projects\/[^/]+\/project\.json$/.test(key))
        .map((key) => key.split('/')[1])
    ),
  ];

  const keySet = new Set(keys);

  const projects: DashboardProject[] = [];

  for (const remote of remotes) {
    const manifest = await readJson(storage, `projects/${remote}/project.json`);

    if (!manifest || typeof manifest.id !== 'string') {
      continue;
    }

    projects.push({
      id: manifest.id,

      name: typeof manifest.name === 'string' ? manifest.name : remote,

      remote,

      hasGraph: keySet.has(`projects/${remote}/code/graph/current.json`),

      hasArchitecture: keySet.has(`projects/${remote}/code/architecture/current.json`),

      hasAnalysis: keySet.has(`projects/${remote}/code/analysis/current.json`),

      hasVisualization: keySet.has(`projects/${remote}/code/visualization/graph.json`),
    });
  }

  return projects.sort((a, b) => a.name.localeCompare(b.name));
}

async function main() {
  if (!isLoopbackGraphHost(HOST)) {
    console.warn(`[graph-ui] WARNING: Graph UI is exposed on non-loopback host ${HOST}:${PORT}.`);
    if (GRAPH_TOKEN) {
      console.warn('[graph-ui] Bearer authentication is enabled for Graph API endpoints.');
    } else {
      console.warn(
        '[graph-ui] WARNING: Graph API has no bearer token. Set TOOLNET_GRAPH_TOKEN before exposing this port to an untrusted network.'
      );
    }
    if (GRAPH_ALLOWED_HOSTS.length === 0) {
      console.warn(
        '[graph-ui] TIP: Set TOOLNET_GRAPH_ALLOWED_HOSTS to restrict accepted Host headers when using a public/reverse-proxy endpoint.'
      );
    }
  }
  if (GRAPH_TOKEN && !graphTokenIsStrong(GRAPH_TOKEN)) {
    console.warn('[graph-ui] WARNING: TOOLNET_GRAPH_TOKEN is short. Use at least 24 random bytes.');
  }
  const config = loadConfig();

  const currentProject = new ProjectManager().detect();
  /*
   * Tasks Panel is intentionally scoped to the current local
   * ToolNet project.
   *
   * Graph catalog may contain remote projects, but Phase 37
   * does not invent remote Task state for them.
   */
  const taskStore = new TaskStore(currentProject);

  const rawStorage = withStorageRetry(
    createStorageProvider({
      provider: config.storage.provider,

      huggingface: config.storage.huggingface,

      localRoot: config.storage.localRoot,
    }),
    {
      attempts: 3,
    }
  );

  if (rawStorage.name !== 'huggingface') {
    console.warn('[graph-ui] Remote Hugging Face storage is not active.');
  }

  const moduleDir = dirname(fileURLToPath(import.meta.url));

  const publicDir = resolve(moduleDir, 'public');

  const vendorFile = resolve(publicDir, 'vendor', '3d-force-graph.min.js');

  async function getCatalog() {
    const projects = await discoverProjects(rawStorage);

    const currentRemote = currentProject.remote ?? currentProject.name;

    const current = projects.find(
      (project) => project.remote === currentRemote && project.hasGraph
    );

    const firstGraph = projects.find((project) => project.hasGraph);

    return {
      projects,

      defaultProject: current?.remote ?? firstGraph?.remote ?? null,
    };
  }

  const visualizationCache = new Map<string, any>();

  function endpointId(value: any): string {
    return typeof value === 'object' && value !== null ? String(value.id) : String(value);
  }

  function clusterOf(node: any): string {
    return node.clusterLabel || node.cluster || node.layer || 'Unclustered';
  }

  function dashboardFor(project: DashboardProject, extra: Record<string, unknown> = {}) {
    return {
      id: project.id,
      name: project.name,
      remote: project.remote,
      hasArchitecture: project.hasArchitecture,
      hasAnalysis: project.hasAnalysis,
      ...extra,
    };
  }

  async function buildProjectVisualization(project: DashboardProject) {
    const prefix = `projects/${project.remote}`;

    const graphSnapshot = await readJson(rawStorage, `${prefix}/code/graph/current.json`);

    if (
      !graphSnapshot ||
      !Array.isArray(graphSnapshot.symbols) ||
      !Array.isArray(graphSnapshot.edges)
    ) {
      throw new Error(`Code graph missing for project ${project.name}`);
    }

    const architecture = await readJson(rawStorage, `${prefix}/code/architecture/current.json`);

    const analysis = await readJson(rawStorage, `${prefix}/code/analysis/current.json`);

    const graph = new CodeGraphStore();

    graph.import(graphSnapshot.symbols, graphSnapshot.edges);

    const visualization = new VisualizationBuilder(graph).build(project.id, architecture, analysis);

    await rawStorage.put(
      `${prefix}/code/visualization/graph.json`,
      JSON.stringify(visualization),
      'application/json'
    );

    return {
      ...visualization,
      dashboard: dashboardFor(project),
    };
  }

  async function loadProjectVisualization(project: DashboardProject, refresh = false) {
    if (refresh) {
      visualizationCache.delete(project.remote);
    }

    const memoryCached = visualizationCache.get(project.remote);

    if (memoryCached) {
      return memoryCached;
    }

    const prefix = `projects/${project.remote}`;

    /*
     * toolnet-memory index already generates this dataset.
     * Reuse it instead of rebuilding 7k+ nodes / 200k+ edges
     * every time the browser opens the Graph UI.
     */
    const persisted = await readJson(rawStorage, `${prefix}/code/visualization/graph.json`);

    if (persisted && Array.isArray(persisted.nodes) && Array.isArray(persisted.links)) {
      const result = {
        ...persisted,
        dashboard: dashboardFor(project),
      };

      visualizationCache.set(project.remote, result);

      return result;
    }

    const rebuilt = await buildProjectVisualization(project);

    visualizationCache.set(project.remote, rebuilt);

    return rebuilt;
  }

  function buildOverviewView(project: DashboardProject, visualization: any) {
    const groups = new Map<string, any>();
    const symbolCluster = new Map<string, string>();

    for (const node of visualization.nodes) {
      const label = clusterOf(node);
      const id = `cluster:${label}`;

      symbolCluster.set(node.id, id);

      let group = groups.get(id);

      if (!group) {
        group = {
          id,
          name: label,
          qualifiedName: label,
          type: 'subsystem',
          filePath: '',
          clusterLabel: label,
          incoming: 0,
          outgoing: 0,
          memberCount: 0,
          files: new Set<string>(),
          viewKind: 'cluster',
        };

        groups.set(id, group);
      }

      group.memberCount += 1;

      if (node.filePath) {
        group.files.add(node.filePath);
      }
    }

    const edgeMap = new Map<string, any>();

    for (const link of visualization.links) {
      const source = symbolCluster.get(endpointId(link.source));
      const target = symbolCluster.get(endpointId(link.target));

      if (!source || !target || source === target) {
        continue;
      }

      const key = `${source}\u0000${target}`;

      let item = edgeMap.get(key);

      if (!item) {
        item = {
          source,
          target,
          type: 'SUBSYSTEM_DEPENDENCY',
          count: 0,
        };

        edgeMap.set(key, item);
      }

      item.count += 1;
    }

    for (const link of edgeMap.values()) {
      const source = groups.get(link.source);
      const target = groups.get(link.target);

      if (source) {
        source.outgoing += link.count;
      }

      if (target) {
        target.incoming += link.count;
      }
    }

    const nodes = [...groups.values()].map((node) => ({
      ...node,
      filePath: `${node.files.size} files · ${node.memberCount} symbols`,
      files: undefined,
    }));

    const links = [...edgeMap.values()];

    return {
      version: 2,
      projectId: visualization.projectId,
      generatedAt: visualization.generatedAt,
      summary: {
        nodes: nodes.length,
        links: links.length,
        files: visualization.summary?.files ?? 0,
        clusters: nodes.length,
      },
      nodes,
      links,
      dashboard: dashboardFor(project, {
        viewMode: 'overview',
        totalNodes: visualization.nodes.length,
        totalLinks: visualization.links.length,
      }),
    };
  }

  function buildFilesView(project: DashboardProject, visualization: any, cluster: string) {
    const sourceNodes = visualization.nodes.filter(
      (node: any) => !cluster || clusterOf(node) === cluster
    );

    const allowedSymbols = new Set(sourceNodes.map((node: any) => node.id));

    const symbolFile = new Map<string, string>();
    const files = new Map<string, any>();

    for (const node of sourceNodes) {
      const filePath = node.filePath || '(unknown)';

      symbolFile.set(node.id, filePath);

      let item = files.get(filePath);

      if (!item) {
        item = {
          id: `file:${filePath}`,
          name: filePath.split('/').pop() || filePath,
          qualifiedName: filePath,
          type: 'file',
          filePath,
          clusterLabel: clusterOf(node),
          incoming: 0,
          outgoing: 0,
          memberCount: 0,
          viewKind: 'file',
        };

        files.set(filePath, item);
      }

      item.memberCount += 1;
    }

    const edgeMap = new Map<string, any>();

    for (const link of visualization.links) {
      const rawSource = endpointId(link.source);
      const rawTarget = endpointId(link.target);

      if (!allowedSymbols.has(rawSource) || !allowedSymbols.has(rawTarget)) {
        continue;
      }

      const sourceFile = symbolFile.get(rawSource);
      const targetFile = symbolFile.get(rawTarget);

      if (!sourceFile || !targetFile || sourceFile === targetFile) {
        continue;
      }

      const source = `file:${sourceFile}`;
      const target = `file:${targetFile}`;
      const key = `${source}\u0000${target}`;

      let item = edgeMap.get(key);

      if (!item) {
        item = {
          source,
          target,
          type: 'FILE_DEPENDENCY',
          count: 0,
        };

        edgeMap.set(key, item);
      }

      item.count += 1;
    }

    for (const link of edgeMap.values()) {
      const source = files.get(String(link.source).slice('file:'.length));

      const target = files.get(String(link.target).slice('file:'.length));

      if (source) {
        source.outgoing += link.count;
      }

      if (target) {
        target.incoming += link.count;
      }
    }

    const nodes = [...files.values()];
    const links = [...edgeMap.values()];

    return {
      version: 2,
      projectId: visualization.projectId,
      generatedAt: visualization.generatedAt,
      summary: {
        nodes: nodes.length,
        links: links.length,
        files: nodes.length,
        clusters: cluster ? 1 : 0,
      },
      nodes,
      links,
      dashboard: dashboardFor(project, {
        viewMode: 'files',
        selection: cluster,
        totalNodes: visualization.nodes.length,
        totalLinks: visualization.links.length,
      }),
    };
  }

  function buildSymbolsView(project: DashboardProject, visualization: any, filePath: string) {
    const MAX_NODES = 1800;
    const MAX_LINKS = 12000;

    const primary = visualization.nodes.filter((node: any) => node.filePath === filePath);

    const primaryIds = new Set(primary.map((node: any) => node.id));

    const keep = new Set<string>();

    for (const node of primary.slice(0, MAX_NODES)) {
      keep.add(node.id);
    }

    /*
     * Add one-hop neighbours so a focused file view still shows
     * where it connects to the rest of the project.
     */
    for (const link of visualization.links) {
      if (keep.size >= MAX_NODES) {
        break;
      }

      const source = endpointId(link.source);
      const target = endpointId(link.target);

      if (primaryIds.has(source) || primaryIds.has(target)) {
        keep.add(source);

        if (keep.size < MAX_NODES) {
          keep.add(target);
        }
      }
    }

    const nodes = visualization.nodes
      .filter((node: any) => keep.has(node.id))
      .map((node: any) => ({
        ...node,
        viewKind: 'symbol',
      }));

    const links = [];

    for (const link of visualization.links) {
      if (links.length >= MAX_LINKS) {
        break;
      }

      const source = endpointId(link.source);
      const target = endpointId(link.target);

      if (keep.has(source) && keep.has(target)) {
        links.push({
          ...link,
          source,
          target,
        });
      }
    }

    return {
      version: 2,
      projectId: visualization.projectId,
      generatedAt: visualization.generatedAt,
      summary: {
        nodes: nodes.length,
        links: links.length,
        files: new Set(nodes.map((node: any) => node.filePath)).size,
        clusters: new Set(nodes.map((node: any) => clusterOf(node))).size,
      },
      nodes,
      links,
      dashboard: dashboardFor(project, {
        viewMode: 'symbols',
        selection: filePath,
        focused: true,
        truncated: nodes.length >= MAX_NODES || links.length >= MAX_LINKS,
        totalNodes: visualization.nodes.length,
        totalLinks: visualization.links.length,
      }),
    };
  }

  const server = createServer(async (req, res) => {
    try {
      applyGraphSecurityHeaders(res);
      const url = new URL(
        req.url ?? '/',

        `http://${req.headers.host ?? 'localhost'}`
      );
      /*
       * Host-header validation protects default loopback mode
       * from browser DNS-rebinding access.
       */
      if (!graphHostHeaderAllowed(HOST, req.headers.host, GRAPH_ALLOWED_HOSTS)) {
        res.statusCode = 421;
        res.setHeader('content-type', 'application/json; charset=utf-8');
        res.setHeader('cache-control', 'no-store');
        res.end(JSON.stringify({ error: 'misdirected_request' }));
        return;
      }
      /*
       * /api/health is intentionally unauthenticated.
       * Keep this response minimal so monitoring does not expose
       * project catalog, project IDs, paths, counts or token state.
       */
      if (url.pathname === '/api/health') {
        res.setHeader('content-type', 'application/json; charset=utf-8');
        res.setHeader('cache-control', 'no-store');
        res.end(JSON.stringify({ ok: true, service: 'toolnet-memory-graph' }));
        return;
      }
      /*
       * GRAPH_API_AUTH_GATE
       * Every current/future /api/* endpoint except health passes through this gate.
       */
      if (url.pathname.startsWith('/api/')) {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          res.statusCode = 405;
          res.setHeader('allow', 'GET, HEAD');
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.setHeader('cache-control', 'no-store');
          res.end(JSON.stringify({ error: 'method_not_allowed' }));
          return;
        }
        if (!isSameOriginGraphRequest(req.headers.origin, req.headers.host)) {
          res.statusCode = 403;
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.setHeader('cache-control', 'no-store');
          res.end(JSON.stringify({ error: 'forbidden_origin' }));
          return;
        }
        if (!graphBearerAuthorized(req.headers.authorization, GRAPH_TOKEN)) {
          res.statusCode = 401;
          res.setHeader('www-authenticate', 'Bearer realm="ToolNet Graph"');
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.setHeader('cache-control', 'no-store');
          res.end(JSON.stringify({ error: 'unauthorized' }));
          return;
        }
      }
      if (url.pathname === '/api/projects') {
        const catalog = await getCatalog();

        res.setHeader('content-type', 'application/json; charset=utf-8');

        res.setHeader('cache-control', 'no-store');

        res.end(JSON.stringify(catalog));

        return;
      }

      if (url.pathname === '/api/tasks') {
        const requestedRootTaskId = url.searchParams.get('rootTaskId')?.trim() || undefined;
        const projection = taskStore.projection();
        const view = buildTaskPanelView(
          {
            id: currentProject.id,
            name: currentProject.name,
            ...(currentProject.remote
              ? {
                  remote: currentProject.remote,
                }
              : {}),
          },
          projection,
          requestedRootTaskId,
          Date.now()
        );
        res.setHeader('content-type', 'application/json; charset=utf-8');
        res.setHeader('cache-control', 'no-store');
        res.end(JSON.stringify(view));
        return;
      }
      if (url.pathname === '/api/graph') {
        const catalog = await getCatalog();

        const requested = url.searchParams.get('project') ?? catalog.defaultProject;

        if (!requested) {
          res.statusCode = 404;

          res.setHeader('content-type', 'application/json; charset=utf-8');

          res.end(
            JSON.stringify({
              error: 'No indexed ToolNet project found.',
            })
          );

          return;
        }

        const project = catalog.projects.find((item) => item.remote === requested);

        if (!project) {
          res.statusCode = 404;

          res.setHeader('content-type', 'application/json; charset=utf-8');

          res.end(
            JSON.stringify({
              error: 'Project not found.',

              project: requested,
            })
          );

          return;
        }

        if (!project.hasGraph) {
          res.statusCode = 409;

          res.setHeader('content-type', 'application/json; charset=utf-8');

          res.end(
            JSON.stringify({
              error: 'Project is registered but has not been indexed yet.',

              project,
            })
          );

          return;
        }

        const refresh = url.searchParams.get('refresh') === '1';

        const visualization = await loadProjectVisualization(project, refresh);

        const mode = url.searchParams.get('mode') ?? 'full';

        let responseGraph = visualization;

        if (mode === 'overview') {
          responseGraph = buildOverviewView(project, visualization);
        } else if (mode === 'files') {
          responseGraph = buildFilesView(
            project,
            visualization,
            url.searchParams.get('cluster') ?? ''
          );
        } else if (mode === 'symbols') {
          const filePath = url.searchParams.get('file');

          if (!filePath) {
            res.statusCode = 400;
            res.setHeader('content-type', 'application/json; charset=utf-8');
            res.end(
              JSON.stringify({
                error: 'file is required for symbols mode.',
              })
            );
            return;
          }

          responseGraph = buildSymbolsView(project, visualization, filePath);
        } else if (mode !== 'full') {
          res.statusCode = 400;
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.end(
            JSON.stringify({
              error: `Unknown graph mode: ${mode}`,
            })
          );
          return;
        }

        res.setHeader('content-type', 'application/json; charset=utf-8');

        res.setHeader('cache-control', 'no-store');

        res.end(JSON.stringify(responseGraph));

        return;
      }

      if (url.pathname === '/vendor/3d-force-graph.min.js') {
        res.setHeader('content-type', 'application/javascript; charset=utf-8');

        createReadStream(vendorFile).pipe(res);

        return;
      }

      if (url.pathname === '/' || url.pathname === '/index.html') {
        res.setHeader('content-type', 'text/html; charset=utf-8');

        res.setHeader('cache-control', 'no-store');

        createReadStream(resolve(publicDir, 'index.html')).pipe(res);

        return;
      }

      res.statusCode = 404;

      res.end('Not found');
    } catch (error) {
      console.error(error);

      res.statusCode = 500;

      res.setHeader('content-type', 'application/json; charset=utf-8');

      res.end(
        JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
  });

  server.listen(PORT, HOST, () => {
    console.log('ToolNet Multi-Project 3D Graph');

    console.log(`Listening: http://${HOST}:${PORT}`);
  });
}

main().catch((error) => {
  console.error(error);

  process.exit(1);
});
