/*
 * Phase 74 — Read-only Fleet graph adapter.
 *
 * Fleet scope is a composite view built from:
 *   1. the sanitized Fleet snapshot (projects + CROSS_* edges), and
 *   2. the sanitized per-project exports (services/endpoints/events/packages),
 *   3. the *current* project graph only.
 *
 * Remote project internals are never exposed. Cross-scope traversal uses node
 * identity aliasing — a local route/event symbol and its Fleet resource are the
 * same node — so no synthetic edge is ever created to fake a relationship.
 */

import type { FleetProjectExport, FleetSnapshot } from '../fleet/types.js';

import type { ReadableGraph } from './adapter.js';

import type {
  QueryEdge,
  QueryEdgeType,
  QueryNode,
  QueryNodeType,
  QueryPropertyValue,
  QueryScope,
} from './types.js';

function outboundResourceId(filePath: string, line: number): string {
  return `outbound:${filePath}:${line}`;
}

function packageDependencyResourceId(source: string, name: string): string {
  return `pkgdep:${source}:${name}`;
}

export interface FleetAdapterInput {
  snapshot: FleetSnapshot;
  exports: ReadonlyMap<string, FleetProjectExport>;
  /** Current project — the only local graph the query layer may see. */
  localProjectId?: string;
  local?: ReadableGraph;
}

export class FleetGraphAdapter implements ReadableGraph {
  readonly scope: QueryScope = 'fleet';
  readonly generation: string;

  private readonly byId = new Map<string, QueryNode>();
  private readonly byType = new Map<QueryNodeType, QueryNode[]>();
  private readonly byName = new Map<string, QueryNode[]>();
  private readonly byQualifiedName = new Map<string, QueryNode[]>();

  private readonly outgoingEdges = new Map<string, QueryEdge[]>();
  private readonly incomingEdges = new Map<string, QueryEdge[]>();
  private readonly observed = new Set<QueryEdgeType>();

  /** Fleet resource node id -> local candidate ids (identity aliasing). */
  private readonly fleetToLocal = new Map<string, string>();
  private readonly localToFleet = new Map<string, string>();

  private readonly localOutboundCallers = new Map<string, string>();

  /**
   * Project-level projection of fleet edges. `(a:Project)-[:CROSS_HTTP_CALLS]->(b:Project)`
   * is the same relationship at project granularity, so it is a projection of
   * the resource edge rather than a separate, invented relationship. One edge
   * per (type, source project, target project) keeps it deduplicated.
   */
  private readonly projectedEdges = new Set<string>();

  constructor(private readonly input: FleetAdapterInput) {
    this.generation = input.snapshot.generation;

    this.buildProjectNodes();
    this.buildResourceNodes();
    this.buildAliases();
    this.buildEdges();
    this.sortBuckets();
  }

  /* ---------------------------------------------------------------- *
   * Build
   * ---------------------------------------------------------------- */

  private add(node: QueryNode): void {
    if (this.byId.has(node.id)) {
      return;
    }

    /*
     * Uniform, allowlisted property surface. Only the properties declared in
     * the schema registry's PROPERTY_ALLOWLIST are ever set here.
     */
    if (node.properties.type === undefined) {
      node.properties.type = node.type;
    }
    if (node.properties.scope === undefined) {
      node.properties.scope = node.scope;
    }
    if (node.properties.name === undefined) {
      node.properties.name = node.name;
    }
    if (node.qualifiedName && node.properties.qualifiedName === undefined) {
      node.properties.qualifiedName = node.qualifiedName;
    }
    if (node.filePath && node.properties.filePath === undefined) {
      node.properties.filePath = node.filePath;
    }
    if (node.line !== undefined && node.properties.line === undefined) {
      node.properties.line = node.line;
    }

    this.byId.set(node.id, node);

    const bucket = this.byType.get(node.type) ?? [];
    bucket.push(node);
    this.byType.set(node.type, bucket);

    const named = this.byName.get(node.name) ?? [];
    named.push(node);
    this.byName.set(node.name, named);

    if (node.qualifiedName) {
      const qualified = this.byQualifiedName.get(node.qualifiedName) ?? [];
      qualified.push(node);
      this.byQualifiedName.set(node.qualifiedName, qualified);
    }
  }

  private fleetId(projectId: string, resourceId: string): string {
    return `${projectId}::${resourceId}`;
  }

