import type { HttpMethod } from './types.js';

export type { HttpMethod };

export const HTTP_METHODS_SET: ReadonlySet<HttpMethod> = new Set([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS',
  'HEAD',
]);

export function isHttpMethod(value: string): value is HttpMethod {
  return HTTP_METHODS_SET.has(value.toUpperCase() as HttpMethod);
}

/**
 * Strip query string / fragment from a raw URL or path.
 */
export function stripQuery(raw: string): string {
  const hashIndex = raw.indexOf('#');
  const withoutHash = hashIndex === -1 ? raw : raw.slice(0, hashIndex);
  const queryIndex = withoutHash.indexOf('?');
  return queryIndex === -1 ? withoutHash : withoutHash.slice(0, queryIndex);
}

/**
 * Deterministic canonicalisation of a single HTTP path segment.
 *
 * Parameter placeholders across frameworks collapse to `{param}`:
 *
 *   :id            (Express / Koa / FastAPI starlette)
 *   {id}           (FastAPI / OpenAPI, Go 1.22 net/http)
 *   <id>           (Flask)
 *   [id] / [..slug] (Next.js)
 *
 * Static segments are preserved verbatim, so `/orders/current` never
 * collapses into `/orders/{param}`.
 */
export function normalizePathSegment(segment: string): string {
  if (!segment) {
    return segment;
  }

  if (segment.startsWith(':') && segment.length > 1) {
    return '{param}';
  }

  if (segment.startsWith('{') && segment.endsWith('}') && segment.length > 2) {
    return '{param}';
  }

  if (segment.startsWith('<') && segment.endsWith('>') && segment.length > 2) {
    return '{param}';
  }

  if (segment.startsWith('[') && segment.endsWith(']') && segment.length > 2) {
    return '{param}';
  }

  return segment;
}

/**
 * Canonical form of an HTTP path.
 *
 * Leading/trailing slashes are normalised away, repeated slashes collapse,
 * and parameter placeholders collapse to `{param}`. The empty path is `/`.
 */
export function normalizeHttpPath(raw: string): string {
  const stripped = stripQuery(raw).trim();

  if (!stripped) {
    return '/';
  }

  const withoutOrigin = stripped.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^/]*/u, '');

  const segments = withoutOrigin
    .replaceAll('\\', '/')
    .split('/')
    .filter((segment) => segment.length > 0)
    .map(normalizePathSegment);

  if (segments.length === 0) {
    return '/';
  }

  return '/' + segments.join('/');
}

/**
 * Deterministic join of router prefixes and a leaf path.
 */
export function joinHttpPaths(...parts: Array<string | undefined>): string {
  const merged = parts
    .filter((part): part is string => typeof part === 'string' && part.length > 0)
    .map((part) => part.replaceAll('\\', '/'))
    .join('/');

  return normalizeHttpPath(merged);
}

export function canonicalRouteId(
  projectId: string,
  serviceId: string,
  method: HttpMethod | 'UNKNOWN',
  path: string
): string {
  return `http:${projectId}:${serviceId}:${method}:${path}`;
}

export function canonicalOperationId(
  projectId: string,
  protocol: 'grpc' | 'graphql' | 'trpc',
  serviceId: string,
  operation: string
): string {
  return `${protocol}:${projectId}:${serviceId}:${operation}`;
}

export function canonicalEventId(projectId: string, provider: string, channel: string): string {
  return `event:${projectId}:${provider}:${channel}`;
}

/**
 * Redact credentials from a raw URL while keeping the structural target.
 * Never persists secrets into the graph.
 */
export function redactUrl(raw: string): string {
  return raw.replace(/\/\/[^/@\s]+@/u, '//<redacted>@');
}

/**
 * Extract an origin (`scheme://host[:port]`) when the URL is absolute.
 */
export function originOf(raw: string): string | undefined {
  const match = /^([a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^/\s]+)/u.exec(raw.trim());
  return match?.[1];
}
