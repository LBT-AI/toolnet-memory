import type {
  CrossProjectEdge,
  CrossProjectEdgeType,
  CrossProjectEvidence,
  FleetProjectExport,
  FleetProjectRef,
  UnresolvedCrossProjectReference,
} from './types.js';

import { crossProjectEdgeId } from './fingerprint.js';

export interface LinkableProject {
  ref: FleetProjectRef;
  export: FleetProjectExport;
}

export interface LinkInput {
  projects: readonly LinkableProject[];
  generation: string;
}

export interface LinkResult {
  edges: CrossProjectEdge[];
  unresolved: UnresolvedCrossProjectReference[];
}

interface EndpointRef {
  projectId: string;
  resourceId: string;
  method?: string;
  path?: string;
  operation?: string;
}

const MAX_CANDIDATES = 20;

function canonical(value: string): string {
  return value.trim().toLowerCase();
}

function bounded(set: Iterable<string>): string[] {
  return [...new Set(set)].sort().slice(0, MAX_CANDIDATES);
}

/**
 * Deterministic cross-project linker.
 *
 * Rule: an edge is produced only when the target is provably unique. Any
 * ambiguity stays unresolved — a project is never picked because it is
 * "closest", alphabetically first, or most recently indexed.
 */
export class CrossProjectLinker {
  link(input: LinkInput): LinkResult {
    const edges = new Map<string, CrossProjectEdge>();
    const unresolved: UnresolvedCrossProjectReference[] = [];

    const projects = [...input.projects].sort((left, right) =>
      left.ref.projectId.localeCompare(right.ref.projectId)
    );

    const endpointIndex = new Map<string, EndpointRef[]>();
    const identityIndex = new Map<string, Set<string>>();

    for (const project of projects) {
      const { ref, export: view } = project;

      for (const identity of view.identities) {
        const key = canonical(identity);
        const set = identityIndex.get(key) ?? new Set<string>();
        set.add(ref.projectId);
        identityIndex.set(key, set);
      }

      for (const endpoint of view.endpoints) {
        if (endpoint.protocol === 'http' && endpoint.method && endpoint.path) {
          const key = `http:${endpoint.method.toUpperCase()}:${endpoint.path}`;
          const list = endpointIndex.get(key) ?? [];
          list.push({
            projectId: ref.projectId,
            resourceId: endpoint.resourceId,
            method: endpoint.method.toUpperCase(),
            path: endpoint.path,
          });
          endpointIndex.set(key, list);
        } else if (endpoint.operation) {
          const key = `${endpoint.protocol}:${endpoint.operation}`;
          const list = endpointIndex.get(key) ?? [];
          list.push({
            projectId: ref.projectId,
            resourceId: endpoint.resourceId,
            operation: endpoint.operation,
          });
          endpointIndex.set(key, list);
        }
      }
    }

    for (const project of projects) {
      this.linkHttp(
        project,
        projects,
        endpointIndex,
        identityIndex,
        input.generation,
        edges,
        unresolved
      );
    }

    this.linkEvents(projects, input.generation, edges);
    this.linkPackages(projects, input.generation, edges, unresolved);

    return {
      edges: [...edges.values()].sort(compareEdges),
      unresolved: unresolved.sort(compareUnresolved),
    };
  }

