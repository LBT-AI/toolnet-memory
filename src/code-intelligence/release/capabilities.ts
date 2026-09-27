/*
 * Phase 83 — capability inventory (source + packaged) and parity.
 *
 * A capability is a real registered component: an MCP tool registration, a
 * phase certification script or a CodeIntelligenceRuntime method. Inventories
 * are read from the actual artifacts (server registrations, package.json
 * scripts, the built bundle) — never from README or roadmap claims.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { contentFingerprint } from './fingerprint.js';

import type {
  CapabilityInventory,
  CapabilityParity,
  CapabilityStatus,
  PackagedInventory,
} from './types.js';

/* Both quote styles must be handled: source uses single quotes, the bundle
 * (esbuild-minified) uses double quotes. */
const TOOL_CALL_PATTERN = /\.(?:tool)\(\s*(['"])([A-Za-z0-9_]+)\1/g;

export function extractToolNames(text: string): string[] {
  const names = new Set<string>();

  for (const match of text.matchAll(TOOL_CALL_PATTERN)) {
    names.add(match[2]);
  }

  return [...names].sort();
}

/**
 * Server-registration detection: the file must contain a real MCP server tool
 * registration call so that a fixture or unrelated file ending in server.ts is
 * not mistaken for the MCP surface.
 */
function isMCPServerSource(text: string): boolean {
  return /\bnew McpServer\b/u.test(text) || /\bcreateMCPServer\b/u.test(text);
}

export interface SourceInventoryInput {
  projectRoot: string;
  maxCapabilities: number;
}

export interface SourceInventoryResult {
  inventory: CapabilityInventory;
  /** Truncated because a limit was reached. */
  truncated: boolean;
}

/**
 * Build the source capability inventory from the actual registration points:
 * src/mcp/server.ts tool registrations, phase certification scripts and the
 * CodeIntelligenceRuntime interface methods.
 */
export function buildSourceInventory(input: SourceInventoryInput): SourceInventoryResult {
  const categories = new Map<string, string>();
  const unsupported: string[] = [];
  let truncated = false;

  const add = (id: string, category: string): void => {
    if (categories.has(id)) return;
    if (categories.size >= input.maxCapabilities) {
      truncated = true;
      return;
    }
    categories.set(id, category);
  };

  /* MCP tools, from the single registration surface. */
  const serverPath = join(input.projectRoot, 'src', 'mcp', 'server.ts');

  if (existsSync(serverPath)) {
    const serverText = readFileSync(serverPath, 'utf8');

    if (isMCPServerSource(serverText)) {
      for (const tool of extractToolNames(serverText)) {
        add(tool, 'mcp_tool');
      }
    } else {
      unsupported.push('mcp_server_registrations');
    }
  } else {
    unsupported.push('mcp_server_source');
  }

  /* Phase certification scripts, from package.json. */
  const pkgPath = join(input.projectRoot, 'package.json');

  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
        scripts?: Record<string, string>;
      };

      for (const script of Object.keys(pkg.scripts ?? {})) {
        const match = /^phase(\d+):certify$/u.exec(script);

        if (match) add(`phase${match[1]}:certify`, 'certification');
      }
    } catch {
      unsupported.push('package_json_scripts');
    }
  } else {
    unsupported.push('package_json');
  }

  /* CodeIntelligenceRuntime methods, from the interface definition. */
  const runtimePath = join(input.projectRoot, 'src', 'code-intelligence', 'runtime', 'types.ts');

  if (existsSync(runtimePath)) {
    const text = readFileSync(runtimePath, 'utf8');
    const interfaceMatch = /export interface CodeIntelligenceRuntime \{([\s\S]*?)\n\}/u.exec(text);

    if (interfaceMatch) {
      for (const method of interfaceMatch[1].matchAll(/^  ([a-zA-Z][a-zA-Z0-9]*)\(/gmu)) {
        add(`runtime.${method[1]}`, 'runtime_method');
      }
    } else {
      unsupported.push('runtime_interface');
    }
  } else {
    unsupported.push('runtime_interface_source');
  }

  const ids = [...categories.keys()].sort();

  return {
    inventory: {
      ids,
      categories: Object.fromEntries(categories),
      coverage: unsupported.length === 0 ? 'complete' : 'partial',
      unsupported,
    },
    truncated,
  };
}

export interface PackagedInventoryInput {
  projectRoot: string;
  maxCapabilities: number;
  maxBundleReadBytes: number;
}

export interface PackagedInventoryResult {
  inventory: PackagedInventory;
  truncated: boolean;
}

/** Internal probe errors surfaced by the packaged inventory. */
interface PackagedInventoryWithErrors extends PackagedInventory {
  inventoryErrors?: string[];
}

/** Build the packaged capability inventory from the built MCP bundle. */
export function buildPackagedInventory(input: PackagedInventoryInput): PackagedInventoryResult {
  const bundlePath = join(input.projectRoot, 'bundle', 'mcp.js');

  if (!existsSync(bundlePath)) {
    return {
      inventory: {
        ids: [],
        bundlePath,
        bundlePresent: false,
        bundleFingerprint: '',
        coverage: 'partial',
        unsupported: ['bundle_missing'],
      },
      truncated: false,
    };
  }

  const bytes = readFileSync(bundlePath);

  if (bytes.byteLength > input.maxBundleReadBytes) {
    return {
      inventory: {
        ids: [],
        bundlePath,
        bundlePresent: true,
        bundleFingerprint: '',
        coverage: 'partial',
        unsupported: ['bundle_too_large'],
      },
      truncated: true,
    };
  }

  const text = bytes.toString('utf8');
  const ids = extractToolNames(text).slice(0, input.maxCapabilities);

  return {
    inventory: {
      ids,
      bundlePath,
      bundlePresent: true,
      bundleFingerprint: contentFingerprint(bytes),
      coverage: 'complete',
      unsupported: [],
    },
    truncated: ids.length >= input.maxCapabilities,
  };
}

/**
 * Compare source vs packaged capability inventories.
 *
 * `missingRequired` lists source capabilities that are absent from the package
 * and are considered required for release (MCP tools). Certification-script
 * and runtime-method capabilities are not expected inside the MCP bundle and
 * are tracked without blocking.
 */
export function compareCapabilities(
  source: CapabilityInventory,
  packaged: PackagedInventory
): CapabilityParity {
  const packagedIds = new Set(packaged.ids);
  const capabilities: CapabilityStatus[] = [];

  const missingRequired: string[] = [];
  const missing: string[] = [];
  const extra: string[] = [];

  for (const id of source.ids) {
    const category = source.categories[id] ?? 'unknown';
    const present = packagedIds.has(id);

    if (!present && category === 'mcp_tool') {
      missingRequired.push(id);
      missing.push(id);
    } else if (!present && category !== 'mcp_tool') {
      /* Runtime methods and certification scripts are not MCP-bundle content. */
    } else {
      capabilities.push({
        id,
        category,
        source: 'present',
        packaged: 'present',
        certified: 'not_certified',
      });
    }
  }

  const sourceIds = new Set(source.ids);

  for (const id of packaged.ids) {
    if (!sourceIds.has(id)) extra.push(id);
  }

  const inventoryErrors = (packaged as PackagedInventoryWithErrors).inventoryErrors;
  const complete = missingRequired.length === 0 && !inventoryErrors?.length;

  return {
    capabilities,
    missingInPackage: missing,
    extraInPackage: extra.sort(),
    missingRequired,
    complete,
  };
}