  private buildProjectNodes(): void {
    for (const project of this.input.snapshot.projects) {
      this.add({
        id: `project:${project.projectId}`,
        type: 'Project',
        scope: 'fleet',
        name: project.name,
        qualifiedName: project.projectId,
        projectId: project.projectId,
        properties: {
          id: project.projectId,
          name: project.name,
          availability: project.availability,
          stale: project.stale,
          generation: project.graphGeneration,
          projectId: project.projectId,
          ...(project.remoteIdentity ? { remoteIdentity: project.remoteIdentity } : {}),
        },
      });
    }
  }

  private buildResourceNodes(): void {
    for (const [projectId, view] of [...this.input.exports.entries()].sort(([left], [right]) =>
      left.localeCompare(right)
    )) {
      for (const service of view.services) {
        this.add({
          id: this.fleetId(projectId, `service:${service.id}`),
          type: 'Service',
          scope: 'fleet',
          name: service.name,
          qualifiedName: `${view.name}:${service.name}`,
          projectId,
          properties: {
            id: service.id,
            name: service.name,
            kind: service.kind,
            rootPath: service.rootPath,
            projectId,
          },
        });
      }

      for (const endpoint of view.endpoints) {
        const properties: Record<string, QueryPropertyValue> = {
          id: endpoint.resourceId,
          name:
            endpoint.operation ??
            `${endpoint.method ?? endpoint.protocol} ${endpoint.path ?? ''}`.trim(),
          projectId,
          method: endpoint.method ?? endpoint.protocol.toUpperCase(),
        };
        if (endpoint.path) {
          properties.path = endpoint.path;
        }
        if (endpoint.operation) {
          properties.path = endpoint.operation;
        }
        if (endpoint.serviceId) {
          properties.serviceId = endpoint.serviceId;
        }

        this.add({
          id: this.fleetId(projectId, endpoint.resourceId),
          type: 'Route',
          scope: 'fleet',
          name: String(properties.name),
          qualifiedName: `${view.name}:${String(properties.name)}`,
          filePath: endpoint.serviceId,
          projectId,
          properties,
        });
      }

      for (const event of view.events) {
        this.add({
          id: this.fleetId(projectId, event.resourceId),
          type: 'EventChannel',
          scope: 'fleet',
          name: event.channel,
          qualifiedName: `${event.provider}:${event.channel}`,
          projectId,
          properties: {
            id: event.resourceId,
            name: event.channel,
            provider: event.provider,
            channel: event.channel,
            direction: event.direction,
            projectId,
          },
        });
      }

      for (const pkg of view.packages) {
        this.add({
          /*
           * The package resource id is the canonical package identity, which
           * is exactly what the Phase 73 linker writes on
           * CROSS_PACKAGE_DEPENDS_ON targets.
           */
          id: this.fleetId(projectId, pkg.id),
          type: 'Package',
          scope: 'fleet',
          name: pkg.name,
          qualifiedName: pkg.id,
          projectId,
          properties: {
            id: pkg.id,
            name: pkg.name,
            source: pkg.source,
            manifest: pkg.manifest,
            projectId,
          },
        });
      }

      for (const dependency of view.packageDependencies) {
        this.add({
          id: this.fleetId(
            projectId,
            packageDependencyResourceId(dependency.source, dependency.name)
          ),
          type: 'PackageDependency',
          scope: 'fleet',
          name: dependency.name,
          projectId,
          properties: {
            id: packageDependencyResourceId(dependency.source, dependency.name),
            name: dependency.name,
            specifier: dependency.specifier,
            local: dependency.local,
            manifest: dependency.manifest,
            source: dependency.source,
            projectId,
          },
        });
      }

      for (const call of view.outboundCalls) {
        const resourceId = outboundResourceId(call.filePath, call.line);
        const properties: Record<string, QueryPropertyValue> = {
          id: resourceId,
          name: call.path ?? 'dynamic',
          filePath: call.filePath,
          line: call.line,
          projectId,
        };
        if (call.method) {
          properties.method = call.method;
        }
        if (call.path) {
          properties.path = call.path;
        }
        if (call.host) {
          properties.host = call.host;
        }

        this.add({
          id: this.fleetId(projectId, resourceId),
          type: 'HttpCall',
          scope: 'fleet',
          name: String(properties.name),
          filePath: call.filePath,
          line: call.line,
          projectId,
          properties,
        });

        const localProjectId = this.input.localProjectId;
        if (
          localProjectId &&
          projectId === localProjectId &&
          call.callerSymbolId &&
          this.input.local?.node(call.callerSymbolId)
        ) {
          this.localOutboundCallers.set(resourceId, call.callerSymbolId);
        }
      }
    }
  }

