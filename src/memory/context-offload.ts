import { createHash } from 'node:crypto';

import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';

import { dirname, join } from 'node:path';

import type { NormalizedSessionEvent, SessionEventType } from '../session/types.js';

const GRAPH_SCHEMA = 'toolnet.context-offload.v1';

const ASSET_SCHEMA = 'toolnet.context-offload-asset.v1';

const MAX_GRAPH_NODES = 256;

const OFFLOAD_TYPES = new Set<SessionEventType>([
  'tool_call',
  'tool_result',
  'file_read',
  'file_write',
  'file_edit',
  'command',
  'test',
  'artifact',
]);

export interface ContextOffloadNode {
  id: string;

  kind: SessionEventType;

  bytes: number;

  createdAt: string;

  sourceRefs: string[];

  files: string[];
}

export interface ContextOffloadGraphV1 {
  schema: typeof GRAPH_SCHEMA;

  version: 1;

  updatedAt: string;

  nodes: ContextOffloadNode[];
}

interface ContextOffloadAssetV1 {
  schema: typeof ASSET_SCHEMA;

  version: 1;

  assetId: string;

  event: {
    type: SessionEventType;

    agent: string;

    nativeSessionId: string;

    timestamp: string;

    sourceEventId?: string;

    provenance: NormalizedSessionEvent['provenance'];

    data: Record<string, unknown>;
  };
}

export interface ContextOffloadWriteResult {
  eligible: number;

  written: number;

  deduped: number;

  graphNodes: number;

  assetIds: string[];
}

export interface ContextOffloadReadResult {
  assetId: string;

  kind: SessionEventType;

  bytes: number;

  truncated: boolean;

  content: string;
}

function root(projectRoot: string): string {
  return join(projectRoot, '.toolnet', 'offload');
}

function assetsRoot(projectRoot: string): string {
  return join(root(projectRoot), 'assets');
}

function graphFile(projectRoot: string): string {
  return join(root(projectRoot), 'graph.json');
}

function ensurePrivateDirectory(directory: string): void {
  mkdirSync(directory, {
    recursive: true,
    mode: 0o700,
  });

  try {
    chmodSync(directory, 0o700);
  } catch {
    // Filesystem may not support POSIX permissions.
  }
}

function atomicWrite(file: string, value: string): void {
  ensurePrivateDirectory(dirname(file));

  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;

  writeFileSync(temporary, value, {
    encoding: 'utf8',
    mode: 0o600,
  });

  renameSync(temporary, file);

  try {
    chmodSync(file, 0o600);
  } catch {
    // Filesystem may not support POSIX permissions.
  }
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, stableValue(item)])
    );
  }

  return value;
}

function digest(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(stableValue(value)), 'utf8')
    .digest('hex');
}

function emptyGraph(): ContextOffloadGraphV1 {
  return {
    schema: GRAPH_SCHEMA,
    version: 1,
    updatedAt: new Date(0).toISOString(),
    nodes: [],
  };
}

function readGraph(projectRoot: string): ContextOffloadGraphV1 {
  const file = graphFile(projectRoot);

  if (!existsSync(file)) {
    return emptyGraph();
  }

  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as ContextOffloadGraphV1;

    if (parsed.schema !== GRAPH_SCHEMA || parsed.version !== 1 || !Array.isArray(parsed.nodes)) {
      return emptyGraph();
    }

    return parsed;
  } catch {
    return emptyGraph();
  }
}

function writeGraph(projectRoot: string, graph: ContextOffloadGraphV1): void {
  atomicWrite(graphFile(projectRoot), JSON.stringify(graph, null, 2) + '\n');
}

function cleanText(value: unknown, max = 260): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const clean = value.replace(/\s+/gu, ' ').trim();

  return clean ? clean.slice(0, max) : null;
}

function eventFiles(event: NormalizedSessionEvent): string[] {
  const values = [...(event.provenance.files ?? []), event.provenance.sourcePath];

  const result: string[] = [];

  for (const value of values) {
    const clean = cleanText(value);

    if (!clean || result.includes(clean)) {
      continue;
    }

    result.push(clean);

    if (result.length === 3) {
      break;
    }
  }

  return result;
}

function sourceRef(event: NormalizedSessionEvent): string {
  return `${event.agent}:${event.sourceEventId ?? event.id}`
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, 120);
}

function writeAsset(file: string, value: string): boolean {
  ensurePrivateDirectory(dirname(file));

  try {
    writeFileSync(file, value, {
      encoding: 'utf8',
      flag: 'wx',
      mode: 0o600,
    });

    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      return false;
    }

    throw error;
  }
}

function mergeNode(graph: ContextOffloadGraphV1, node: ContextOffloadNode): ContextOffloadGraphV1 {
  const previous = graph.nodes.find((item) => item.id === node.id);

  const merged = previous
    ? {
        ...previous,
        kind: node.kind,
        bytes: node.bytes,
        sourceRefs: Array.from(new Set([...previous.sourceRefs, ...node.sourceRefs])).slice(-8),
        files: Array.from(new Set([...previous.files, ...node.files])).slice(0, 6),
      }
    : node;

  return {
    schema: GRAPH_SCHEMA,
    version: 1,
    updatedAt: new Date().toISOString(),
    nodes: [...graph.nodes.filter((item) => item.id !== node.id), merged].slice(-MAX_GRAPH_NODES),
  };
}

