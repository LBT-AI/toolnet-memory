/**
 * ToolNet v0.7 cloud authority resolution.
 *
 * Centralizes the decision of which authority implementation to use so that
 * hooks, MCP tools and CLI commands cannot drift. In strict cloud-only mode a
 * missing cloud URL/token is a hard failure (no local fallback); in local-first
 * mode an in-memory authority is acceptable for tests and offline development.
 */

import { InMemoryCloudAuthority, HttpCloudAuthority } from './cloud-authority.js';

export interface CloudAuthorityEnv {
  url?: string;
  token?: string;
}

export function resolveCloudAuthorityEnv(env: NodeJS.ProcessEnv = process.env): CloudAuthorityEnv {
  return {
    url: env.TOOLNET_CLOUD_AUTHORITY_URL?.trim() || undefined,
    token: env.TOOLNET_CLOUD_AUTHORITY_TOKEN?.trim() || undefined,
  };
}

export function hasCloudAuthorityConfig(env: NodeJS.ProcessEnv = process.env): boolean {
  const resolved = resolveCloudAuthorityEnv(env);
  return Boolean(resolved.url && resolved.token);
}

export function createCloudAuthorityFromEnv(
  env: NodeJS.ProcessEnv = process.env
): InMemoryCloudAuthority | HttpCloudAuthority {
  const resolved = resolveCloudAuthorityEnv(env);

  if (resolved.url && resolved.token) {
    return new HttpCloudAuthority({ baseUrl: resolved.url, token: resolved.token });
  }

  // Local-first / test mode: an in-memory authority with no seeded projects.
  // Strict cloud-only callers must check hasCloudAuthorityConfig first.
  return new InMemoryCloudAuthority();
}
