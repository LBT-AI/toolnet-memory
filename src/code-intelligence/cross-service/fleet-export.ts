import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import type {
  FleetExportEndpoint,
  FleetExportEvent,
  FleetExportOutboundCall,
  FleetExportPackage,
  FleetExportPackageDependency,
  FleetProjectExport,
} from '../fleet/types.js';

import { normalizeHttpPath, originOf, redactUrl } from './endpoint-normalizer.js';
import type {
  CrossServiceClientCall,
  EventDeclaration,
  HttpOperationDeclaration,
  HttpRouteDeclaration,
  ServiceDescriptor,
} from './types.js';

const MAX_MANIFEST_BYTES = 262_144;

function cleanPath(value: string): string {
  return value.replaceAll('\\', '/').replace(/^\.\//u, '');
}

function readManifestText(rootPath: string, filePath: string): string | null {
  const absolute = resolve(rootPath, filePath);
  try {
    const stats = statSync(absolute);
    if (!stats.isFile() || stats.size > MAX_MANIFEST_BYTES) {
      return null;
    }
    return readFileSync(absolute, 'utf8');
  } catch {
    return null;
  }
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  try {
    const value = JSON.parse(text) as unknown;
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function isLocalDependencySpecifier(specifier: string): boolean {
  const value = specifier.trim().toLowerCase();
  if (!value) {
    return false;
  }
  return (
    value.startsWith('workspace:') ||
    value.startsWith('file:') ||
    value.startsWith('link:') ||
    value.startsWith('portal:') ||
    value.startsWith('path:') ||
    value.startsWith('./') ||
    value.startsWith('../')
  );
}

function worldReadableManifest(rootPath: string, filePath: string): boolean {
  try {
    return existsSync(join(rootPath, filePath));
  } catch {
    return false;
  }
}

/**
 * Passive manifest reading: package/workspace identity and local dependency
 * declarations. No package manager is executed and no registry is queried.
 */
export function collectPackageData(
  rootPath: string,
  serviceManifests: readonly { service: ServiceDescriptor; manifest: string }[]
): { packages: FleetExportPackage[]; packageDependencies: FleetExportPackageDependency[] } {
  const packages = new Map<string, FleetExportPackage>();
  const dependencies = new Map<string, FleetExportPackageDependency>();

  for (const { manifest } of serviceManifests) {
    if (!worldReadableManifest(rootPath, manifest)) {
      continue;
    }
    const text = readManifestText(rootPath, manifest);
    if (!text) {
      continue;
    }

    if (manifest.endsWith('package.json')) {
      const pkg = parseJsonObject(text);
      if (!pkg) {
        continue;
      }
      const name = typeof pkg.name === 'string' ? pkg.name.trim() : '';
      if (name) {
        packages.set(`npm:${name}`, {
          id: `npm:${name}`,
          name,
          manifest,
          source: 'npm',
        });
      }
      for (const field of ['dependencies', 'devDependencies', 'peerDependencies']) {
        const value = pkg[field];
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
          continue;
        }
        for (const [depName, specifier] of Object.entries(value as Record<string, unknown>)) {
          if (typeof specifier !== 'string') {
            continue;
          }
          dependencies.set(`npm:${depName}:${manifest}`, {
            name: depName,
            specifier: redactUrl(specifier),
            local: isLocalDependencySpecifier(specifier),
            manifest,
            source: 'npm',
          });
        }
      }
      continue;
    }

    if (manifest.endsWith('go.mod')) {
      const moduleMatch = /^module\s+(\S+)/mu.exec(text);
      const moduleName = moduleMatch?.[1]?.trim();
      if (moduleName) {
        packages.set(`go:${moduleName}`, {
          id: `go:${moduleName}`,
          name: moduleName,
          manifest,
          source: 'go',
        });
      }
      const replaceBlock = /replace\s+\(([\s\S]*?)\)/u.exec(text)?.[1] ?? '';
      const replaceLines = [
        ...replaceBlock.split(/\r?\n/u),
        ...text.split(/\r?\n/u).filter((line) => /^replace\s+[^\s(]/u.test(line)),
      ];
      for (const line of replaceLines) {
        const match = /^\s*(\S+)(?:\s+\S+)?\s*=>\s*(\S+)/u.exec(line);
        if (!match) {
          continue;
        }
        const depName = match[1];
        dependencies.set(`go:${depName}:${manifest}`, {
          name: depName,
          specifier: redactUrl(match[2]),
          local: match[2].startsWith('.') || match[2].startsWith('/'),
          manifest,
          source: 'go',
        });
      }
      continue;
    }

    if (manifest.endsWith('pyproject.toml')) {
      const nameMatch = /^\s*name\s*=\s*["']([^"']+)["']/mu.exec(text);
      const name = nameMatch?.[1]?.trim();
      if (name) {
        packages.set(`python:${name}`, {
          id: `python:${name}`,
          name,
          manifest,
          source: 'python',
        });
      }
      const dependencyBlock = /dependencies\s*=\s*\[([\s\S]*?)\]/u.exec(text)?.[1] ?? '';
      for (const raw of dependencyBlock.split(/[\n,]/u)) {
        const entry = raw.trim().replace(/^["']|["']$/gu, '');
        if (!entry) {
          continue;
        }
        const depName = entry.split(/[<>=!~;[ \t]/u)[0];
        if (!depName) {
          continue;
        }
        dependencies.set(`python:${depName}:${manifest}`, {
          name: depName,
          specifier: redactUrl(entry),
          local: isLocalDependencySpecifier(entry),
          manifest,
          source: 'python',
        });
      }
      continue;
    }

    if (manifest.endsWith('Cargo.toml')) {
      const nameMatch = /^\s*name\s*=\s*["']([^"']+)["']/mu.exec(text);
      const name = nameMatch?.[1]?.trim();
      if (name) {
        packages.set(`cargo:${name}`, {
          id: `cargo:${name}`,
          name,
          manifest,
          source: 'cargo',
        });
      }
      const dependencySection = /\[dependencies\]([\s\S]*?)(?=\n\[|$)/u.exec(text)?.[1] ?? '';
      for (const line of dependencySection.split(/\r?\n/u)) {
        const match = /^\s*([A-Za-z0-9_-]+)\s*=\s*(.+)$/u.exec(line);
        if (!match) {
          continue;
        }
        const depName = match[1];
        const rawSpec = match[2].trim();
        const pathMatch = /path\s*=\s*["']([^"']+)["']/u.exec(rawSpec);
        dependencies.set(`cargo:${depName}:${manifest}`, {
          name: depName,
          specifier: redactUrl(pathMatch?.[1] ?? rawSpec.replaceAll('"', '')),
          local: Boolean(pathMatch) || isLocalDependencySpecifier(rawSpec),
          manifest,
          source: 'cargo',
        });
      }
    }
  }

  return {
    packages: [...packages.values()].sort((left, right) => left.id.localeCompare(right.id)),
    packageDependencies: [...dependencies.values()].sort((left, right) =>
      left.name === right.name
        ? left.manifest.localeCompare(right.manifest)
        : left.name.localeCompare(right.name)
    ),
  };
}

/**
 * Canonical, lower-cased identity strings another project may reference.
 *
 * Credentials are never part of an identity: git remotes are pre-normalised by
 * `normalizeGitRemote`, and host strings are redacted.
 */
export function collectIdentities(input: {
  projectName: string;
  projectRemote?: string;
  explicitHosts?: readonly string[];
  services: readonly ServiceDescriptor[];
  packages: readonly FleetExportPackage[];
}): string[] {
  const identities = new Set<string>();

  const add = (value: string | undefined | null): void => {
    if (!value) {
      return;
    }
    const cleaned = redactUrl(value.trim().toLowerCase());
    if (cleaned) {
      identities.add(cleaned);
    }
  };

  add(input.projectName);
  add(input.projectRemote);

  for (const host of input.explicitHosts ?? []) {
    add(host);
  }

  for (const service of input.services) {
    add(service.name);
    const base = service.rootPath === '.' ? '' : service.rootPath.split('/').pop();
    add(base);
  }

  for (const pkg of input.packages) {
    add(pkg.name);
    const unscoped = pkg.name.includes('/') ? pkg.name.split('/').pop() : pkg.name;
    add(unscoped);
  }

  return [...identities].sort();
}

function hostOf(...candidates: Array<string | undefined>): string | undefined {
  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }
    /* Credentials must be stripped before any host evidence is derived. */
    const origin = originOf(redactUrl(candidate));
    if (!origin) {
      continue;
    }
    const host = origin.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//u, '').split('/')[0];
    const withoutPort = host.split(':')[0];
    if (withoutPort) {
      return withoutPort.toLowerCase();
    }
  }
  return undefined;
}

export interface BuildFleetExportInput {
  projectId: string;
  projectName: string;
  projectRemote?: string;
  rootPath: string;
  explicitHosts?: readonly string[];
  generation: string;
  graphFingerprint: string;
  crossServiceComplete: boolean;
  serviceManifests: readonly { service: ServiceDescriptor; manifest: string }[];
  services: readonly ServiceDescriptor[];
  routes: readonly HttpRouteDeclaration[];
  operations: readonly HttpOperationDeclaration[];
  clients: readonly CrossServiceClientCall[];
  events: readonly EventDeclaration[];
  routeResourceIds: ReadonlyMap<string, string>;
  eventResourceIds: ReadonlyMap<string, string>;
}

export function buildFleetProjectExport(input: BuildFleetExportInput): FleetProjectExport {
  const { packages, packageDependencies } = collectPackageData(
    input.rootPath,
    input.serviceManifests
  );

  const endpoints: FleetExportEndpoint[] = [];

  for (const route of input.routes) {
    const resourceId = input.routeResourceIds.get(
      `${route.serviceId}:${route.method}:${route.path}`
    );
    if (!resourceId) {
      continue;
    }
    endpoints.push({
      resourceId,
      protocol: 'http',
      serviceId: route.serviceId,
      method: route.method,
      path: route.path,
      ...(route.handlerName ? { handlerSymbolId: route.handlerName } : {}),
    });
  }

  for (const operation of input.operations) {
    const resourceId = input.routeResourceIds.get(
      `${operation.serviceId}:${operation.protocol}:${operation.operation}`
    );
    if (!resourceId) {
      continue;
    }
    endpoints.push({
      resourceId,
      protocol: operation.protocol,
      serviceId: operation.serviceId,
      operation: operation.operation,
    });
  }

  const outboundCalls: FleetExportOutboundCall[] = input.clients.map((client) => {
    if (client.protocol === 'http') {
      const host = hostOf(client.baseUrl, client.target.rawTarget);
      return {
        protocol: 'http',
        ...(client.callerSymbolId ? { callerSymbolId: client.callerSymbolId } : {}),
        filePath: client.filePath,
        line: client.line,
        method: client.target.method,
        /*
         * Phase 72 already redacted the target; canonicalising here removes
         * any origin (and therefore any embedded credentials) from the path
         * before it is persisted in the Fleet namespace.
         */
        path: client.target.path === null ? null : normalizeHttpPath(client.target.path),
        ...(host ? { host } : {}),
        rawTarget: redactUrl(client.target.rawTarget),
      } satisfies FleetExportOutboundCall;
    }

    return {
      protocol: client.protocol,
      ...(client.callerSymbolId ? { callerSymbolId: client.callerSymbolId } : {}),
      filePath: client.filePath,
      line: client.line,
      ...(client.operation ? { operation: client.operation } : {}),
      path: null,
      rawTarget: client.rawTarget,
    } satisfies FleetExportOutboundCall;
  });

  const events: FleetExportEvent[] = [];
  for (const event of input.events) {
    if (!event.channel) {
      continue;
    }
    const resourceId = input.eventResourceIds.get(`${event.provider}:${event.channel}`);
    if (!resourceId) {
      continue;
    }
    events.push({
      resourceId,
      provider: event.provider,
      channel: event.channel,
      direction: event.direction,
      ...(event.callerSymbolId ? { symbolId: event.callerSymbolId } : {}),
      serviceId: event.serviceId,
    });
  }

  return {
    version: 1,
    projectId: input.projectId,
    name: input.projectName,
    ...(input.projectRemote ? { remote: input.projectRemote } : {}),
    generation: input.generation,
    graphFingerprint: input.graphFingerprint,
    indexedAt: new Date().toISOString(),
    crossServiceComplete: input.crossServiceComplete,
    identities: collectIdentities({
      projectName: input.projectName,
      projectRemote: input.projectRemote,
      explicitHosts: input.explicitHosts,
      services: input.services,
      packages,
    }),
    services: input.services.map((service) => ({
      id: service.id,
      name: service.name,
      rootPath: service.rootPath,
      kind: service.kind,
    })),
    endpoints: endpoints.sort((left, right) => left.resourceId.localeCompare(right.resourceId)),
    outboundCalls: outboundCalls.sort((left, right) =>
      left.filePath === right.filePath
        ? left.line - right.line
        : left.filePath.localeCompare(right.filePath)
    ),
    events: events.sort((left, right) => left.resourceId.localeCompare(right.resourceId)),
    packages,
    packageDependencies,
  };
}

export { cleanPath };