  /**
   * Identity aliasing for the current project: a local route/event symbol and
   * its Fleet resource are the same node. Nothing is fabricated — the resource
   * id *is* the local symbol id.
   */
  private buildAliases(): void {
    const localProjectId = this.input.localProjectId;
    if (!localProjectId || !this.input.local) {
      return;
    }

    const view = this.input.exports.get(localProjectId);
    if (!view) {
      return;
    }

    const link = (resourceId: string): void => {
      const fleetId = this.fleetId(localProjectId, resourceId);
      if (!this.byId.has(fleetId) || !this.input.local!.node(resourceId)) {
        return;
      }
      this.fleetToLocal.set(fleetId, resourceId);
      this.localToFleet.set(resourceId, fleetId);
    };

    for (const endpoint of view.endpoints) {
      link(endpoint.resourceId);
    }
    for (const event of view.events) {
      link(event.resourceId);
    }
  }

  private buildEdges(): void {
    for (const edge of this.input.snapshot.edges) {
      const fromResource = this.localOutboundCallers.get(edge.fromResourceId);
      const from =
        fromResource !== undefined && edge.fromProjectId === this.input.localProjectId
          ? fromResource
          : this.fleetId(edge.fromProjectId, edge.fromResourceId);

      const to = this.fleetId(edge.toProjectId, edge.toResourceId);

      if (!this.byId.has(from) && !this.input.local?.node(from)) {
        continue;
      }
      if (!this.byId.has(to)) {
        continue;
      }

      this.observed.add(edge.type);

      const queryEdge: QueryEdge = {
        id: edge.id,
        type: edge.type,
        scope: 'fleet',
        from,
        to,
        projectId: edge.fromProjectId,
        fromProjectId: edge.fromProjectId,
        toProjectId: edge.toProjectId,
        ...(edge.protocol ? { protocol: edge.protocol } : {}),
        origin: 'fleet',
        certainty: 'deterministic',
        crossEvidence: edge.evidence.map((entry) => ({
          kind: entry.kind,
          ...(entry.detail ? { detail: entry.detail } : {}),
        })),
        generation: edge.generation,
      };

      this.addAdjacency(from, to, queryEdge);

      this.addProjectProjection(edge.type, edge.fromProjectId, edge.toProjectId, queryEdge);
    }
  }

  private addAdjacency(from: string, to: string, edge: QueryEdge): void {
    const outgoing = this.outgoingEdges.get(from) ?? [];
    outgoing.push(edge);
    this.outgoingEdges.set(from, outgoing);

    const incoming = this.incomingEdges.get(to) ?? [];
    incoming.push(edge);
    this.incomingEdges.set(to, incoming);
  }

  private addProjectProjection(
    type: QueryEdgeType,
    fromProjectId: string,
    toProjectId: string,
    base: QueryEdge
  ): void {
    const fromNode = `project:${fromProjectId}`;
    const toNode = `project:${toProjectId}`;

    if (!this.byId.has(fromNode) || !this.byId.has(toNode)) {
      return;
    }

    const id = `project:${type}:${fromProjectId}:${toProjectId}`;
    if (this.projectedEdges.has(id)) {
      return;
    }
    this.projectedEdges.add(id);

    const projected: QueryEdge = {
      ...base,
      id,
      from: fromNode,
      to: toNode,
    };

    this.addAdjacency(fromNode, toNode, projected);
  }

  private sortBuckets(): void {
    for (const bucket of this.byType.values()) {
      bucket.sort((left, right) => left.id.localeCompare(right.id));
    }
    for (const bucket of this.byName.values()) {
      bucket.sort((left, right) => left.id.localeCompare(right.id));
    }
    for (const bucket of this.byQualifiedName.values()) {
      bucket.sort((left, right) => left.id.localeCompare(right.id));
    }
  }

