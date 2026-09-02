import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
export const GIT_IDENTITY_SCHEME = 'git-remote-v1' as const;
export interface GitProjectIdentity {
  scheme: typeof GIT_IDENTITY_SCHEME;
  canonicalRemote: string;
  fingerprint: string;
  repositoryName: string;
  source: 'origin' | 'unique-remote';
}
const CASE_INSENSITIVE_REPOSITORY_HOSTS = new Set(['github.com', 'gitlab.com', 'bitbucket.org']);
function cleanRepositoryPath(host: string, value: string): string | null {
  let path = value
    .replaceAll('\\', '/')
    .replace(/^\/+/u, '')
    .replace(/\/+$/u, '')
    .replace(/\.git$/iu, '')
    .replace(/\/+/gu, '/');
  if (!path || path === '.' || path === '..') {
    return null;
  }
  if (path.split('/').some((part) => !part || part === '.' || part === '..')) {
    return null;
  }
  if (CASE_INSENSITIVE_REPOSITORY_HOSTS.has(host)) {
    path = path.toLowerCase();
  }
  return path;
}
function canonicalFromUrl(value: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  if (!['https:', 'http:', 'ssh:', 'git:'].includes(parsed.protocol)) {
    return null;
  }
  const hostname = parsed.hostname.trim().toLowerCase();
  if (!hostname) {
    return null;
  }
  const defaultPort =
    (parsed.protocol === 'https:' && parsed.port === '443') ||
    (parsed.protocol === 'http:' && parsed.port === '80') ||
    (parsed.protocol === 'ssh:' && parsed.port === '22');
  const host = parsed.port && !defaultPort ? `${hostname}:${parsed.port}` : hostname;
  const path = cleanRepositoryPath(hostname, parsed.pathname);
  if (!path) {
    return null;
  }
  /*
   * URL user/password/query/fragment are intentionally excluded.
   * A token embedded in an HTTPS remote must never become part
   * of project identity or remote registry metadata.
   */
  return `${host}/${path}`;
}
function canonicalFromScpRemote(value: string): string | null {
  /*
   * git@github.com:owner/repo.git
   * user@git.example.com:group/project.git
   */
  const match = value.match(/^(?:[^@\s/:]+@)?([^:/\s]+):(.+)$/u);
  if (!match) {
    return null;
  }
  const hostname = match[1]?.trim().toLowerCase();
  if (!hostname || hostname.length === 1) {
    /*
     * Avoid interpreting Windows drive paths such as
     * C:\repo as SCP remotes.
     */
    return null;
  }
  const path = cleanRepositoryPath(hostname, match[2] ?? '');
  if (!path) {
    return null;
  }
  return `${hostname}/${path}`;
}
export function normalizeGitRemote(input: string): string | null {
  const value = input.trim();
  if (!value) {
    return null;
  }
  if (value.includes('://')) {
    return canonicalFromUrl(value);
  }
  return canonicalFromScpRemote(value);
}
export function gitRemoteFingerprint(canonicalRemote: string): string {
  return createHash('sha256').update(`${GIT_IDENTITY_SCHEME}:${canonicalRemote}`).digest('hex');
}
export function stableProjectIdFromGitRemote(canonicalRemote: string): string {
  return createHash('sha256')
    .update(`toolnet-project:${GIT_IDENTITY_SCHEME}:${canonicalRemote}`)
    .digest('hex')
    .slice(0, 16);
}
function repositoryNameFromCanonicalRemote(canonicalRemote: string): string | null {
  const pieces = canonicalRemote.split('/').filter(Boolean);
  const name = pieces.at(-1)?.trim();
  return name || null;
}
function runGit(rootPath: string, args: string[]): string | null {
  const result = spawnSync('git', ['-C', rootPath, ...args], {
    encoding: 'utf8',
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  if (result.error || result.status !== 0) {
    return null;
  }
  const output = result.stdout?.trim();
  return output || null;
}
function identityFromCanonicalRemote(
  canonicalRemote: string,
  source: GitProjectIdentity['source']
): GitProjectIdentity | null {
  const repositoryName = repositoryNameFromCanonicalRemote(canonicalRemote);
  if (!repositoryName) {
    return null;
  }
  return {
    scheme: GIT_IDENTITY_SCHEME,
    canonicalRemote,
    fingerprint: gitRemoteFingerprint(canonicalRemote),
    repositoryName,
    source,
  };
}
export function inspectGitProjectIdentity(rootPath: string): GitProjectIdentity | null {
  const origin = runGit(rootPath, ['remote', 'get-url', 'origin']);
  if (origin) {
    const canonical = normalizeGitRemote(origin);
    if (canonical) {
      return identityFromCanonicalRemote(canonical, 'origin');
    }
  }
  /*
   * No origin:
   * only accept a single unique canonical remote.
   *
   * Multiple different remotes are ambiguous and must not
   * silently decide project identity.
   */
  const remoteNamesText = runGit(rootPath, ['remote']);
  if (!remoteNamesText) {
    return null;
  }
  const canonicalRemotes = new Set<string>();
  for (const remoteName of remoteNamesText
    .split(/\r?\n/u)
    .map((item) => item.trim())
    .filter(Boolean)) {
    const raw = runGit(rootPath, ['remote', 'get-url', remoteName]);
    if (!raw) {
      continue;
    }
    const canonical = normalizeGitRemote(raw);
    if (canonical) {
      canonicalRemotes.add(canonical);
    }
  }
  if (canonicalRemotes.size !== 1) {
    return null;
  }
  return identityFromCanonicalRemote([...canonicalRemotes][0]!, 'unique-remote');
}
