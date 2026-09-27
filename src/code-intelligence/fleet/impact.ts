import type { CrossProjectEdge, FleetSnapshot } from './types.js';

export interface FleetImpactPathStep {
  edgeId: string;
  edgeType: CrossProjectEdge['type'];
  protocol?: string;
  fromProjectId: string;
  toProjectId: string;
  fromResourceId: string;
  toResourceId: string;
  /** Traversal direction relative to the edge. */
  direction: 'forward' | 'reverse';
}

export interface FleetImpactPath {
  projectId: string;
  depth: number;
  steps: FleetImpactPathStep[];
}

export interface FleetImpactResult {
  found: boolean;
  originProjectId: string;
  originResourceId?: string;
  /** Projects reached, sorted, excluding the origin. */
  impactedProjects: string[];
  paths: FleetImpactPath[];
  coverage: FleetSnapshot['coverage'];
}

const DEFAULT_MAX_DEPTH = 6;
const MAX_NODES = 200;

/**
 * Cross-repo impact traversal.
 *
 * Edge semantics are preserved: a `CROSS_HTTP_CALLS` step is never rewritten
 * as a language-level call. Both dependency directions are traversed so
 * "who calls this" and "what does this flow into" are both surfaced.
 */
export class FleetImpactAnalyzer {
  constructor(private readonly snapshot: FleetSnapshot) {}

  analyze(
    origin: { projectId: string; resourceId?: string },
    options: { maxDepth?: number } = {}
  ): FleetImpactResult {
    const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
    const edges = this.snapshot.edges;

    const matchesOrigin = (edge: CrossProjectEdge, asSource: boolean): boolean => {
      const project = asSource ? edge.fromProjectId : edge.toProjectId;
      if (project !== origin.projectId) {
        return false;
      }
      if (!origin.resourceId) {
        return true;
      }
      const resource = asSource ? edge.fromResourceId : edge.toResourceId;
      return resource === origin.resourceId;
    };

    const previous = new Map<string, FleetImpactPathStep>();
    const visited = new Set<string>([origin.projectId]);
    const depths = new Map<string, number>([[origin.projectId, 0]]);

    const queue: string[] = [origin.projectId];

    while (queue.length > 0 && visited.size < MAX_NODES) {
      const currentProject = queue.shift()!;
      const depth = depths.get(currentProject) ?? 0;

      if (depth >= maxDepth) {
        continue;
      }

      for (const edge of edges) {
        const forwardCandidate =
          (currentProject === origin.projectId && matchesOrigin(edge, true)) ||
          (currentProject !== origin.projectId && edge.fromProjectId === currentProject);

        const reverseCandidate =
          (currentProject === origin.projectId && matchesOrigin(edge, false)) ||
          (currentProject !== origin.projectId && edge.toProjectId === currentProject);

        const transitions: Array<{ next: string; step: FleetImpactPathStep }> = [];

        if (forwardCandidate && edge.toProjectId !== currentProject) {
          transitions.push({
            next: edge.toProjectId,
            step: {
              edgeId: edge.id,
              edgeType: edge.type,
              ...(edge.protocol ? { protocol: edge.protocol } : {}),
              fromProjectId: edge.fromProjectId,
              toProjectId: edge.toProjectId,
              fromResourceId: edge.fromResourceId,
              toResourceId: edge.toResourceId,
              direction: 'forward',
            },
          });
        }

        if (reverseCandidate && edge.fromProjectId !== currentProject) {
          transitions.push({
            next: edge.fromProjectId,
            step: {
              edgeId: edge.id,
              edgeType: edge.type,
              ...(edge.protocol ? { protocol: edge.protocol } : {}),
              fromProjectId: edge.fromProjectId,
              toProjectId: edge.toProjectId,
              fromResourceId: edge.fromResourceId,
              toResourceId: edge.toResourceId,
              direction: 'reverse',
            },
          });
        }

        for (const transition of transitions) {
          if (visited.has(transition.next)) {
            continue;
          }
          visited.add(transition.next);
          previous.set(transition.next, transition.step);
          depths.set(transition.next, depth + 1);
          queue.push(transition.next);
        }
      }
    }

    const impactedProjects = [...visited]
      .filter((projectId) => projectId !== origin.projectId)
      .sort();

    const paths: FleetImpactPath[] = [];

    for (const projectId of impactedProjects) {
      const steps: FleetImpactPathStep[] = [];
      let cursor = projectId;
      let guard = 0;

      while (cursor !== origin.projectId && guard < MAX_NODES) {
        const step = previous.get(cursor);
        if (!step) {
          break;
        }
        steps.push(step);
        cursor = step.direction === 'forward' ? step.fromProjectId : step.toProjectId;
        guard++;
      }

      if (cursor !== origin.projectId) {
        continue;
      }

      paths.push({
        projectId,
        depth: steps.length,
        steps: steps.reverse(),
      });
    }

    return {
      found: impactedProjects.length > 0,
      originProjectId: origin.projectId,
      ...(origin.resourceId ? { originResourceId: origin.resourceId } : {}),
      impactedProjects,
      paths: paths.sort((left, right) =>
        left.depth === right.depth
          ? left.projectId.localeCompare(right.projectId)
          : left.depth - right.depth
      ),
      coverage: this.snapshot.coverage,
    };
  }
}