export function offloadSessionEvents(
  projectRoot: string,
  events: NormalizedSessionEvent[]
): ContextOffloadWriteResult {
  let graph = readGraph(projectRoot);

  let eligible = 0;
  let written = 0;
  let deduped = 0;

  const assetIds: string[] = [];

  for (const event of events) {
    /*
     * Conversation text stays completely outside T2 assets.
     * Only large/tool/file operational payload classes are eligible.
     */
    if (!OFFLOAD_TYPES.has(event.type)) {
      continue;
    }

    eligible += 1;

    /*
     * Content-addressed identity.
     * Session/event identity does not affect payload dedup.
     */
    const assetId = digest({
      type: event.type,
      data: event.data,
    });

    const asset: ContextOffloadAssetV1 = {
      schema: ASSET_SCHEMA,
      version: 1,
      assetId,

      event: {
        type: event.type,
        agent: event.agent,
        nativeSessionId: event.nativeSessionId,
        timestamp: event.timestamp,
        sourceEventId: event.sourceEventId,
        provenance: event.provenance,
        data: event.data,
      },
    };

    const content = JSON.stringify(asset, null, 2) + '\n';

    if (writeAsset(join(assetsRoot(projectRoot), `${assetId}.json`), content)) {
      written += 1;
    } else {
      deduped += 1;
    }

    assetIds.push(assetId);

    graph = mergeNode(graph, {
      id: assetId,
      kind: event.type,
      bytes: Buffer.byteLength(content, 'utf8'),
      createdAt: event.timestamp,
      sourceRefs: [sourceRef(event)],
      files: eventFiles(event),
    });
  }

  if (eligible > 0) {
    writeGraph(projectRoot, graph);
  }

  return {
    eligible,
    written,
    deduped,
    graphNodes: graph.nodes.length,
    assetIds,
  };
}

function resolveAssetId(projectRoot: string, reference: string): string {
  const value = reference.trim().toLowerCase();

  if (!/^[a-f0-9]{8,64}$/u.test(value)) {
    throw new Error('Invalid context offload asset reference.');
  }

  if (value.length === 64 && existsSync(join(assetsRoot(projectRoot), `${value}.json`))) {
    return value;
  }

  const matches = readGraph(projectRoot)
    .nodes.map((node) => node.id)
    .filter((id) => id.startsWith(value));

  if (matches.length === 0) {
    throw new Error(`Context offload asset not found: ${reference}`);
  }

  if (matches.length > 1) {
    throw new Error(`Ambiguous context offload asset reference: ${reference}`);
  }

  return matches[0]!;
}

export function readContextOffloadAsset(
  projectRoot: string,
  reference: string,
  maxChars = 6000
): ContextOffloadReadResult {
  const assetId = resolveAssetId(projectRoot, reference);

  const raw = readFileSync(join(assetsRoot(projectRoot), `${assetId}.json`), 'utf8');

  const parsed = JSON.parse(raw) as ContextOffloadAssetV1;

  if (parsed.schema !== ASSET_SCHEMA || parsed.version !== 1 || parsed.assetId !== assetId) {
    throw new Error(`Invalid context offload asset: ${reference}`);
  }

  const limit = Math.max(200, Math.min(20_000, Math.floor(maxChars)));

  return {
    assetId,
    kind: parsed.event.type,
    bytes: Buffer.byteLength(raw, 'utf8'),
    truncated: raw.length > limit,
    content: raw.length > limit ? `${raw.slice(0, limit)}\n[truncated]` : raw,
  };
}

function compact(value: string, max: number): string {
  const clean = value.replace(/\s+/gu, ' ').trim();

  return clean.length <= max ? clean : clean.slice(0, max - 1).trimEnd() + '…';
}

export function buildCompactContextOffloadGraph(
  projectRoot: string,
  options: {
    maxAssets?: number;
    maxChars?: number;
  } = {}
): string {
  const graph = readGraph(projectRoot);

  if (graph.nodes.length === 0) {
    return '';
  }

  const maxAssets = Math.max(1, Math.min(12, options.maxAssets ?? 6));
  const maxChars = Math.max(320, Math.min(2400, options.maxChars ?? 900));

  const lines = [
    '[TOOLNET CONTEXT OFFLOAD GRAPH]',
    'Large tool/file payloads stay outside prompt context.',
    'Read only a needed asset with MCP context_offload_read.',
  ];

  for (const node of graph.nodes.slice(-maxAssets).reverse()) {
    const source = compact(node.sourceRefs.at(-1) ?? 'unknown', 72);

    const files = node.files.length > 0 ? ` files=${compact(node.files.join(','), 120)}` : '';

    const line =
      `event:${source} --offloads--> asset:${node.id.slice(0, 12)}` +
      ` kind=${node.kind} bytes=${node.bytes}${files}`;

    if ([...lines, line].join('\n').length > maxChars) {
      break;
    }

    lines.push(line);
  }

  return lines.join('\n');
}
