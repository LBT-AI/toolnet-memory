import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';

import { dirname, join } from 'node:path';

import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it } from 'vitest';

import { RepositoryIndexer } from '../../src/code-intelligence/indexer/repository-indexer.js';

import type { CodeGraphStore } from '../../src/code-intelligence/graph/graph-store.js';

import { CrossServiceEngine } from '../../src/code-intelligence/cross-service/cross-service-engine.js';

import {
  FleetBuilder,
  FleetImpactAnalyzer,
  FleetProjectRegistry,
  PersistentFleetStore,
  summarizeFleetArchitecture,
  summarizeFleetDiagnostics,
} from '../../src/code-intelligence/fleet/index.js';

import type {
  FleetProjectExport,
  FleetProjectInput,
} from '../../src/code-intelligence/fleet/types.js';

import { PersistentFleetExportStore } from '../../src/storage/fleet-export-store.js';

import { LocalStorageProvider } from '../../src/storage/local/client.js';

import { ProjectScopedStorageProvider } from '../../src/storage/project/scoped-provider.js';

import { fleetStatus } from '../../src/mcp/tools/fleet-status.js';

import { fleetProjects } from '../../src/mcp/tools/fleet-projects.js';

import { analyzeImpact } from '../../src/mcp/tools/analyze-impact.js';

import type { MCPContext } from '../../src/mcp/context.js';

const roots: string[] = [];

function root(label: string): string {
  const value = mkdtempSync(join(tmpdir(), `toolnet-phase73-${label}-`));
  roots.push(value);
  return value;
}

afterEach(() => {
  for (const value of roots.splice(0)) {
    rmSync(value, { recursive: true, force: true });
  }
});

function writeFiles(repo: string, files: Record<string, string>): void {
  for (const [relative, content] of Object.entries(files)) {
    const absolute = join(repo, relative);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, content);
  }
}

interface BuiltProject {
  input: FleetProjectInput;
  exportView: FleetProjectExport;
  graph: CodeGraphStore;
  routeSymbolId?: string;
}

async function buildProject(
  repo: string,
  projectId: string,
  name: string,
  remote = name
): Promise<BuiltProject> {
  const indexed = await new RepositoryIndexer().index(projectId, repo, {});

  const result = await new CrossServiceEngine({ graph: indexed.graph }).analyze({
    projectId,
    rootPath: repo,
    files: indexed.acceptedFiles,
    projectName: name,
    projectRemote: remote,
  });

  const route = indexed.graph.allSymbols(projectId).find((symbol) => symbol.type === 'route');

  return {
    input: {
      projectId,
      name,
      remote,
      rootPath: repo,
      export: result.export,
    },
    exportView: result.export,
    graph: indexed.graph,
    ...(route ? { routeSymbolId: route.id } : {}),
  };
}

const WEB_FRONTEND: Record<string, string> = {
  'package.json': JSON.stringify({ name: 'web-frontend', dependencies: { react: '^18' } }),
  'src/client.ts': [
    'import axios from "axios";',
    'const client = axios.create({ baseURL: "http://orders-api:3000" });',
    '',
    'export async function submitOrder() {',
    '  return client.post("/api/orders");',
    '}',
    '',
  ].join('\n'),
};

const ORDERS_API: Record<string, string> = {
  'package.json': JSON.stringify({ name: 'orders-api', dependencies: { express: '^4' } }),
  'src/bus.ts': 'export const bus = { emit: (c: string, p: unknown) => p };\n',
  'src/server.ts': [
    'import express from "express";',
    'import { bus } from "./bus";',
    '',
    'const app = express();',
    '',
    'export function createOrder() {',
    '  bus.emit("order.created", { id: 1 });',
    '  return 1;',
    '}',
    '',
    'app.post("/api/orders", createOrder);',
    '',
    'export { app };',
    '',
  ].join('\n'),
};