  private linkHttp(
    source: LinkableProject,
    projects: readonly LinkableProject[],
    endpointIndex: ReadonlyMap<string, EndpointRef[]>,
    identityIndex: ReadonlyMap<string, Set<string>>,
    generation: string,
    edges: Map<string, CrossProjectEdge>,
    unresolved: UnresolvedCrossProjectReference[]
  ): void {
    const { ref, export: view } = source;

    for (const call of view.outboundCalls) {
      if (call.protocol !== 'http') {
        continue;
      }

      const resourceId = `outbound:${call.filePath}:${call.line}`;

      if (call.path === null) {
        unresolved.push({
          type: 'CROSS_HTTP_CALLS',
          protocol: 'http',
          fromProjectId: ref.projectId,
          fromResourceId: resourceId,
          reason: 'DYNAMIC_CROSS_PROJECT_TARGET',
          ...(call.host ? { detail: `host=${call.host}` } : {}),
        });
        continue;
      }

      const method = (call.method ?? 'UNKNOWN').toUpperCase();

      const candidateEndpoints =
        method === 'UNKNOWN'
          ? [...endpointIndex.entries()]
              .filter(([key, value]) => key.endsWith(`:${call.path}`) && value.length > 0)
              .flatMap(([, value]) => value)
          : (endpointIndex.get(`http:${method}:${call.path}`) ?? []);

      const external = candidateEndpoints.filter(
        (endpoint) => endpoint.projectId !== ref.projectId
      );

      if (external.length === 0) {
        unresolved.push({
          type: 'CROSS_HTTP_CALLS',
          protocol: 'http',
          fromProjectId: ref.projectId,
          fromResourceId: resourceId,
          reason: 'NO_MATCHING_ENDPOINT',
          detail: call.path,
        });
        continue;
      }

      const evidence: CrossProjectEvidence[] = [];
      if (call.method) {
        evidence.push({ kind: 'METHOD_MATCH', detail: call.method });
      }
      evidence.push({ kind: 'CANONICAL_ROUTE_MATCH', detail: call.path });

      let candidates = external;

      if (call.host) {
        const hostProjects = identityIndex.get(canonical(call.host));

        if (!hostProjects || hostProjects.size === 0) {
          unresolved.push({
            type: 'CROSS_HTTP_CALLS',
            protocol: 'http',
            fromProjectId: ref.projectId,
            fromResourceId: resourceId,
            reason: 'UNKNOWN_HOST',
            detail: call.host,
            candidates: bounded(external.map((endpoint) => endpoint.projectId)),
          });
          continue;
        }

        const narrowed = external.filter((endpoint) => hostProjects.has(endpoint.projectId));

        if (hostProjects.size > 1) {
          unresolved.push({
            type: 'CROSS_HTTP_CALLS',
            protocol: 'http',
            fromProjectId: ref.projectId,
            fromResourceId: resourceId,
            reason: 'AMBIGUOUS_CROSS_PROJECT_ENDPOINT',
            detail: call.host,
            candidates: bounded(hostProjects),
          });
          continue;
        }

        if (narrowed.length === 0) {
          unresolved.push({
            type: 'CROSS_HTTP_CALLS',
            protocol: 'http',
            fromProjectId: ref.projectId,
            fromResourceId: resourceId,
            reason: 'UNKNOWN_HOST',
            detail: call.host,
            candidates: bounded(external.map((endpoint) => endpoint.projectId)),
          });
          continue;
        }

        evidence.unshift({ kind: 'HOST_MATCH', detail: call.host });
        evidence.unshift({ kind: 'SERVICE_IDENTITY', detail: call.host });
        candidates = narrowed;
      }

      if (candidates.length !== 1) {
        unresolved.push({
          type: 'CROSS_HTTP_CALLS',
          protocol: 'http',
          fromProjectId: ref.projectId,
          fromResourceId: resourceId,
          reason: 'AMBIGUOUS_CROSS_PROJECT_ENDPOINT',
          ...(call.host ? { detail: call.host } : { detail: call.path }),
          candidates: bounded(candidates.map((endpoint) => endpoint.projectId)),
        });
        continue;
      }

      const target = candidates[0];
      const targetProject = projects.find((item) => item.ref.projectId === target.projectId);
      if (!targetProject) {
        continue;
      }

      this.addEdge(edges, {
        type: 'CROSS_HTTP_CALLS',
        fromProjectId: ref.projectId,
        toProjectId: target.projectId,
        fromResourceId: resourceId,
        toResourceId: target.resourceId,
        protocol: 'http',
        evidence,
        sourceGeneration: ref.graphGeneration,
        targetGeneration: targetProject.ref.graphGeneration,
        generation,
        metadata: {
          ...(call.method ? { method: call.method } : {}),
          ...(call.path ? { path: call.path } : {}),
          ...(call.host ? { host: call.host } : {}),
          ...(call.callerSymbolId ? { callerSymbolId: call.callerSymbolId } : {}),
        },
      });
    }
  }

  private linkEvents(
    projects: readonly LinkableProject[],
    generation: string,
    edges: Map<string, CrossProjectEdge>
  ): void {
    const channels = new Map<
      string,
      {
        emitters: Array<{ project: LinkableProject; resourceId: string; symbolId?: string }>;
        listeners: Array<{ project: LinkableProject; resourceId: string; symbolId?: string }>;
      }
    >();

    for (const project of projects) {
      for (const event of project.export.events) {
        const key = `${canonical(event.provider)}:${event.channel}`;
        const entry = channels.get(key) ?? { emitters: [], listeners: [] };
        const record = {
          project,
          resourceId: event.resourceId,
          ...(event.symbolId ? { symbolId: event.symbolId } : {}),
        };
        if (event.direction === 'emit') {
          entry.emitters.push(record);
        } else {
          entry.listeners.push(record);
        }
        channels.set(key, entry);
      }
    }

    for (const [key, entry] of [...channels.entries()].sort(([left], [right]) =>
      left.localeCompare(right)
    )) {
      const [provider, channel] = key.split(':');
      const evidence: CrossProjectEvidence[] = [
        { kind: 'PROVIDER_MATCH', detail: provider },
        { kind: 'CHANNEL_MATCH', detail: channel },
      ];

      for (const emitter of entry.emitters) {
        for (const listener of entry.listeners) {
          if (emitter.project.ref.projectId === listener.project.ref.projectId) {
            continue;
          }

          this.addEdge(edges, {
            type: 'CROSS_EMITS',
            fromProjectId: emitter.project.ref.projectId,
            toProjectId: listener.project.ref.projectId,
            fromResourceId: emitter.resourceId,
            toResourceId: listener.resourceId,
            protocol: provider,
            evidence,
            sourceGeneration: emitter.project.ref.graphGeneration,
            targetGeneration: listener.project.ref.graphGeneration,
            generation,
            metadata: { channel, provider },
          });

          this.addEdge(edges, {
            type: 'CROSS_LISTENS_ON',
            fromProjectId: listener.project.ref.projectId,
            toProjectId: emitter.project.ref.projectId,
            fromResourceId: listener.resourceId,
            toResourceId: emitter.resourceId,
            protocol: provider,
            evidence,
            sourceGeneration: listener.project.ref.graphGeneration,
            targetGeneration: emitter.project.ref.graphGeneration,
            generation,
            metadata: { channel, provider },
          });
        }
      }
    }
  }

