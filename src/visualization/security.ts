import { timingSafeEqual } from 'node:crypto';
export const GRAPH_DEFAULT_HOST = '127.0.0.1' as const;
export const GRAPH_DEFAULT_PORT = 9749 as const;
export const GRAPH_TOKEN_MIN_BYTES = 24 as const;
export interface GraphHeaderWriter {
  setHeader(name: string, value: string): unknown;
}
function normalizedHost(value: string): string {
  return value.trim().toLowerCase().replace(/^\[/u, '').replace(/\]$/u, '');
}
export function isWildcardGraphHost(value: string): boolean {
  const host = normalizedHost(value);
  return host === '0.0.0.0' || host === '::' || host === '0:0:0:0:0:0:0:0';
}
export function isLoopbackGraphHost(value: string): boolean {
  const host = normalizedHost(value);
  if (host === 'localhost' || host === '::1' || host === '0:0:0:0:0:0:0:1') {
    return true;
  }
  if (/^127(?:\.\d{1,3}){3}$/u.test(host)) {
    return true;
  }
  if (host === '::ffff:127.0.0.1') {
    return true;
  }
  return false;
}
function hostnameFromAuthority(value: string): string | null {
  const input = value.trim();
  if (!input) {
    return null;
  }
  try {
    const parsed = new URL(input.includes('://') ? input : `http://${input}`);
    return normalizedHost(parsed.hostname);
  } catch {
    return null;
  }
}
function normalizedAuthority(value: string): string | null {
  const input = value.trim();
  if (!input) {
    return null;
  }
  try {
    const parsed = new URL(input.includes('://') ? input : `http://${input}`);
    const hostname = normalizedHost(parsed.hostname);
    if (!hostname) {
      return null;
    }
    if (parsed.port) {
      return `${hostname}:${parsed.port}`;
    }
    return hostname;
  } catch {
    return null;
  }
}
export function parseGraphAllowedHosts(value: string | undefined): string[] {
  if (!value?.trim()) {
    return [];
  }
  const output = new Set<string>();
  for (const raw of value.split(',')) {
    const hostname = hostnameFromAuthority(raw);
    if (hostname) {
      output.add(hostname);
    }
  }
  return [...output].sort();
}
/*
 * Host header protection.
 *
 * Default loopback binding only accepts loopback Host names.
 * This blocks classic browser DNS-rebinding access where an
 * attacker-controlled hostname resolves to 127.0.0.1.
 */
export function graphHostHeaderAllowed(
  configuredHost: string,
  hostHeader: string | undefined,
  allowedHosts: readonly string[] = []
): boolean {
  if (!hostHeader) {
    return false;
  }
  const requestHost = hostnameFromAuthority(hostHeader);
  if (!requestHost) {
    return false;
  }
  const explicitAllowed = new Set(allowedHosts.map(normalizedHost));
  if (explicitAllowed.has(requestHost)) {
    return true;
  }
  if (isLoopbackGraphHost(configuredHost)) {
    return isLoopbackGraphHost(requestHost);
  }
  if (isWildcardGraphHost(configuredHost)) {
    if (explicitAllowed.size > 0) {
      return isLoopbackGraphHost(requestHost);
    }
    return true;
  }
  return normalizedHost(configuredHost) === requestHost;
}
export function isSameOriginGraphRequest(
  origin: string | undefined,
  hostHeader: string | undefined
): boolean {
  if (!origin) {
    return true;
  }
  if (!hostHeader) {
    return false;
  }
  const originAuthority = normalizedAuthority(origin);
  const requestAuthority = normalizedAuthority(hostHeader);
  if (!originAuthority || !requestAuthority) {
    return false;
  }
  return originAuthority === requestAuthority;
}
function safeTokenEqual(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }
  return timingSafeEqual(actualBuffer, expectedBuffer);
}
export function graphBearerAuthorized(
  authorization: string | undefined,
  expectedToken: string | undefined
): boolean {
  if (!expectedToken) {
    return true;
  }
  if (!authorization) {
    return false;
  }
  const match = authorization.match(/^Bearer[ \t]+(.+)$/iu);
  if (!match?.[1]) {
    return false;
  }
  return safeTokenEqual(match[1].trim(), expectedToken);
}
export function graphTokenIsStrong(token: string | undefined): boolean {
  if (!token) {
    return false;
  }
  return Buffer.byteLength(token, 'utf8') >= GRAPH_TOKEN_MIN_BYTES;
}
export function applyGraphSecurityHeaders(response: GraphHeaderWriter): void {
  response.setHeader('x-content-type-options', 'nosniff');
  response.setHeader('x-frame-options', 'DENY');
  response.setHeader('referrer-policy', 'no-referrer');
  response.setHeader('cross-origin-resource-policy', 'same-origin');
  response.setHeader(
    'permissions-policy',
    ['camera=()', 'microphone=()', 'geolocation=()'].join(', ')
  );
  response.setHeader(
    'content-security-policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self'",
      "img-src 'self' data:",
      "object-src 'none'",
      "base-uri 'none'",
      "frame-ancestors 'none'",
      "form-action 'none'",
    ].join('; ')
  );
}
