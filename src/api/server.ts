import { timingSafeEqual } from 'node:crypto';

import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';

import type { ProjectManifest } from '../core/types.js';

import type { RetrievalEngine } from '../retrieval/retrieval-engine.js';

import {
  apiContextOffloadRead,
  apiHealth,
  apiMemoryAsk,
  apiMemorySearch,
  apiProject,
  apiSkillMemorySearch,
} from './routes/index.js';

export interface ApiServerOptions {
  project: ProjectManifest;
  retrieval: RetrievalEngine;
  token?: string;
}

function isAuthorized(req: IncomingMessage, token?: string): boolean {
  if (!token) {
    return true;
  }

  const authorization = req.headers.authorization;

  if (!authorization?.startsWith('Bearer ')) {
    return false;
  }

  const provided = Buffer.from(authorization.slice(7));
  const expected = Buffer.from(token);

  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

function sendJson(res: ServerResponse, statusCode: number, body: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);

    size += buffer.length;

    if (size > 16_384) {
      throw new Error('Request body too large');
    }

    chunks.push(buffer);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function parseMemoryAskInput(value: unknown): {
  question: string;
  mode?: 'ai' | 'local';
} | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const input = value as Record<string, unknown>;

  if (
    typeof input.question !== 'string' ||
    input.question.length < 2 ||
    input.question.length > 4000
  ) {
    return null;
  }

  if (input.mode !== undefined && input.mode !== 'ai' && input.mode !== 'local') {
    return null;
  }

  return {
    question: input.question,
    ...(input.mode ? { mode: input.mode } : {}),
  };
}

function parseMemorySearchInput(value: unknown): {
  query: string;
  limit?: number;
} | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const input = value as Record<string, unknown>;

  if (typeof input.query !== 'string') {
    return null;
  }

  if (
    input.limit !== undefined &&
    (!Number.isInteger(input.limit) || (input.limit as number) < 1 || (input.limit as number) > 20)
  ) {
    return null;
  }

  return {
    query: input.query,
    ...(input.limit !== undefined ? { limit: input.limit as number } : {}),
  };
}

function parseSkillSearchInput(value: unknown): {
  query: string;
  limit?: number;
} | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const input = value as Record<string, unknown>;

  if (typeof input.query !== 'string' || input.query.length < 2 || input.query.length > 500) {
    return null;
  }

  if (
    input.limit !== undefined &&
    (!Number.isInteger(input.limit) || (input.limit as number) < 1 || (input.limit as number) > 10)
  ) {
    return null;
  }

  return {
    query: input.query,
    ...(input.limit !== undefined ? { limit: input.limit as number } : {}),
  };
}

function parseContextOffloadInput(value: unknown): {
  assetId: string;
  maxChars?: number;
} | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const input = value as Record<string, unknown>;

  if (typeof input.assetId !== 'string' || !/^[a-f0-9]{8,64}$/iu.test(input.assetId)) {
    return null;
  }

  if (
    input.maxChars !== undefined &&
    (!Number.isInteger(input.maxChars) ||
      (input.maxChars as number) < 200 ||
      (input.maxChars as number) > 20_000)
  ) {
    return null;
  }

  return {
    assetId: input.assetId,
    ...(input.maxChars !== undefined ? { maxChars: input.maxChars as number } : {}),
  };
}

export function createApiServer(options: ApiServerOptions): Server {
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

      if (url.pathname.startsWith('/v1/') && !isAuthorized(req, options.token)) {
        sendJson(res, 401, {
          error: 'Unauthorized',
        });
        return;
      }

      if (req.method === 'GET' && url.pathname === '/v1/health') {
        sendJson(res, 200, apiHealth(options.project));
        return;
      }

      if (req.method === 'GET' && url.pathname === '/v1/project') {
        sendJson(res, 200, apiProject(options.project));
        return;
      }

      if (req.method === 'POST' && url.pathname === '/v1/memory/ask') {
        const input = parseMemoryAskInput(await readJsonBody(req));

        if (!input) {
          sendJson(res, 400, {
            error: 'Invalid memory ask request',
          });
          return;
        }

        sendJson(res, 200, await apiMemoryAsk(options.project, input));
        return;
      }

      if (req.method === 'POST' && url.pathname === '/v1/memory/search') {
        const input = parseMemorySearchInput(await readJsonBody(req));

        if (!input) {
          sendJson(res, 400, {
            error: 'Invalid memory search request',
          });
          return;
        }

        sendJson(res, 200, await apiMemorySearch(options.project, options.retrieval, input));
        return;
      }

      if (req.method === 'POST' && url.pathname === '/v1/skills/search') {
        const input = parseSkillSearchInput(await readJsonBody(req));

        if (!input) {
          sendJson(res, 400, {
            error: 'Invalid skill search request',
          });
          return;
        }

        sendJson(res, 200, await apiSkillMemorySearch(options.project, input));
        return;
      }

      if (req.method === 'POST' && url.pathname === '/v1/offload/read') {
        const input = parseContextOffloadInput(await readJsonBody(req));

        if (!input) {
          sendJson(res, 400, {
            error: 'Invalid context offload request',
          });
          return;
        }

        sendJson(res, 200, await apiContextOffloadRead(options.project, input));
        return;
      }

      sendJson(res, 404, {
        error: 'Not found',
      });
    } catch (error) {
      sendJson(res, 500, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}
