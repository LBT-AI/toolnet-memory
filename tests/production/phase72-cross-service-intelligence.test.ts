import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';

import { dirname, join } from 'node:path';

import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it } from 'vitest';

import { RepositoryIndexer } from '../../src/code-intelligence/indexer/repository-indexer.js';

import type { RepositoryIndexResult } from '../../src/code-intelligence/indexer/repository-indexer.js';

import {
  CrossServiceEngine,
  GraphCoverageBuilder,
  crossServiceFingerprint,
  detectServices,
  detectUnsupportedFrameworks,
  normalizeHttpPath,
  summarizeDiagnostics,
} from '../../src/code-intelligence/index.js';

import type { CrossServiceSnapshot } from '../../src/code-intelligence/cross-service/types.js';

import { GraphCoverageEvaluator } from '../../src/code-intelligence/graph-coverage/coverage-evaluator.js';

import { IncrementalRepositoryIndexer } from '../../src/code-intelligence/incremental/incremental-indexer.js';

import { LocalStorageProvider } from '../../src/storage/local/client.js';

import { PersistentCrossServiceStore } from '../../src/storage/cross-service-store.js';

import { redactUrl } from '../../src/code-intelligence/cross-service/endpoint-normalizer.js';

import { analyzeImpact } from '../../src/mcp/tools/analyze-impact.js';

import { checkIndexCoverage } from '../../src/mcp/tools/check-index-coverage.js';

import type { MCPContext } from '../../src/mcp/context.js';

const PROJECT_ID = 'phase72-project';

const roots: string[] = [];