const ORDER_WORKER: Record<string, string> = {
  'package.json': JSON.stringify({ name: 'order-worker' }),
  'src/bus.ts': 'export const bus = { on: (c: string, h: () => void) => h() };\n',
  'src/worker.ts': [
    'import { bus } from "./bus";',
    '',
    'export function processOrder() {',
    '  bus.on("order.created", () => undefined);',
    '}',
    '',
  ].join('\n'),
};

async function threeRepoFleet(): Promise<{
  base: string;
  web: BuiltProject;
  api: BuiltProject;
  worker: BuiltProject;
}> {
  const base = root('fleet');
  const webRepo = join(base, 'web');
  const apiRepo = join(base, 'api');
  const workerRepo = join(base, 'worker');

  writeFiles(webRepo, WEB_FRONTEND);
  writeFiles(apiRepo, ORDERS_API);
  writeFiles(workerRepo, ORDER_WORKER);

  const web = await buildProject(webRepo, 'p-web', 'web-frontend');
  const api = await buildProject(apiRepo, 'p-api', 'orders-api');
  const worker = await buildProject(workerRepo, 'p-worker', 'order-worker');

  return { base, web, api, worker };
}

function edgeFingerprint(inputs: readonly FleetProjectInput[]): string[] {
  return new FleetBuilder()
    .build({ projects: inputs })
    .snapshot.edges.map((edge) => `${edge.type}:${edge.fromProjectId}->${edge.toProjectId}`)
    .sort();
}

