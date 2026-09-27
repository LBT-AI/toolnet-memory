import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

import type { CodeSymbol, GraphEdge } from '../../core/types.js';

import { createEdgeProvenance } from '../graph/edge-provenance.js';
import { createGraphEdge } from '../graph/edge-factory.js';
import type { CodeGraphStore } from '../graph/graph-store.js';
import {
  getTreeSitterRuntime,
  initializeTreeSitterRuntime,
  type TreeSitterRuntime,
} from '../parsers/tree-sitter/runtime.js';

import {
  canonicalEventId,
  canonicalRouteId,
  normalizeHttpPath,
  originOf,
} from './endpoint-normalizer.js';
import type {
  CrossServiceClientCall,
  CrossServiceCoverageInput,
  CrossServiceSnapshot,
  CrossServiceUnresolvedReason,
  EventDeclaration,
  HttpClientCall,
  HttpOperationDeclaration,
  HttpRouteDeclaration,
  ProtocolClientCall,
  ServiceDescriptor,
  UnresolvedCrossServiceReference,
} from './types.js';
import { crossServiceFingerprint } from './fingerprint.js';
import { createDefaultExtractorRegistry, type CrossServiceExtractorRegistry } from './registry.js';
import { detectServices, detectUnsupportedFrameworks, serviceForFile } from './service-detector.js';
import type { ExtractionContext, ExtractionOutput } from './extractor.js';
import { buildFleetProjectExport } from './fleet-export.js';
import type { FleetProjectExport } from '../fleet/types.js';

const MAX_SOURCE_BYTES = 1_048_576;
const MAX_UNRESOLVED = 200;

export interface CrossServiceEngineOptions {
  graph: CodeGraphStore;
  registry?: CrossServiceExtractorRegistry;
  runtime?: TreeSitterRuntime | null;
}

export interface CrossServiceAnalysisInput {
  projectId: string;
  rootPath: string;
  /** Accepted, project-root-relative files to analyse. */
  files: readonly string[];
  /*
   * Phase 73 additive Fleet export inputs. Optional so existing callers keep
   * working; the export is always produced.
   */
  projectName?: string;
  projectRemote?: string;
  explicitHosts?: readonly string[];
  graphGeneration?: string;
  graphFingerprint?: string;
}

export interface CrossServiceAnalysisResult {
  snapshot: CrossServiceSnapshot;
  coverage: CrossServiceCoverageInput;
  edgesAdded: number;
  symbolsAdded: number;
  /*
   * Phase 73: minimal, sanitized per-project view consumed by the Fleet
   * Builder. It contains resource identities only — never full project
   * graphs, source text or credentials.
   */
  export: FleetProjectExport;
}