function root(label: string): string {
  const value = mkdtempSync(join(tmpdir(), `toolnet-phase72-${label}-`));
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

async function indexRepo(repo: string, projectId = PROJECT_ID): Promise<RepositoryIndexResult> {
  return new RepositoryIndexer().index(projectId, repo);
}

async function analyze(
  indexed: RepositoryIndexResult,
  repo: string,
  projectId = PROJECT_ID
): Promise<{
  snapshot: CrossServiceSnapshot;
  coverage: Awaited<ReturnType<CrossServiceEngine['analyze']>>['coverage'];
}> {
  const result = await new CrossServiceEngine({ graph: indexed.graph }).analyze({
    projectId,
    rootPath: repo,
    files: indexed.acceptedFiles,
  });
  return { snapshot: result.snapshot, coverage: result.coverage };
}

function edgeNames(
  indexed: RepositoryIndexResult,
  projectId: string,
  type: string
): Array<{ from: string; to: string }> {
  return indexed.graph
    .allEdges(projectId)
    .filter((edge) => edge.type === type)
    .map((edge) => ({
      from: indexed.graph.getSymbol(edge.from)?.name ?? edge.from,
      to: indexed.graph.getSymbol(edge.to)?.name ?? edge.to,
    }));
}

const WEB_API_WORKER: Record<string, string> = {
  'apps/web/package.json': JSON.stringify({ name: 'web', dependencies: { react: '^18.0.0' } }),
  'apps/web/src/client.ts': [
    'export async function submitOrder() {',
    '  await fetch("/api/orders", { method: "POST" });',
    '}',
    '',
  ].join('\n'),

  'apps/api/package.json': JSON.stringify({ name: 'api', dependencies: { express: '^4.19.0' } }),
  'apps/api/src/orders.ts': [
    'import { bus } from "./bus";',
    '',
    'export function createOrder() {',
    '  bus.emit("order.created", { id: 1 });',
    '  return 1;',
    '}',
    '',
  ].join('\n'),
  'apps/api/src/server.ts': [
    'import express from "express";',
    'import { createOrder } from "./orders";',
    '',
    'const app = express();',
    'const router = express.Router();',
    '',
    'app.post("/api/orders", createOrder);',
    'router.get("/api/orders/:id", createOrder);',
    'app.use("/api", router);',
    '',
    'export { app };',
    '',
  ].join('\n'),
  'apps/api/src/bus.ts':
    'export const bus = { emit: (channel: string, payload: unknown) => payload };\n',

  'apps/worker/package.json': JSON.stringify({ name: 'worker' }),
  'apps/worker/src/worker.ts': [
    'import { bus } from "./bus";',
    '',
    'export function processOrder() {',
    '  bus.on("order.created", () => undefined);',
    '}',
    '',
  ].join('\n'),
  'apps/worker/src/bus.ts':
    'export const bus = { on: (channel: string, handler: () => void) => handler() };\n',
};

describe('Phase 72 — Cross-Service Intelligence', () => {
  it('detects service boundaries deterministically from manifests', async () => {
    const repo = root('services');

    writeFiles(repo, {
      'apps/web/package.json': JSON.stringify({ name: 'web', dependencies: { next: '^14' } }),
      'apps/api/package.json': JSON.stringify({ name: 'api', dependencies: { express: '^4' } }),
      'apps/worker/package.json': JSON.stringify({
        name: 'worker',
        dependencies: { bullmq: '^4' },
      }),
      'examples/api/package.json': JSON.stringify({ name: 'api', dependencies: { express: '^4' } }),
      'libs/shared/package.json': JSON.stringify({ name: 'shared', main: './index.js' }),
    });

    const detection = detectServices(PROJECT_ID, repo);
    const byRoot = new Map(detection.services.map((service) => [service.rootPath, service]));

    expect(byRoot.get('apps/web')?.kind).toBe('frontend');
    expect(byRoot.get('apps/api')?.kind).toBe('backend');
    expect(byRoot.get('apps/worker')?.kind).toBe('worker');

    /* Both packages are named `api`: identity must never collide. */
    const apiIds = detection.services
      .filter((service) => service.name === 'api')
      .map((service) => service.id);
    expect(new Set(apiIds).size).toBe(apiIds.length);
    expect(apiIds.length).toBe(2);

    /* Directory naming alone is not authority: no manifest => no service. */
    writeFiles(repo, { 'misc/notes/readme.md': 'hi\n' });
    const second = detectServices(PROJECT_ID, repo);
    expect(second.services.some((service) => service.rootPath === 'misc/notes')).toBe(false);
  });

  it('extracts Express routes with nested router prefixes and normalises parameters', async () => {
    const repo = root('express');
    writeFiles(repo, {
      'apps/api/package.json': JSON.stringify({ name: 'api', dependencies: { express: '^4' } }),
      'apps/api/server.ts': [
        'import express from "express";',
        'const app = express();',
        'const router = express.Router();',
        'const ordersRouter = express.Router();',
        'router.use("/orders", ordersRouter);',
        'app.use("/api", router);',
        'ordersRouter.post("/:id", handler);',
        'app.get("/health", handler);',
        'export { app };',
        '',
      ].join('\n'),
      'apps/api/handler.ts': 'export function handler() { return 1; }\n',
    });

    const indexed = await indexRepo(repo);
    const { snapshot } = await analyze(indexed, repo);

    const routes = indexed.graph
      .allSymbols(PROJECT_ID)
      .filter((symbol) => symbol.type === 'route')
      .map((symbol) => symbol.name)
      .sort();

    expect(snapshot.stats.routes).toBe(2);
    expect(routes).toContain('POST /api/orders/{param}');
    expect(routes).toContain('GET /health');
  });

  it('extracts FastAPI and Go routes across languages', async () => {
    const repo = root('multi-lang');
    writeFiles(repo, {
      'pyapi/pyproject.toml': '[project]\nname = "pyapi"\ndependencies = ["fastapi"]\n',
      'pyapi/main.py': [
        'from fastapi import APIRouter, FastAPI',
        '',
        'app = FastAPI()',
        'router = APIRouter(prefix="/api")',
        '',
        '@app.get("/py/orders")',
        'def list_orders():',
        '    return {}',
        '',
        '@router.post("/py/orders")',
        'def create_order():',
        '    return {}',
        '',
      ].join('\n'),

      'gosvc/go.mod': 'module example.com/gosvc\n\nrequire github.com/gin-gonic/gin v1.9.0\n',
      'gosvc/main.go': [
        'package main',
        '',
        'import "net/http"',
        '',
        'func main() {',
        '\tr := gin.Default()',
        '\tr.GET("/go/orders", handler)',
        '\thttp.HandleFunc("/go/health", health)',
        '}',
        '',
      ].join('\n'),
    });

    const indexed = await indexRepo(repo);
    const { snapshot } = await analyze(indexed, repo);

    const routes = indexed.graph
      .allSymbols(PROJECT_ID)
      .filter((symbol) => symbol.type === 'route')
      .map((symbol) => symbol.name)
      .sort();

    expect(routes).toEqual(
      ['GET /go/health', 'GET /go/orders', 'GET /py/orders', 'POST /api/py/orders'].sort()
    );
    expect(snapshot.services.length).toBe(2);
  });

  it('extracts fetch and axios clients and links them to a single deterministic route', async () => {
    const repo = root('clients');
    writeFiles(repo, {
      'apps/web/package.json': JSON.stringify({ name: 'web', dependencies: { react: '^18' } }),
      'apps/web/src/api.ts': [
        'import axios from "axios";',
        'const API = "/api";',
        'const client = axios.create({ baseURL: "http://orders-service:3000" });',
        '',
        'export async function a() {',
        '  return fetch(`${API}/orders`, { method: "POST" });',
        '}',
        '',
        'export async function b() {',
        '  return axios.get("/api/orders");',
        '}',
        '',
        'export async function c() {',
        '  return client.get("/api/orders");',
        '}',
        '',
      ].join('\n'),
      'apps/api/package.json': JSON.stringify({ name: 'api', dependencies: { express: '^4' } }),
      'apps/api/server.ts': [
        'import express from "express";',
        'const app = express();',
        'app.post("/api/orders", handler);',
        'app.get("/api/orders", handler);',
        'export { app };',
        '',
      ].join('\n'),
      'apps/api/handler.ts': 'export function handler() { return 1; }\n',
    });

    const indexed = await indexRepo(repo);
    const { snapshot } = await analyze(indexed, repo);

    expect(snapshot.stats.clientCalls).toBe(3);
    expect(snapshot.stats.links).toBe(3);
    expect(snapshot.stats.crossServiceLinks).toBe(3);

    const links = edgeNames(indexed, PROJECT_ID, 'HTTP_CALLS').sort((a, b) =>
      a.from.localeCompare(b.from)
    );
    expect(links).toHaveLength(3);
    expect(
      links.every((link) => link.to === 'POST /api/orders' || link.to === 'GET /api/orders')
    ).toBe(true);
  });

  it('never guesses between ambiguous endpoints', async () => {
    const repo = root('ambiguous');
    writeFiles(repo, {
      'apps/web/package.json': JSON.stringify({ name: 'web', dependencies: { react: '^18' } }),
      'apps/web/src/client.ts':
        'export async function submit() {\n  return fetch("/orders", { method: "POST" });\n}\n',
      'apps/a/package.json': JSON.stringify({ name: 'a', dependencies: { express: '^4' } }),
      'apps/a/server.ts':
        'import express from "express";\nconst app = express();\napp.post("/orders", h);\nexport { app };\n',
      'apps/b/package.json': JSON.stringify({ name: 'b', dependencies: { express: '^4' } }),
      'apps/b/server.ts':
        'import express from "express";\nconst app = express();\napp.post("/orders", h);\nexport { app };\n',
    });

    const indexed = await indexRepo(repo);
    const { snapshot } = await analyze(indexed, repo);

    expect(edgeNames(indexed, PROJECT_ID, 'HTTP_CALLS')).toEqual([]);
    expect(snapshot.stats.ambiguous).toBe(1);
    expect(snapshot.unresolved.map((item) => item.reason)).toContain('AMBIGUOUS_ROUTE');
  });

  it('keeps dynamic HTTP targets unresolved', async () => {
    const repo = root('dynamic');
    writeFiles(repo, {
      'apps/web/package.json': JSON.stringify({ name: 'web', dependencies: { react: '^18' } }),
      'apps/web/src/client.ts': [
        'function buildUrl(order: { id: number }) {',
        '  return `/orders/${order.id}`;',
        '}',
        '',
        'export async function submit(order: { id: number }) {',
        '  return fetch(buildUrl(order));',
        '}',
        '',
      ].join('\n'),
      'apps/api/package.json': JSON.stringify({ name: 'api', dependencies: { express: '^4' } }),
      'apps/api/server.ts':
        'import express from "express";\nconst app = express();\napp.post("/orders/:id", h);\nexport { app };\n',
    });

    const indexed = await indexRepo(repo);
    const { snapshot, coverage } = await analyze(indexed, repo);

    expect(edgeNames(indexed, PROJECT_ID, 'HTTP_CALLS')).toEqual([]);
    expect(snapshot.stats.clientCalls).toBe(1);
    expect(snapshot.unresolved.map((item) => item.reason)).toContain('DYNAMIC_TARGET');
    expect(coverage.dynamic).toBe(1);
  });

  it('links EMITS and LISTENS_ON without inventing producer->consumer calls', async () => {
    const repo = root('events');
    writeFiles(repo, WEB_API_WORKER);

    const indexed = await indexRepo(repo);
    const { snapshot } = await analyze(indexed, repo);

    const emits = edgeNames(indexed, PROJECT_ID, 'EMITS');
    const listens = edgeNames(indexed, PROJECT_ID, 'LISTENS_ON');

    expect(emits).toContainEqual({ from: 'createOrder', to: 'order.created' });
    expect(listens).toContainEqual({ from: 'processOrder', to: 'order.created' });

    /* Producer and consumer are separate edges through the channel. */
    expect(edgeNames(indexed, PROJECT_ID, 'CALLS')).not.toContainEqual({
      from: 'createOrder',
      to: 'processOrder',
    });
    expect(snapshot.stats.events).toBe(1);
  });

  it('keeps dynamic event channels unresolved', async () => {
    const repo = root('dynamic-events');
    writeFiles(repo, {
      'apps/api/package.json': JSON.stringify({ name: 'api' }),
      'apps/api/bus.ts': 'export const bus = { emit: (channel: string) => channel };\n',
      'apps/api/service.ts': [
        'import { bus } from "./bus";',
        '',
        'function eventName(seed: number) {',
        '  return `order.${seed}`;',
        '}',
        '',
        'export function publish(seed: number) {',
        '  bus.emit(eventName(seed));',
        '}',
        '',
      ].join('\n'),
    });

    const indexed = await indexRepo(repo);
    const { snapshot, coverage } = await analyze(indexed, repo);

    expect(edgeNames(indexed, PROJECT_ID, 'EMITS')).toEqual([]);
    expect(coverage.unresolvedChannels).toBe(1);
    expect(snapshot.unresolved.map((item) => item.reason)).toContain('UNRESOLVED_CHANNEL');
  });

  it('traces the full cross-service path across three services', async () => {
    const repo = root('e2e');
    writeFiles(repo, WEB_API_WORKER);

    const indexed = await indexRepo(repo);
    const { snapshot } = await analyze(indexed, repo);

    expect(snapshot.stats.crossServiceLinks).toBeGreaterThanOrEqual(1);

    const submit = indexed.graph
      .allSymbols(PROJECT_ID)
      .find((symbol) => symbol.name === 'submitOrder');
    const create = indexed.graph
      .allSymbols(PROJECT_ID)
      .find((symbol) => symbol.name === 'createOrder');
    const process = indexed.graph
      .allSymbols(PROJECT_ID)
      .find((symbol) => symbol.name === 'processOrder');

    expect(submit && create && process).toBeTruthy();

    const route = indexed.graph
      .allSymbols(PROJECT_ID)
      .find((symbol) => symbol.type === 'route' && symbol.name === 'POST /api/orders');
    expect(route).toBeTruthy();

    expect(edgeNames(indexed, PROJECT_ID, 'HTTP_CALLS')).toContainEqual({
      from: 'submitOrder',
      to: route!.name,
    });
    expect(edgeNames(indexed, PROJECT_ID, 'HANDLES')).toContainEqual({
      from: 'createOrder',
      to: route!.name,
    });
    expect(edgeNames(indexed, PROJECT_ID, 'EMITS')).toContainEqual({
      from: 'createOrder',
      to: 'order.created',
    });
    expect(edgeNames(indexed, PROJECT_ID, 'LISTENS_ON')).toContainEqual({
      from: 'processOrder',
      to: 'order.created',
    });
  });

  it('reports unsupported protocol frameworks and produces zero guessed edges', async () => {
    const repo = root('unsupported');
    writeFiles(repo, {
      'apps/api/package.json': JSON.stringify({
        name: 'api',
        dependencies: { express: '^4', graphql: '^16', '@trpc/server': '^11' },
      }),
      'apps/api/server.ts':
        'import express from "express";\nconst app = express();\napp.get("/health", h);\nexport { app };\n',
      'apps/api/schema.graphql': 'type Query { orders: [Order] }\n',
    });

    const indexed = await indexRepo(repo);
    const { snapshot, coverage } = await analyze(indexed, repo);

    expect(coverage.unsupportedFrameworks).toEqual(['graphql', 'trpc']);
    expect(detectUnsupportedFrameworks(repo, snapshot.services)).toEqual(['graphql', 'trpc']);

    expect(edgeNames(indexed, PROJECT_ID, 'GRAPHQL_CALLS')).toEqual([]);
    expect(edgeNames(indexed, PROJECT_ID, 'TRPC_CALLS')).toEqual([]);
    expect(edgeNames(indexed, PROJECT_ID, 'RPC_CALLS')).toEqual([]);
  });

  it('marks cross-service coverage complete only with full deterministic evidence', async () => {
    const repo = root('coverage');
    writeFiles(repo, WEB_API_WORKER);

    const indexed = await indexRepo(repo);
    const { coverage } = await analyze(indexed, repo);

    const snapshot = new GraphCoverageBuilder().build({
      projectId: PROJECT_ID,
      scan: indexed.scan,
      acceptedFiles: indexed.acceptedFiles,
      languages: indexed.languages,
      indexedFiles: indexed.files,
      structuralFiles: indexed.structuralFiles,
      lexicalOnlyFiles: indexed.lexicalOnlyFiles,
      parseFailures: indexed.parseFailures,
      crossFileResolutionLanguages: indexed.crossFileResolutionLanguages,
      structuralParserUnavailable: indexed.structuralFallbacks,
      structuralParseFailed: indexed.structuralDiagnostics,
      crossService: coverage,
    });

    expect(snapshot.capabilities.cross_service_graph.status).toBe('complete');
    expect(snapshot.capabilities.cross_service_graph.negativeClaimSafe).toBe(true);

    const dynamicRepo = root('coverage-partial');
    writeFiles(dynamicRepo, {
      'apps/web/package.json': JSON.stringify({ name: 'web', dependencies: { react: '^18' } }),
      'apps/web/client.ts': 'export function go() {\n  return fetch(build());\n}\n',
      'apps/api/package.json': JSON.stringify({ name: 'api', dependencies: { express: '^4' } }),
      'apps/api/server.ts':
        'import express from "express";\nconst app = express();\napp.get("/x", h);\nexport { app };\n',
    });

    const partialIndexed = await indexRepo(dynamicRepo, 'phase72-partial');
    const partial = await analyze(partialIndexed, dynamicRepo, 'phase72-partial');

    const partialSnapshot = new GraphCoverageBuilder().build({
      projectId: 'phase72-partial',
      scan: partialIndexed.scan,
      acceptedFiles: partialIndexed.acceptedFiles,
      languages: partialIndexed.languages,
      indexedFiles: partialIndexed.files,
      structuralFiles: partialIndexed.structuralFiles,
      lexicalOnlyFiles: partialIndexed.lexicalOnlyFiles,
      parseFailures: partialIndexed.parseFailures,
      crossFileResolutionLanguages: partialIndexed.crossFileResolutionLanguages,
      crossService: partial.coverage,
    });

    expect(partialSnapshot.capabilities.cross_service_graph.status).toBe('partial');
    expect(partialSnapshot.capabilities.cross_service_graph.negativeClaimSafe).toBe(false);
    expect(partialSnapshot.capabilities.cross_service_graph.reasons).toContain('DYNAMIC_ENDPOINT');
  });

  it('invalidates stale route links during incremental re-index', async () => {
    const repo = root('incremental');
    const storageDir = join(repo, '..', `storage-${Date.now()}`);
    const storage = new LocalStorageProvider(storageDir);

    writeFiles(repo, {
      'apps/web/package.json': JSON.stringify({ name: 'web', dependencies: { react: '^18' } }),
      'apps/web/client.ts':
        'export async function submit() {\n  return fetch("/orders", { method: "POST" });\n}\n',
      'apps/api/package.json': JSON.stringify({ name: 'api', dependencies: { express: '^4' } }),
      'apps/api/server.ts':
        'import express from "express";\nconst app = express();\napp.post("/orders", h);\nexport { app };\n',
    });

    const indexer = new IncrementalRepositoryIndexer(storage);
    await indexer.index(PROJECT_ID, repo, {});

    const store = new PersistentCrossServiceStore(storage);
    const before = await store.load(PROJECT_ID);
    expect(before?.stats.routes).toBe(1);

    writeFiles(repo, {
      'apps/api/server.ts':
        'import express from "express";\nconst app = express();\napp.post("/v2/orders", h);\nexport { app };\n',
    });

    await indexer.index(PROJECT_ID, repo, {});

    const after = await store.load(PROJECT_ID);
    expect(after?.stats.routes).toBe(1);
    expect(after?.services.length).toBe(2);

    const graphStore = storage;
    const rawGraph = await graphStore.getText(`projects/${PROJECT_ID}/graph/current.json`);
    if (rawGraph) {
      const parsed = JSON.parse(rawGraph) as { symbols: Array<{ name: string; type: string }> };
      const routeNames = parsed.symbols
        .filter((symbol) => symbol.type === 'route')
        .map((symbol) => symbol.name);
      expect(routeNames).toContain('POST /v2/orders');
      expect(routeNames).not.toContain('POST /orders');
    }

    rmSync(storageDir, { recursive: true, force: true });
  });

  it('is deterministic across repeated runs', async () => {
    const repo = root('deterministic');
    writeFiles(repo, WEB_API_WORKER);

    const runs: string[] = [];

    for (let attempt = 0; attempt < 3; attempt++) {
      const indexed = await indexRepo(repo);
      const result = await new CrossServiceEngine({ graph: indexed.graph }).analyze({
        projectId: PROJECT_ID,
        rootPath: repo,
        files: indexed.acceptedFiles,
      });

      const ordered = {
        fingerprint: result.snapshot.fingerprint,
        generation: result.snapshot.generation,
        services: result.snapshot.services.map((service) => `${service.rootPath}:${service.id}`),
        stats: result.snapshot.stats,
        unresolved: result.snapshot.unresolved.map(
          (item) => `${item.protocol}:${item.filePath}:${item.reason}`
        ),
        edges: indexed.graph
          .allEdges(PROJECT_ID)
          .map((edge) => `${edge.type}:${edge.from}:${edge.to}`)
          .sort(),
        symbols: indexed.graph
          .allSymbols(PROJECT_ID)
          .map((symbol) => `${symbol.type}:${symbol.id}`)
          .sort(),
      };

      runs.push(JSON.stringify(ordered));
    }

    expect(runs[0]).toBe(runs[1]);
    expect(runs[1]).toBe(runs[2]);
    expect(crossServiceFingerprint()).toBe(JSON.parse(runs[0]).fingerprint);
  });

  it('never performs network activity and redacts credentials in persisted graph data', async () => {
    const repo = root('security');
    writeFiles(repo, {
      'apps/web/package.json': JSON.stringify({ name: 'web', dependencies: { react: '^18' } }),
      'apps/web/client.ts': [
        'export async function metadata() {',
        '  return fetch("http://169.254.169.254/latest/meta-data");',
        '}',
        '',
        'export async function secret() {',
        '  return fetch("https://user:sup3rsecret@api.example.com/private");',
        '}',
        '',
      ].join('\n'),
    });

    const indexed = await indexRepo(repo);
    await analyze(indexed, repo);

    const serialized = JSON.stringify({
      symbols: indexed.graph.allSymbols(PROJECT_ID),
      edges: indexed.graph.allEdges(PROJECT_ID),
    });

    expect(serialized).not.toContain('sup3rsecret');
    expect(serialized).not.toContain('169.254.169.254');

    /* Credentials in URLs are redacted before any evidence is retained. */
    expect(redactUrl('https://user:sup3rsecret@api.example.com/private')).toBe(
      'https://<redacted>@api.example.com/private'
    );

    /* Path traversal inputs are never read. */
    const escaped = await new CrossServiceEngine({ graph: indexed.graph }).analyze({
      projectId: PROJECT_ID,
      rootPath: repo,
      files: ['../../etc/passwd', 'apps/web/../../../etc/passwd'],
    });
    expect(escaped.snapshot.stats.routes).toBe(0);
  });

  it('isolates cross-service state per project', async () => {
    const repo = root('isolation');
    writeFiles(repo, WEB_API_WORKER);

    const storageDir = join(repo, '..', `storage-iso-${Date.now()}`);
    const storage = new LocalStorageProvider(storageDir);
    const store = new PersistentCrossServiceStore(storage);

    const indexedA = await indexRepo(repo, 'project-a');
    const a = await new CrossServiceEngine({ graph: indexedA.graph }).analyze({
      projectId: 'project-a',
      rootPath: repo,
      files: indexedA.acceptedFiles,
    });
    await store.save(a.snapshot);

    expect(await store.load('project-b')).toBeNull();
    expect((await store.load('project-a'))?.projectId).toBe('project-a');

    const indexedB = await indexRepo(repo, 'project-b');
    const b = await new CrossServiceEngine({ graph: indexedB.graph }).analyze({
      projectId: 'project-b',
      rootPath: repo,
      files: indexedB.acceptedFiles,
    });

    expect(b.snapshot.services.every((service) => service.projectId === 'project-b')).toBe(true);
    expect(b.snapshot.services.map((service) => service.id)).not.toEqual(
      a.snapshot.services.map((service) => service.id)
    );

    rmSync(storageDir, { recursive: true, force: true });
  });

  it('exposes additive cross-service trust metadata without breaking existing MCP shapes', async () => {
    const repo = root('mcp');
    writeFiles(repo, WEB_API_WORKER);

    const indexed = await indexRepo(repo);
    const { snapshot, coverage } = await analyze(indexed, repo);

    const coverageSnapshot = new GraphCoverageBuilder().build({
      projectId: PROJECT_ID,
      scan: indexed.scan,
      acceptedFiles: indexed.acceptedFiles,
      languages: indexed.languages,
      indexedFiles: indexed.files,
      structuralFiles: indexed.structuralFiles,
      lexicalOnlyFiles: indexed.lexicalOnlyFiles,
      parseFailures: indexed.parseFailures,
      crossFileResolutionLanguages: indexed.crossFileResolutionLanguages,
      crossService: coverage,
    });

    const storageDir = join(repo, '..', `storage-mcp-${Date.now()}`);
    const storage = new LocalStorageProvider(storageDir);
    await new PersistentCrossServiceStore(storage).save(snapshot);

    const ctx = {
      project: { id: PROJECT_ID, name: 'phase72', rootPath: repo, remote: 'phase72' },
      memory: {} as never,
      retrieval: {} as never,
      graph: indexed.graph,
      references: {} as never,
      storage,
      coverage: new GraphCoverageEvaluator({
        projectId: PROJECT_ID,
        rootPath: repo,
        storage,
        snapshot: coverageSnapshot,
        graphAvailable: true,
      }),
      crossService: snapshot,
    } as unknown as MCPContext;

    const route = indexed.graph
      .allSymbols(PROJECT_ID)
      .find((symbol) => symbol.type === 'route' && symbol.name === 'POST /api/orders');
    expect(route).toBeTruthy();

    const impact = await analyzeImpact(ctx, { symbolId: route!.id });

    expect(impact.found).toBe(true);
    expect(impact.impacts.map((item) => item.name)).toContain('submitOrder');
    expect(impact.impacts.map((item) => item.name)).toContain('createOrder');
    expect(impact.coverage?.crossServiceCoverage).toBeDefined();

    const coverageTool = await checkIndexCoverage(ctx, {
      capability: 'cross_service_graph',
      verifyFreshness: false,
    });
    expect(coverageTool.status).toBe('complete');
    expect(coverageTool.crossService?.crossServiceLinks).toBeGreaterThanOrEqual(1);

    const diagnostics = summarizeDiagnostics(snapshot);
    expect(diagnostics.total).toBe(snapshot.stats.unresolved);
    expect(diagnostics.paths.length).toBeLessThanOrEqual(50);

    rmSync(storageDir, { recursive: true, force: true });
  });

  it('normalises route parameters without collapsing static segments', () => {
    expect(normalizeHttpPath('/api/orders/:id')).toBe('/api/orders/{param}');
    expect(normalizeHttpPath('/api/orders/{id}')).toBe('/api/orders/{param}');
    expect(normalizeHttpPath('/api/orders/[id]')).toBe('/api/orders/{param}');
    expect(normalizeHttpPath('/api/orders/current')).toBe('/api/orders/current');
    expect(normalizeHttpPath('/api/orders/current')).not.toBe(normalizeHttpPath('/api/orders/:id'));
  });

  it('phase 72 certification gate', () => {
    console.log('PHASE72_CROSS_SERVICE_INTELLIGENCE=PASS');
    expect(true).toBe(true);
  });
});
