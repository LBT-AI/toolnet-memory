/*
 * Phase 72 — Cross-Service Intelligence.
 *
 * Deterministic static model for protocol resources that cross service
 * boundaries inside one ToolNet project:
 *
 *   Source Code
 *       -> Framework / Protocol Extractors
 *       -> Canonical Endpoint / Channel Model
 *       -> Deterministic Cross-Service Linker
 *       -> Semantic Graph
 *
 * No LLM. No embeddings. No vector database. No network access.
 * Cross-service edges are only produced from deterministic evidence.
 */

export type CrossServiceProtocol = 'http' | 'graphql' | 'grpc' | 'trpc' | 'event';

export type ServiceKind = 'frontend' | 'backend' | 'worker' | 'library' | 'unknown';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';

export const HTTP_METHODS: readonly HttpMethod[] = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS',
  'HEAD',
];

export interface ServiceDescriptor {
  /** Deterministic: projectId + canonical service root. */
  id: string;
  projectId: string;
  name: string;
  /** Project-root-relative service directory ('' for the project root). */
  rootPath: string;
  kind: ServiceKind;
  /** Project-root-relative entry point files declared by manifests. */
  entryPoints: string[];
  /** Project-root-relative manifest files that prove the boundary. */
  manifests: string[];
}

export interface ServiceDetectionResult {
  services: ServiceDescriptor[];
  /** Files that could not be attributed to a service boundary. */
  unassignedFiles: string[];
  /** Extra detection signals (workspaces, manifests) for diagnostics. */
  notes: string[];
}

export interface HttpRouteDeclaration {
  protocol: 'http';
  serviceId: string;
  method: HttpMethod;
  /** Canonical path, parameter segments normalised to `{param}`. */
  path: string;
  /** Raw declaration path as written in source. */
  rawPath: string;
  filePath: string;
  line: number;
  /** Deterministic symbolic identity of the handler, when statically known. */
  handlerName?: string;
  /** Framework adapter id that produced this declaration. */
  framework: string;
}

export interface HttpOperationDeclaration {
  protocol: 'grpc' | 'graphql' | 'trpc';
  serviceId: string;
  /** Canonical operation identity, e.g. `OrderService/Create`, `Query.orders`. */
  operation: string;
  filePath: string;
  line: number;
  framework: string;
  /** Deterministic handler name when the declaration binds one. */
  handlerName?: string;
}

export type CrossServiceServerDeclaration = HttpRouteDeclaration | HttpOperationDeclaration;

export interface HttpTarget {
  protocol: 'http';
  method: HttpMethod | 'UNKNOWN';
  /** Canonical path or null when the target cannot be proven statically. */
  path: string | null;
  /** Redacted raw target (credentials stripped, dynamic parts kept literal). */
  rawTarget: string;
  baseUrl?: string;
}

export interface HttpClientCall {
  protocol: 'http';
  target: HttpTarget;
  filePath: string;
  line: number;
  /** Symbol containing the call site, when known. */
  callerSymbolId?: string;
  /** Redacted base URL evidence when a static base was declared. */
  baseUrl?: string;
  framework: string;
}

export interface ProtocolClientCall {
  protocol: 'grpc' | 'graphql' | 'trpc';
  /** Canonical target operation, or null when dynamic. */
  operation: string | null;
  filePath: string;
  line: number;
  callerSymbolId?: string;
  framework: string;
  /** Redacted raw target for diagnostics. */
  rawTarget: string;
}

export type CrossServiceClientCall = HttpClientCall | ProtocolClientCall;

export interface EventDeclaration {
  protocol: 'event';
  serviceId: string;
  /** Provider that owns the channel semantics (node, socket.io, kafka, ...). */
  provider: string;
  /** Canonical channel/topic/event name. */
  channel: string;
  direction: 'emit' | 'listen';
  filePath: string;
  line: number;
  callerSymbolId?: string;
  framework: string;
}

export type CrossServiceUnresolvedReason =
  | 'DYNAMIC_TARGET'
  | 'AMBIGUOUS_ROUTE'
  | 'UNKNOWN_SERVICE'
  | 'UNKNOWN_HOST'
  | 'UNRESOLVED_CHANNEL'
  | 'UNSUPPORTED_FRAMEWORK'
  | 'NO_ROUTE_MATCH';

export interface UnresolvedCrossServiceReference {
  protocol: CrossServiceProtocol;
  filePath: string;
  line?: number;
  sourceSymbolId?: string;
  reason: CrossServiceUnresolvedReason;
  /** Redacted, bounded description. Never contains source text. */
  detail?: string;
}

export interface CrossServiceStats {
  services: number;
  routes: number;
  operations: number;
  events: number;
  clientCalls: number;
  links: number;
  sameServiceLinks: number;
  crossServiceLinks: number;
  ambiguous: number;
  unresolved: number;
  unsupportedFrameworks: string[];
}

export interface CrossServiceSnapshot {
  version: 1;
  projectId: string;
  generation: string;
  fingerprint: string;
  indexedAt: string;
  services: ServiceDescriptor[];
  stats: CrossServiceStats;
  unresolved: UnresolvedCrossServiceReference[];
}

export interface CrossServiceCoverageInput {
  clientCalls: number;
  linked: number;
  ambiguous: number;
  dynamic: number;
  unresolved: number;
  unsupportedFrameworks: string[];
  unresolvedChannels: number;
}