  /* ---------------------------------------------------------------- *
   * ReadableGraph
   * ---------------------------------------------------------------- */

  node(id: string): QueryNode | undefined {
    return this.byId.get(id) ?? this.input.local?.node(id);
  }

  nodesByType(type: QueryNodeType): readonly QueryNode[] {
    const fleet = this.byType.get(type) ?? [];
    if (!this.input.local) {
      return fleet;
    }
    /*
     * Composite view: local node types participate too, so patterns such as
     * `(f:Function)-[:CROSS_HTTP_CALLS]->(r:Route)` bind the real caller.
     */
    const local = this.input.local.nodesByType(type);
    if (local.length === 0) {
      return fleet;
    }
    const merged = [...fleet];
    for (const node of local) {
      if (!this.byId.has(node.id)) {
        merged.push(node);
      }
    }
    return merged.sort((left, right) => left.id.localeCompare(right.id));
  }

  indexedLookup(
    type: QueryNodeType | undefined,
    property: string,
    value: QueryPropertyValue
  ): readonly QueryNode[] | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }
    const source =
      property === 'name'
        ? this.byName
        : property === 'qualifiedName'
          ? this.byQualifiedName
          : null;
    if (!source) {
      return undefined;
    }
    const matches = source.get(value) ?? [];
    return type ? matches.filter((node) => node.type === type) : matches;
  }

  outgoing(nodeId: string, edgeTypes: ReadonlySet<QueryEdgeType>): readonly QueryEdge[] {
    const output = this.collect(this.outgoingEdges, nodeId, edgeTypes);

    for (const fleetId of this.localFleetIds(nodeId)) {
      for (const edge of this.outgoingEdges.get(fleetId) ?? []) {
        if (edgeTypes.has(edge.type)) {
          output.push(edge);
        }
      }
    }

    for (const localId of this.fleetLocalIds(nodeId)) {
      for (const edge of this.input.local?.outgoing(localId, edgeTypes) ?? []) {
        output.push(edge);
      }
    }

    return dedupeEdges(output);
  }

  incoming(nodeId: string, edgeTypes: ReadonlySet<QueryEdgeType>): readonly QueryEdge[] {
    const output = this.collect(this.incomingEdges, nodeId, edgeTypes);

    for (const fleetId of this.localFleetIds(nodeId)) {
      for (const edge of this.incomingEdges.get(fleetId) ?? []) {
        if (edgeTypes.has(edge.type)) {
          output.push(edge);
        }
      }
    }

    for (const localId of this.fleetLocalIds(nodeId)) {
      for (const edge of this.input.local?.incoming(localId, edgeTypes) ?? []) {
        output.push(edge);
      }
    }

    return dedupeEdges(output);
  }

  private collect(
    index: ReadonlyMap<string, QueryEdge[]>,
    nodeId: string,
    edgeTypes: ReadonlySet<QueryEdgeType>
  ): QueryEdge[] {
    return (index.get(nodeId) ?? []).filter((edge) => edgeTypes.has(edge.type));
  }

  /** Fleet ids whose local counterpart is `nodeId`. */
  private localFleetIds(nodeId: string): string[] {
    const mapped = this.localToFleet.get(nodeId);
    return mapped ? [mapped] : [];
  }

  /** Local ids whose fleet counterpart is `nodeId`. */
  private fleetLocalIds(nodeId: string): string[] {
    const mapped = this.fleetToLocal.get(nodeId);
    return mapped ? [mapped] : [];
  }

  observedEdgeTypes(): QueryEdgeType[] {
    const observed = new Set(this.observed);
    for (const type of this.input.local?.observedEdgeTypes() ?? []) {
      observed.add(type);
    }
    return [...observed].sort();
  }

  nodeCount(): number {
    return this.byId.size + (this.input.local?.nodeCount() ?? 0);
  }

  edgeCount(): number {
    let total = 0;
    for (const edges of this.outgoingEdges.values()) {
      total += edges.length;
    }
    return total + (this.input.local?.edgeCount() ?? 0);
  }
}

function dedupeEdges(edges: readonly QueryEdge[]): QueryEdge[] {
  const seen = new Set<string>();
  const output: QueryEdge[] = [];
  for (const edge of edges) {
    if (seen.has(edge.id)) {
      continue;
    }
    seen.add(edge.id);
    output.push(edge);
  }
  return output;
}