function cleanPath(value: string): string {
  return value.replaceAll('\\', '/').replace(/^\.\//u, '');
}

function withinRoot(rootPath: string, candidate: string): boolean {
  const root = resolve(rootPath);
  const target = resolve(candidate);
  if (target === root) {
    return true;
  }
  const rel = relative(root, target);
  return rel.length > 0 && !rel.startsWith('..') && !rel.startsWith(`..${sep}`);
}

function deterministicId(...parts: unknown[]): string {
  return createHash('sha256').update(parts.join(':')).digest('hex').slice(0, 24);
}

/**
 * Deterministic cross-service engine.
 *
 * Pure static analysis: no network access, no source execution, no shell.
 * Every produced edge is backed by deterministic evidence; ambiguous and
 * dynamic references stay unresolved instead of being guessed.
 */
export class CrossServiceEngine {
  private readonly graph: CodeGraphStore;
  private readonly registry: CrossServiceExtractorRegistry;

  constructor(options: CrossServiceEngineOptions) {
    this.graph = options.graph;
    this.registry =
      options.registry ??
      createDefaultExtractorRegistry({
        runtime: options.runtime ?? getTreeSitterRuntime() ?? initializeTreeSitterRuntime(),
      });
  }

  async analyze(input: CrossServiceAnalysisInput): Promise<CrossServiceAnalysisResult> {
    const { projectId, rootPath } = input;

    const detection = detectServices(projectId, rootPath);
    const services = detection.services;

    const existingEdgeKeys = new Set(
      this.graph.allEdges(projectId).map((edge) => `${edge.from}:${edge.type}:${edge.to}`)
    );

    const routeSymbolIds = new Map<string, string>();
    const eventSymbolIds = new Map<string, string>();

    const routes: HttpRouteDeclaration[] = [];
    const operations: HttpOperationDeclaration[] = [];
    const clients: CrossServiceClientCall[] = [];
    const events: EventDeclaration[] = [];

    /*
     * Protocol frameworks declared by a service but not extractable in
     * Phase 72 must degrade cross-service trust instead of being ignored.
     */
    const unsupportedFrameworks = new Set<string>(detectUnsupportedFrameworks(rootPath, services));

    const symbolsByFile = this.indexSymbols(projectId);
    const symbolsByName = this.indexSymbolsByName(projectId);

    let symbolsAdded = 0;
    let edgesAdded = 0;

    const addSymbol = (symbol: CodeSymbol): void => {
      if (this.graph.getSymbol(symbol.id)) {
        return;
      }
      this.graph.addSymbol(symbol);
      symbolsAdded++;
    };

    const addEdge = (edge: GraphEdge): boolean => {
      const key = `${edge.from}:${edge.type}:${edge.to}`;
      if (existingEdgeKeys.has(key)) {
        return false;
      }
      existingEdgeKeys.add(key);
      this.graph.addEdge(edge);
      edgesAdded++;
      return true;
    };

    for (const rawFile of [...input.files].sort()) {
      const filePath = cleanPath(rawFile);
      const service = serviceForFile(services, filePath);

      if (!service) {
        continue;
      }

      const source = this.readSource(rootPath, filePath);
      if (source === null) {
        continue;
      }

      const extractors = this.registry.forFile(filePath);
      if (extractors.length === 0) {
        continue;
      }

      const context: ExtractionContext = {
        projectId,
        rootPath,
        filePath,
        source,
        service,
        callerSymbolFor: (line) => this.containingSymbol(symbolsByFile, filePath, line),
      };

      for (const extractor of extractors) {
        const result = await extractor.extract(context);
        this.mergeExtraction(result, routes, operations, clients, events, unsupportedFrameworks);
      }
    }

    /*
     * 1. Service + route/operation symbols.
     */
    for (const service of services) {
      addSymbol({
        id: service.id,
        projectId,
        name: service.name,
        qualifiedName: `service:${service.rootPath}`,
        type: 'service',
        filePath: service.manifests[0] ?? 'package.json',
        startLine: 1,
        metadata: {
          kind: service.kind,
          rootPath: service.rootPath,
          manifests: service.manifests,
        },
      });
    }

    for (const route of routes) {
      const id = deterministicId(
        canonicalRouteId(projectId, route.serviceId, route.method, route.path)
      );
      routeSymbolIds.set(`${route.serviceId}:${route.method}:${route.path}`, id);

      addSymbol({
        id,
        projectId,
        name: `${route.method} ${route.path}`,
        qualifiedName: `${route.method} ${route.path}`,
        type: 'route',
        filePath: route.filePath,
        startLine: route.line,
        metadata: {
          protocol: 'http',
          framework: route.framework,
          serviceId: route.serviceId,
          method: route.method,
          path: route.path,
          rawPath: route.rawPath,
        },
      });

      addEdge(
        createGraphEdge({
          projectId,
          from: route.serviceId,
          to: id,
          type: 'DEFINES',
          provenance: createEdgeProvenance('analysis', 'route_declaration', 'deterministic', {
            filePath: route.filePath,
            line: route.line,
          }),
        })
      );

      const handlerId = route.handlerName
        ? this.resolveHandler(symbolsByFile, symbolsByName, route.filePath, route.handlerName)
        : undefined;

      if (handlerId) {
        addEdge(
          createGraphEdge({
            projectId,
            from: handlerId,
            to: id,
            type: 'HANDLES',
            provenance: createEdgeProvenance('analysis', 'route_declaration', 'deterministic', {
              filePath: route.filePath,
              line: route.line,
            }),
          })
        );
      }
    }

    for (const operation of operations) {
      const id = deterministicId(
        `${operation.protocol}:${projectId}:${operation.serviceId}:${operation.operation}`
      );
      routeSymbolIds.set(`${operation.serviceId}:${operation.protocol}:${operation.operation}`, id);

      addSymbol({
        id,
        projectId,
        name: `${operation.protocol.toUpperCase()} ${operation.operation}`,
        qualifiedName: `${operation.protocol.toUpperCase()} ${operation.operation}`,
        type: 'route',
        filePath: operation.filePath,
        startLine: operation.line,
        metadata: {
          protocol: operation.protocol,
          framework: operation.framework,
          serviceId: operation.serviceId,
          operation: operation.operation,
        },
      });

      addEdge(
        createGraphEdge({
          projectId,
          from: operation.serviceId,
          to: id,
          type: 'DEFINES',
          provenance: createEdgeProvenance('analysis', 'route_declaration', 'deterministic', {
            filePath: operation.filePath,
            line: operation.line,
          }),
        })
      );
    }

    /*
     * 2. Deterministic client -> route linking.
     */
    const unresolved: UnresolvedCrossServiceReference[] = [];
    const coverage: CrossServiceCoverageInput = {
      clientCalls: 0,
      linked: 0,
      ambiguous: 0,
      dynamic: 0,
      unresolved: 0,
      unsupportedFrameworks: [...unsupportedFrameworks].sort(),
      unresolvedChannels: 0,
    };

    let sameServiceLinks = 0;
    let crossServiceLinks = 0;

    const addUnresolved = (
      reference: Omit<UnresolvedCrossServiceReference, 'reason'>,
      reason: CrossServiceUnresolvedReason
    ): void => {
      coverage.unresolved++;
      if (unresolved.length < MAX_UNRESOLVED) {
        unresolved.push({ ...reference, reason });
      }
    };

    for (const client of [...clients].sort(compareClients)) {
      coverage.clientCalls++;

      if (client.protocol !== 'http') {
        continue;
      }

      const callerService = serviceForFile(services, client.filePath);
      const resolved = this.resolveHttpClient(client, routes, routeSymbolIds, services);

      if (resolved.status === 'dynamic') {
        coverage.dynamic++;
        addUnresolved(this.clientReference(client), 'DYNAMIC_TARGET');
        continue;
      }

      if (resolved.status === 'ambiguous') {
        coverage.ambiguous++;
        addUnresolved(this.clientReference(client), 'AMBIGUOUS_ROUTE');
        continue;
      }

      if (resolved.status === 'unresolved') {
        addUnresolved(this.clientReference(client), 'NO_ROUTE_MATCH');
        continue;
      }

      if (!client.callerSymbolId) {
        addUnresolved(this.clientReference(client), 'NO_ROUTE_MATCH');
        continue;
      }

      const isCrossService = callerService ? callerService.id !== resolved.route.serviceId : true;

      const added = addEdge(
        createGraphEdge({
          projectId,
          from: client.callerSymbolId,
          to: resolved.symbolId,
          type: 'HTTP_CALLS',
          provenance: createEdgeProvenance('analysis', 'resolved_symbol', 'deterministic', {
            filePath: client.filePath,
            line: client.line,
          }),
          metadata: {
            protocol: 'http',
            crossService: isCrossService,
            sourceServiceId: callerService?.id,
            targetServiceId: resolved.route.serviceId,
            method: resolved.route.method,
            path: resolved.route.path,
          },
        })
      );

      if (added) {
        coverage.linked++;
        if (isCrossService) {
          crossServiceLinks++;
        } else {
          sameServiceLinks++;
        }
      }
    }

    /*
     * 3. Event channels: EMITS / LISTENS_ON.
     */
    for (const event of [...events].sort(compareEvents)) {
      if (!event.channel) {
        coverage.unresolvedChannels++;
        addUnresolved(
          {
            protocol: 'event',
            filePath: event.filePath,
            line: event.line,
            ...(event.callerSymbolId ? { sourceSymbolId: event.callerSymbolId } : {}),
          },
          'UNRESOLVED_CHANNEL'
        );
        continue;
      }

      const id = deterministicId(canonicalEventId(projectId, event.provider, event.channel));
      eventSymbolIds.set(`${event.provider}:${event.channel}`, id);

      addSymbol({
        id,
        projectId,
        name: event.channel,
        qualifiedName: `${event.provider}:${event.channel}`,
        type: 'event',
        filePath: event.filePath,
        startLine: event.line,
        metadata: {
          protocol: 'event',
          provider: event.provider,
          channel: event.channel,
        },
      });

      if (!event.callerSymbolId) {
        continue;
      }

      addEdge(
        createGraphEdge({
          projectId,
          from: event.callerSymbolId,
          to: id,
          type: event.direction === 'emit' ? 'EMITS' : 'LISTENS_ON',
          provenance: createEdgeProvenance('analysis', 'declaration', 'deterministic', {
            filePath: event.filePath,
            line: event.line,
          }),
          metadata: {
            protocol: 'event',
            provider: event.provider,
            channel: event.channel,
            direction: event.direction,
          },
        })
      );
    }

    /* Protocol client calls (grpc/graphql/trpc) remain unresolved in Phase 72. */
    for (const client of clients) {
      if (client.protocol === 'http') {
        continue;
      }
      coverage.unresolved++;
      addUnresolved(this.clientReference(client), 'UNSUPPORTED_FRAMEWORK');
    }

    const snapshot: CrossServiceSnapshot = {
      version: 1,
      projectId,
      generation: deterministicId(projectId, crossServiceFingerprint()),
      fingerprint: crossServiceFingerprint(),
      indexedAt: new Date().toISOString(),
      services,
      stats: {
        services: services.length,
        routes: routes.length,
        operations: operations.length,
        events: eventSymbolIds.size,
        clientCalls: coverage.clientCalls,
        links: coverage.linked,
        sameServiceLinks,
        crossServiceLinks,
        ambiguous: coverage.ambiguous,
        unresolved: coverage.unresolved,
        unsupportedFrameworks: coverage.unsupportedFrameworks,
      },
      unresolved,
    };

    const serviceManifests = services.flatMap((service) =>
      service.manifests.map((manifest) => ({ service, manifest }))
    );

    const fleetExport = buildFleetProjectExport({
      projectId,
      projectName: input.projectName ?? projectId,
      projectRemote: input.projectRemote,
      explicitHosts: input.explicitHosts,
      rootPath,
      generation: input.graphGeneration ?? snapshot.generation,
      graphFingerprint: input.graphFingerprint ?? crossServiceFingerprint(),
      /*
       * Server-side capability completeness.
       *
       * A client call with no matching endpoint *inside the same project* is
       * exactly the cross-repo case the Fleet linker resolves, so it is not a
       * project-level defect. Dynamic/ambiguous targets, unresolved channels
       * and unsupported protocol frameworks are genuine gaps at any scope.
       */
      crossServiceComplete:
        coverage.dynamic === 0 &&
        coverage.ambiguous === 0 &&
        coverage.unresolvedChannels === 0 &&
        coverage.unsupportedFrameworks.length === 0,
      serviceManifests,
      services,
      routes,
      operations,
      clients,
      events,
      routeResourceIds: routeSymbolIds,
      eventResourceIds: eventSymbolIds,
    });

    return {
      snapshot,
      coverage,
      edgesAdded,
      symbolsAdded,
      export: fleetExport,
    };
  }

  private resolveHttpClient(
    client: HttpClientCall,
    routes: readonly HttpRouteDeclaration[],
    routeSymbolIds: ReadonlyMap<string, string>,
    services: readonly ServiceDescriptor[]
  ):
    | { status: 'resolved'; route: HttpRouteDeclaration; symbolId: string }
    | { status: 'dynamic' }
    | { status: 'ambiguous' }
    | { status: 'unresolved' } {
    const rawPath = client.target.path;

    if (rawPath === null) {
      return { status: 'dynamic' };
    }

    const normalized = normalizeHttpPath(rawPath);
    const method = client.target.method;

    let candidates = routes.filter((route) => route.path === normalized);

    if (method !== 'UNKNOWN') {
      candidates = candidates.filter((route) => route.method === method);
    }

    if (candidates.length === 0) {
      return { status: 'unresolved' };
    }

    /*
     * Host/base-URL evidence can narrow the candidate set to a single service
     * only when the host maps deterministically to a service root name. No DNS
     * or network probing is performed.
     */
    const origin = client.baseUrl ? originOf(client.baseUrl) : undefined;
    if (origin && candidates.length > 1) {
      const host = origin.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//u, '').split(':')[0];
      const narrowed = candidates.filter((route) => {
        const service = services.find((item) => item.id === route.serviceId);
        if (!service) {
          return false;
        }
        const rootName =
          (service.rootPath === '.' ? service.name : service.rootPath.split('/').pop()) ?? '';
        return rootName.length > 0 && host.includes(rootName);
      });
      if (narrowed.length > 0) {
        candidates = narrowed;
      }
    }

    if (candidates.length !== 1) {
      return { status: 'ambiguous' };
    }

    const route = candidates[0];
    const symbolId = routeSymbolIds.get(`${route.serviceId}:${route.method}:${route.path}`);

    if (!symbolId) {
      return { status: 'unresolved' };
    }

    return { status: 'resolved', route, symbolId };
  }

  private clientReference(
    client: CrossServiceClientCall
  ): Omit<UnresolvedCrossServiceReference, 'reason'> {
    return {
      protocol: client.protocol,
      filePath: client.filePath,
      line: client.line,
      ...(client.callerSymbolId ? { sourceSymbolId: client.callerSymbolId } : {}),
    };
  }

  private readSource(rootPath: string, filePath: string): string | null {
    const absolute = resolve(rootPath, filePath);

    if (!withinRoot(rootPath, absolute)) {
      return null;
    }

    try {
      const stats = statSync(absolute);
      if (!stats.isFile() || stats.size > MAX_SOURCE_BYTES) {
        return null;
      }
      return readFileSync(absolute, 'utf8');
    } catch {
      return null;
    }
  }

  private indexSymbols(projectId: string): Map<string, CodeSymbol[]> {
    const byFile = new Map<string, CodeSymbol[]>();

    for (const symbol of this.graph.allSymbols(projectId)) {
      if (symbol.type === 'file' || symbol.type === 'module') {
        continue;
      }
      const key = cleanPath(symbol.filePath);
      const list = byFile.get(key) ?? [];
      list.push(symbol);
      byFile.set(key, list);
    }

    for (const list of byFile.values()) {
      list.sort((left, right) => (left.startLine ?? 0) - (right.startLine ?? 0));
    }

    return byFile;
  }

  private containingSymbol(
    byFile: ReadonlyMap<string, CodeSymbol[]>,
    filePath: string,
    line: number
  ): string | undefined {
    const symbols = byFile.get(cleanPath(filePath));
    if (!symbols) {
      return undefined;
    }

    let candidate: CodeSymbol | undefined;
    for (const symbol of symbols) {
      if ((symbol.startLine ?? 0) <= line) {
        candidate = symbol;
      } else {
        break;
      }
    }

    return candidate?.id;
  }

  private indexSymbolsByName(projectId: string): Map<string, CodeSymbol[]> {
    const byName = new Map<string, CodeSymbol[]>();

    for (const symbol of this.graph.allSymbols(projectId)) {
      if (symbol.type === 'file' || symbol.type === 'module' || symbol.type === 'service') {
        continue;
      }
      const list = byName.get(symbol.name) ?? [];
      list.push(symbol);
      byName.set(symbol.name, list);
    }

    for (const list of byName.values()) {
      list.sort((left, right) => left.id.localeCompare(right.id));
    }

    return byName;
  }

  /**
   * Deterministic handler resolution.
   *
   * Same-file uniqueness is preferred; a project-wide unique name is accepted
   * next. Multiple candidates are never resolved by guessing.
   */
  private resolveHandler(
    byFile: ReadonlyMap<string, CodeSymbol[]>,
    byName: ReadonlyMap<string, CodeSymbol[]>,
    filePath: string,
    handlerName: string
  ): string | undefined {
    const simple = handlerName.split('.').pop() ?? handlerName;
    const callable = (symbol: CodeSymbol): boolean =>
      symbol.type === 'function' || symbol.type === 'method' || symbol.type === 'class';

    const local = (byFile.get(cleanPath(filePath)) ?? []).filter(
      (symbol) => callable(symbol) && (symbol.name === simple || symbol.name === handlerName)
    );
    if (local.length === 1) {
      return local[0].id;
    }
    if (local.length > 1) {
      return undefined;
    }

    const global = (byName.get(simple) ?? []).filter(callable);
    return global.length === 1 ? global[0].id : undefined;
  }

  private mergeExtraction(
    extraction: ExtractionOutput,
    routes: HttpRouteDeclaration[],
    operations: HttpOperationDeclaration[],
    clients: CrossServiceClientCall[],
    events: EventDeclaration[],
    unsupportedFrameworks: Set<string>
  ): void {
    routes.push(...extraction.routes);
    operations.push(...extraction.operations);
    clients.push(...extraction.clients);
    events.push(...extraction.events);

    for (const framework of extraction.unsupportedFrameworks) {
      unsupportedFrameworks.add(framework);
    }
  }
}

function compareClients(left: CrossServiceClientCall, right: CrossServiceClientCall): number {
  return (
    left.filePath.localeCompare(right.filePath) ||
    left.line - right.line ||
    left.protocol.localeCompare(right.protocol)
  );
}

function compareEvents(left: EventDeclaration, right: EventDeclaration): number {
  return (
    left.filePath.localeCompare(right.filePath) ||
    left.line - right.line ||
    left.provider.localeCompare(right.provider) ||
    left.channel.localeCompare(right.channel) ||
    left.direction.localeCompare(right.direction)
  );
}

export type { ProtocolClientCall };