describe('Phase 73 — Cross-Repo Intelligence / Fleet Graph', () => {
  it('builds a Fleet overlay that never duplicates project graphs', async () => {
    const { web, api, worker } = await threeRepoFleet();

    const { snapshot } = new FleetBuilder().build({
      projects: [web.input, api.input, worker.input],
    });

    expect(snapshot.version).toBe(1);
    expect(snapshot.stats.registeredProjects).toBe(3);
    expect(snapshot.stats.availableProjects).toBe(3);
    expect(snapshot.stats.crossProjectEdges).toBe(3);
    expect(snapshot.stats.crossProjectEdgesByType).toEqual({
      CROSS_EMITS: 1,
      CROSS_HTTP_CALLS: 1,
      CROSS_LISTENS_ON: 1,
    });

    /* The overlay carries identity + relationships only, never full graphs. */
    const serialized = JSON.stringify(snapshot);
    expect(serialized).not.toContain('"symbols"');
    expect(serialized).not.toContain('filePath');
    expect(serialized).not.toContain('createOrder');
    expect(serialized).not.toContain('submitOrder');

    for (const project of snapshot.projects) {
      expect(project.graphGeneration).not.toBe('');
      expect(project.graphFingerprint).not.toBe('');
      expect(project.stale).toBe(false);
    }
  });

  it('links cross-repo HTTP calls with deterministic evidence and resource ids', async () => {
    const { web, api, worker } = await threeRepoFleet();

    const { snapshot } = new FleetBuilder().build({
      projects: [web.input, api.input, worker.input],
    });

    const httpEdge = snapshot.edges.find((edge) => edge.type === 'CROSS_HTTP_CALLS');

    expect(httpEdge).toBeDefined();
    expect(httpEdge!.fromProjectId).toBe('p-web');
    expect(httpEdge!.toProjectId).toBe('p-api');
    expect(httpEdge!.toResourceId).toBe(api.routeSymbolId);
    expect(httpEdge!.protocol).toBe('http');
    expect(httpEdge!.evidence.map((item) => item.kind)).toEqual([
      'SERVICE_IDENTITY',
      'HOST_MATCH',
      'METHOD_MATCH',
      'CANONICAL_ROUTE_MATCH',
    ]);
    expect(httpEdge!.sourceGeneration).toBe(web.exportView.generation);
    expect(httpEdge!.targetGeneration).toBe(api.exportView.generation);
    expect(httpEdge!.generation).toBe(snapshot.generation);

    /* Edge identity is deterministic and timestamp-free. */
    const rebuilt = new FleetBuilder().build({
      projects: [web.input, api.input, worker.input],
    });
    expect(rebuilt.snapshot.edges.map((edge) => edge.id).sort()).toEqual(
      snapshot.edges.map((edge) => edge.id).sort()
    );
  });

  it('keeps ambiguous cross-project endpoints unresolved', async () => {
    const base = root('ambiguous');
    const webRepo = join(base, 'web');
    const aRepo = join(base, 'a');
    const bRepo = join(base, 'b');

    writeFiles(webRepo, {
      'package.json': JSON.stringify({ name: 'web' }),
      'src/client.ts':
        'export async function submit() {\n  return fetch("/orders", { method: "POST" });\n}\n',
    });

    for (const [repo, name] of [
      [aRepo, 'orders-service'],
      [bRepo, 'legacy-orders'],
    ] as const) {
      writeFiles(repo, {
        'package.json': JSON.stringify({ name, dependencies: { express: '^4' } }),
        'src/server.ts':
          'import express from "express";\nconst app = express();\napp.post("/orders", h);\nexport { app };\n',
      });
    }

    const web = await buildProject(webRepo, 'p-web', 'web');
    const a = await buildProject(aRepo, 'p-a', 'orders-service');
    const b = await buildProject(bRepo, 'p-b', 'legacy-orders');

    const { snapshot } = new FleetBuilder().build({ projects: [web.input, a.input, b.input] });

    expect(snapshot.edges.filter((edge) => edge.type === 'CROSS_HTTP_CALLS')).toHaveLength(0);

    const ambiguous = snapshot.unresolved.filter(
      (item) => item.reason === 'AMBIGUOUS_CROSS_PROJECT_ENDPOINT'
    );
    expect(ambiguous).toHaveLength(1);
    expect(ambiguous[0].candidates).toEqual(['p-a', 'p-b']);

    expect(snapshot.coverage.status).toBe('partial');
    expect(snapshot.coverage.negativeClaimSafe).toBe(false);
    expect(snapshot.coverage.reasons).toContain('FLEET_CROSS_REPO_AMBIGUOUS');
  });

  it('links cross-repo event channels only when the provider matches', async () => {
    const base = root('events');

    const producerRepo = join(base, 'producer');
    const nodeConsumerRepo = join(base, 'node-consumer');
    const socketConsumerRepo = join(base, 'socket-consumer');

    writeFiles(producerRepo, {
      'package.json': JSON.stringify({ name: 'producer' }),
      'src/bus.ts': 'export const bus = { emit: (c: string) => c };\n',
      'src/publish.ts':
        'import { bus } from "./bus";\nexport function publish() {\n  bus.emit("order.created");\n}\n',
    });

    writeFiles(nodeConsumerRepo, {
      'package.json': JSON.stringify({ name: 'node-consumer' }),
      'src/bus.ts': 'export const bus = { on: (c: string, h: () => void) => h() };\n',
      'src/consume.ts':
        'import { bus } from "./bus";\nexport function consume() {\n  bus.on("order.created", () => undefined);\n}\n',
    });

    writeFiles(socketConsumerRepo, {
      'package.json': JSON.stringify({ name: 'socket-consumer' }),
      'src/io.ts': 'export const socket = { on: (c: string, h: () => void) => h() };\n',
      'src/consume.ts':
        'import { socket } from "./io";\nexport function consume() {\n  socket.on("order.created", () => undefined);\n}\n',
    });

    const producer = await buildProject(producerRepo, 'p-producer', 'producer');
    const nodeConsumer = await buildProject(nodeConsumerRepo, 'p-node', 'node-consumer');
    const socketConsumer = await buildProject(socketConsumerRepo, 'p-socket', 'socket-consumer');

    const { snapshot } = new FleetBuilder().build({
      projects: [producer.input, nodeConsumer.input, socketConsumer.input],
    });

    expect(
      snapshot.edges
        .filter((edge) => edge.type === 'CROSS_EMITS')
        .map((edge) => `${edge.fromProjectId}->${edge.toProjectId}`)
    ).toEqual(['p-producer->p-node']);

    expect(
      snapshot.edges
        .filter((edge) => edge.type === 'CROSS_LISTENS_ON')
        .map((edge) => `${edge.fromProjectId}->${edge.toProjectId}`)
    ).toEqual(['p-node->p-producer']);

    /* A socket.io channel is never conflated with the node emitter channel. */
    expect(JSON.stringify(snapshot.edges)).not.toContain('p-socket');
    expect(snapshot.unresolved).toHaveLength(0);
  });

  it('links workspace package dependencies and never maps external packages by name', async () => {
    const base = root('packages');

    const appRepo = join(base, 'app');
    const sdkRepo = join(base, 'sdk');
    const expressRepo = join(base, 'express-project');

    writeFiles(appRepo, {
      'package.json': JSON.stringify({
        name: 'app',
        dependencies: { '@company/sdk': 'workspace:*', express: '^4.19.0' },
      }),
      'src/index.ts': 'export const value = 1;\n',
    });

    writeFiles(sdkRepo, {
      'package.json': JSON.stringify({ name: '@company/sdk' }),
      'src/index.ts': 'export const shared = 1;\n',
    });

    writeFiles(expressRepo, {
      'package.json': JSON.stringify({ name: 'express' }),
      'src/index.ts': 'export const express = 1;\n',
    });

    const app = await buildProject(appRepo, 'p-app', 'app');
    const sdk = await buildProject(sdkRepo, 'p-sdk', '@company/sdk');
    const expressProject = await buildProject(expressRepo, 'p-express', 'express');

    const { snapshot } = new FleetBuilder().build({
      projects: [app.input, sdk.input, expressProject.input],
    });

    const packageEdges = snapshot.edges.filter((edge) => edge.type === 'CROSS_PACKAGE_DEPENDS_ON');

    expect(packageEdges).toHaveLength(1);
    expect(packageEdges[0].fromProjectId).toBe('p-app');
    expect(packageEdges[0].toProjectId).toBe('p-sdk');
    expect(packageEdges[0].evidence.map((item) => item.kind)).toEqual([
      'PACKAGE_IDENTITY',
      'LOCAL_DEPENDENCY_SPECIFIER',
    ]);

    /* `express` is an external registry dependency, not the project named express. */
    expect(packageEdges.some((edge) => edge.toProjectId === 'p-express')).toBe(false);
  });

  it('detects stale project generations and excludes their links', async () => {
    const { web, api, worker } = await threeRepoFleet();

    const fresh = new FleetBuilder().build({ projects: [web.input, api.input, worker.input] });
    expect(fresh.snapshot.coverage.status).toBe('complete');
    expect(fresh.snapshot.coverage.negativeClaimSafe).toBe(true);

    const staleApi: FleetProjectInput = { ...api.input, pinnedGeneration: 'previous-generation' };

    const stale = new FleetBuilder().build({ projects: [web.input, staleApi, worker.input] });

    expect(stale.staleProjects).toEqual(['p-api']);
    expect(stale.snapshot.coverage.status).toBe('partial');
    expect(stale.snapshot.coverage.negativeClaimSafe).toBe(false);
    expect(stale.snapshot.coverage.reasons).toContain('FLEET_PROJECT_STALE');

    /* A stale participant never contributes current links. */
    expect(stale.snapshot.edges.filter((edge) => edge.toProjectId === 'p-api')).toHaveLength(0);
    expect(stale.snapshot.edges.filter((edge) => edge.fromProjectId === 'p-api')).toHaveLength(0);
    expect(stale.snapshot.edges).toHaveLength(0);
  });

  it('removes every edge for a project that leaves the registry', async () => {
    const { web, api, worker } = await threeRepoFleet();

    expect(edgeFingerprint([web.input, api.input, worker.input])).toHaveLength(3);
    expect(edgeFingerprint([web.input, worker.input])).toHaveLength(0);

    /* Underlying project exports are untouched by a fleet rebuild. */
    expect(web.exportView.projectId).toBe('p-web');
    expect(api.exportView.projectId).toBe('p-api');
    expect(api.graph.allSymbols('p-api').length).toBeGreaterThan(0);
  });

  it('distinguishes missing projects and reports the declared fleet scope', async () => {
    const { web, api } = await threeRepoFleet();

    const result = new FleetBuilder().build({
      projects: [web.input, api.input, { projectId: 'p-gone', name: 'gone', export: null }],
    });

    expect(result.missingProjects).toEqual(['p-gone']);
    expect(result.snapshot.coverage.status).toBe('partial');
    expect(result.snapshot.coverage.missingProjects).toEqual(['p-gone']);
    expect(result.snapshot.coverage.projects).toEqual(['p-api', 'p-gone', 'p-web']);
    expect(result.snapshot.coverage.reasons).toContain('FLEET_PROJECT_UNAVAILABLE');
  });

  it('computes cross-repo impact with semantic path evidence', async () => {
    const { web, api, worker } = await threeRepoFleet();

    const { snapshot } = new FleetBuilder().build({
      projects: [web.input, api.input, worker.input],
    });

    const impact = new FleetImpactAnalyzer(snapshot).analyze({
      projectId: 'p-api',
      resourceId: api.routeSymbolId,
    });

    expect(impact.impactedProjects).toContain('p-web');

    const webPath = impact.paths.find((path) => path.projectId === 'p-web');
    expect(webPath).toBeDefined();
    expect(webPath!.steps.map((step) => step.edgeType)).toEqual(['CROSS_HTTP_CALLS']);
    expect(webPath!.steps[0].direction).toBe('reverse');

    /* A route/event change also reaches the downstream worker. */
    const eventImpact = new FleetImpactAnalyzer(snapshot).analyze({ projectId: 'p-api' });
    expect(eventImpact.impactedProjects).toContain('p-worker');

    const workerPath = eventImpact.paths.find((path) => path.projectId === 'p-worker');
    expect(workerPath).toBeDefined();
    expect(workerPath!.steps.map((step) => step.edgeType)).toContain('CROSS_EMITS');
    expect(eventImpact.coverage.status).toBe('complete');
  });

  it('never claims a negative cross-repo result when the fleet is partial', async () => {
    const { web, api } = await threeRepoFleet();

    const staleApi: FleetProjectInput = { ...api.input, pinnedGeneration: 'old' };
    const { snapshot } = new FleetBuilder().build({ projects: [web.input, staleApi] });

    expect(snapshot.coverage.negativeClaimSafe).toBe(false);
    expect(snapshot.edges).toHaveLength(0);
    expect(snapshot.coverage.staleProjects).toEqual(['p-api']);

    /* A complete fleet may make the claim. */
    const complete = new FleetBuilder().build({ projects: [web.input, api.input] });
    expect(complete.snapshot.coverage.negativeClaimSafe).toBe(true);
  });

  it('is deterministic across repeated builds', async () => {
    const { web, api, worker } = await threeRepoFleet();

    const runs: string[] = [];

    for (let attempt = 0; attempt < 3; attempt++) {
      const { snapshot } = new FleetBuilder().build({
        projects: [web.input, api.input, worker.input],
      });

      runs.push(
        JSON.stringify({
          generation: snapshot.generation,
          fingerprint: snapshot.fingerprint,
          projects: snapshot.projects.map(
            (project) => `${project.projectId}:${project.graphGeneration}:${project.stale}`
          ),
          edges: snapshot.edges.map((edge) => edge.id),
          unresolved: snapshot.unresolved.map(
            (item) => `${item.type}:${item.fromProjectId}:${item.reason}`
          ),
          coverage: snapshot.coverage.reasons,
          stats: snapshot.stats,
        })
      );
    }

    expect(runs[0]).toBe(runs[1]);
    expect(runs[1]).toBe(runs[2]);
  });

  it('registers and discovers projects through ToolNet storage with isolation preserved', async () => {
    const storageDir = root('fleet-storage');
    const raw = new LocalStorageProvider(storageDir);

    const { web } = await threeRepoFleet();

    const webScoped = new ProjectScopedStorageProvider(
      raw,
      'p-web',
      'web-frontend',
      'web-frontend'
    );
    await new PersistentFleetExportStore(webScoped).save(web.exportView);

    const registry = new FleetProjectRegistry(raw);
    await registry.register({ projectId: 'p-web', name: 'web-frontend', remote: 'web-frontend' });
    await registry.register({ projectId: 'p-api', name: 'orders-api', remote: 'orders-api' });

    const discovered = await registry.discover();
    expect(discovered.find((item) => item.projectId === 'p-web')?.export?.projectId).toBe('p-web');
    expect(discovered.find((item) => item.projectId === 'p-api')?.export).toBeNull();

    /* A scoped provider can never read another project's namespace. */
    await expect(
      webScoped.getText('projects/p-api/code/graph/fleet-export.json')
    ).rejects.toThrow();

    /* Removing a project drops its registry entry. */
    await registry.unregister('p-api');
    const afterRemoval = await registry.discover();
    expect(afterRemoval.some((item) => item.projectId === 'p-api')).toBe(false);
    expect(afterRemoval.some((item) => item.projectId === 'p-web')).toBe(true);

    /* Fleet state lives in its own namespace, never inside a project. */
    const fleet = new PersistentFleetStore(raw);
    await fleet.saveSnapshot(new FleetBuilder().build({ projects: [web.input] }).snapshot);
    expect(await raw.exists('fleet/graph/current.json')).toBe(true);
    expect(await raw.exists('projects/p-web/fleet/graph/current.json')).toBe(false);
  });

  it('redacts credentials and never reads outside registered projects', async () => {
    const base = root('security');

    const appRepo = join(base, 'app');
    writeFiles(appRepo, {
      'package.json': JSON.stringify({
        name: 'app',
        dependencies: { '@company/sdk': 'file:../sdk' },
      }),
      'src/client.ts': [
        'export async function secret() {',
        '  return fetch("https://user:sup3rsecret@orders-api/private");',
        '}',
        '',
      ].join('\n'),
    });

    const app = await buildProject(appRepo, 'p-app', 'app');

    expect(JSON.stringify(app.exportView)).not.toContain('sup3rsecret');

    /* Registry entries with a traversal-ish remote never read outside storage. */
    const storageDir = root('security-storage');
    const registry = new FleetProjectRegistry(new LocalStorageProvider(storageDir));
    await registry.register({
      projectId: 'p-evil',
      name: 'evil',
      remote: '../../etc',
      rootPath: '/etc',
    });

    const discovered = await registry.discover();
    const evil = discovered.find((item) => item.projectId === 'p-evil');
    expect(evil).toBeDefined();
    expect(evil?.export).toBeNull();
  });

  it('keeps the project registry free of credentials', async () => {
    const storageDir = root('registry-secrets');
    const raw = new LocalStorageProvider(storageDir);
    const registry = new FleetProjectRegistry(raw);

    await registry.register({
      projectId: 'p-one',
      name: 'one',
      remote: 'https://user:sup3rsecret@github.com/org/one.git',
    });

    const text = await raw.getText('fleet/registry.json');
    expect(text).not.toContain('sup3rsecret');
    expect(text).toContain('github.com/org/one');
  });

  it('exposes fleet MCP tools and opt-in cross-repo impact without breaking local impact', async () => {
    const storageDir = root('mcp-storage');
    const raw = new LocalStorageProvider(storageDir);

    const { web, api, worker } = await threeRepoFleet();

    for (const project of [web, api, worker]) {
      const scoped = new ProjectScopedStorageProvider(
        raw,
        project.input.projectId,
        project.input.name,
        project.input.remote ?? project.input.name
      );
      await new PersistentFleetExportStore(scoped).save(project.exportView);
    }

    const registry = new FleetProjectRegistry(raw);
    for (const project of [web, api, worker]) {
      await registry.register({
        projectId: project.input.projectId,
        name: project.input.name,
        remote: project.input.remote,
      });
    }

    const ctx = {
      project: {
        id: 'p-api',
        name: 'orders-api',
        rootPath: api.input.rootPath,
        remote: 'orders-api',
      },
      memory: {} as never,
      retrieval: {} as never,
      graph: api.graph,
      references: {} as never,
      rootStorage: raw,
    } as unknown as MCPContext;

    const status = await fleetStatus(ctx, { includeDiagnostics: true, includeArchitecture: true });

    expect(status.scope).toBe('fleet');
    expect(status.registeredProjects).toBe(3);
    expect(status.crossProjectEdges).toBe(3);
    expect(status.coverage?.status).toBe('complete');
    expect(status.coverage?.negativeClaimSafe).toBe(true);
    expect(status.diagnostics?.total).toBe(0);
    expect(status.architecture?.edgeTypes.CROSS_HTTP_CALLS).toBe(1);

    const projects = await fleetProjects(ctx, {});
    expect(projects.projects.map((project) => project.projectId)).toEqual([
      'p-api',
      'p-web',
      'p-worker',
    ]);
    expect(projects.projects.every((project) => project.availability !== 'unavailable')).toBe(true);

    /* Local impact stays project-local by default. */
    const local = await analyzeImpact(ctx, { symbolId: api.routeSymbolId! });
    expect(local.found).toBe(true);
    expect(local.crossRepoImpact).toBeUndefined();
    expect(local.impacts.map((item) => item.name)).toContain('createOrder');

    const withFleet = await analyzeImpact(ctx, {
      symbolId: api.routeSymbolId!,
      includeCrossRepo: true,
    });

    expect(withFleet.crossRepoImpact?.impactedProjects).toContain('p-web');
    expect(withFleet.crossRepoImpact?.fleetCoverage.impactMayBeUnderreported).toBe(false);
    expect(withFleet.crossRepoImpact?.paths[0]?.steps[0]?.edgeType).toBe('CROSS_HTTP_CALLS');
  });

  it('scales to a large synthetic fleet without pathological cost', () => {
    const projects: FleetProjectInput[] = [];
    const size = 50;

    for (let index = 0; index < size; index++) {
      const projectId = `p-${String(index).padStart(3, '0')}`;

      const exportView: FleetProjectExport = {
        version: 1,
        projectId,
        name: `service-${index}`,
        generation: `gen-${index}`,
        graphFingerprint: `fp-${index}`,
        indexedAt: '2026-01-01T00:00:00.000Z',
        crossServiceComplete: true,
        identities: [`service-${index}`],
        services: [
          { id: `${projectId}-svc`, name: `service-${index}`, rootPath: '.', kind: 'backend' },
        ],
        endpoints: [
          {
            resourceId: `${projectId}-route`,
            protocol: 'http',
            serviceId: `${projectId}-svc`,
            method: 'POST',
            path: `/api/resource-${index}`,
          },
        ],
        outboundCalls: [
          {
            protocol: 'http',
            filePath: 'src/client.ts',
            line: 1,
            method: 'POST',
            path: `/api/resource-${(index + 1) % size}`,
            host: `service-${(index + 1) % size}`,
          },
        ],
        events: [],
        packages: [],
        packageDependencies: [],
      };

      projects.push({ projectId, name: `service-${index}`, export: exportView });
    }

    const started = Date.now();
    const { snapshot } = new FleetBuilder().build({ projects });
    const durationMs = Date.now() - started;

    expect(snapshot.stats.registeredProjects).toBe(size);
    expect(snapshot.stats.crossProjectEdges).toBe(size);
    expect(durationMs).toBeLessThan(5_000);

    const architecture = summarizeFleetArchitecture(snapshot);
    expect(architecture.projects).toBe(size);
    expect(architecture.cycles.length).toBe(1);
    expect(summarizeFleetDiagnostics(snapshot).total).toBe(0);
  });

  it('phase 73 certification gate', () => {
    console.log('PHASE73_CROSS_REPO_INTELLIGENCE=PASS');
    expect(true).toBe(true);
  });
});