  private linkPackages(
    projects: readonly LinkableProject[],
    generation: string,
    edges: Map<string, CrossProjectEdge>,
    unresolved: UnresolvedCrossProjectReference[]
  ): void {
    const packageOwners = new Map<string, Set<string>>();
    const packageResourceIds = new Map<string, string>();

    for (const project of projects) {
      for (const pkg of project.export.packages) {
        const key = canonical(pkg.name);
        const set = packageOwners.get(key) ?? new Set<string>();
        set.add(project.ref.projectId);
        packageOwners.set(key, set);
        packageResourceIds.set(`${project.ref.projectId}:${key}`, pkg.id);
      }
    }

    for (const project of projects) {
      for (const dependency of project.export.packageDependencies) {
        if (!dependency.local) {
          /*
           * External registry dependencies (`express`, `requests`, ...) must
           * never be mapped to a ToolNet project by name alone.
           */
          continue;
        }

        const key = canonical(dependency.name);
        const owners = packageOwners.get(key);
        const fromResourceId = `pkgdep:${dependency.source}:${dependency.name}`;

        if (!owners || owners.size === 0) {
          unresolved.push({
            type: 'CROSS_PACKAGE_DEPENDS_ON',
            fromProjectId: project.ref.projectId,
            fromResourceId,
            reason: 'UNRESOLVED_PACKAGE_IDENTITY',
            detail: dependency.name,
          });
          continue;
        }

        const external = [...owners].filter((ownerId) => ownerId !== project.ref.projectId);

        if (external.length !== 1) {
          unresolved.push({
            type: 'CROSS_PACKAGE_DEPENDS_ON',
            fromProjectId: project.ref.projectId,
            fromResourceId,
            reason: 'UNRESOLVED_PACKAGE_IDENTITY',
            detail: dependency.name,
            candidates: bounded(owners),
          });
          continue;
        }

        const target = projects.find((item) => item.ref.projectId === external[0]);
        if (!target) {
          continue;
        }

        this.addEdge(edges, {
          type: 'CROSS_PACKAGE_DEPENDS_ON',
          fromProjectId: project.ref.projectId,
          toProjectId: target.ref.projectId,
          fromResourceId,
          toResourceId: packageResourceIds.get(`${target.ref.projectId}:${key}`) ?? `pkg:${key}`,
          evidence: [
            { kind: 'PACKAGE_IDENTITY', detail: dependency.name },
            { kind: 'LOCAL_DEPENDENCY_SPECIFIER', detail: dependency.specifier },
          ],
          sourceGeneration: project.ref.graphGeneration,
          targetGeneration: target.ref.graphGeneration,
          generation,
          metadata: {
            package: dependency.name,
            specifier: dependency.specifier,
            manifest: dependency.manifest,
            source: dependency.source,
          },
        });
      }
    }
  }

  private addEdge(edges: Map<string, CrossProjectEdge>, edge: Omit<CrossProjectEdge, 'id'>): void {
    const id = crossProjectEdgeId({
      type: edge.type,
      fromProjectId: edge.fromProjectId,
      fromResourceId: edge.fromResourceId,
      toProjectId: edge.toProjectId,
      toResourceId: edge.toResourceId,
      ...(edge.protocol ? { protocol: edge.protocol } : {}),
    });

    if (edges.has(id)) {
      return;
    }

    edges.set(id, { id, ...edge });
  }
}

export function compareEdges(left: CrossProjectEdge, right: CrossProjectEdge): number {
  return (
    left.type.localeCompare(right.type) ||
    left.fromProjectId.localeCompare(right.fromProjectId) ||
    left.toProjectId.localeCompare(right.toProjectId) ||
    left.fromResourceId.localeCompare(right.fromResourceId) ||
    left.toResourceId.localeCompare(right.toResourceId)
  );
}

export function compareUnresolved(
  left: UnresolvedCrossProjectReference,
  right: UnresolvedCrossProjectReference
): number {
  return (
    left.type.localeCompare(right.type) ||
    left.fromProjectId.localeCompare(right.fromProjectId) ||
    left.fromResourceId.localeCompare(right.fromResourceId) ||
    left.reason.localeCompare(right.reason)
  );
}

export type { CrossProjectEdgeType };
