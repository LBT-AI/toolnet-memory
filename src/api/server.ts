import { timingSafeEqual } from 'node:crypto';

import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';

import type { ProjectManifest } from '../core/types.js';

import type { RetrievalEngine } from '../retrieval/retrieval-engine.js';

import { MemoryHubError, type MemoryHubService } from '../hub/index.js';

import { WikiError, type WikiService } from '../wiki/index.js';
import type { KnowledgeGovernanceService } from '../wiki/index.js';

import {
  apiContextOffloadRead,
  apiHealth,
  apiMemoryAsk,
  apiMemorySearch,
  apiProject,
  apiSkillMemorySearch,
} from './routes/index.js';

import {
  apiHubAcl,
  apiHubAgents,
  apiHubCreateAgent,
  apiHubCreateTeam,
  apiHubGrantAcl,
  apiHubLoadouts,
  apiHubObservability,
  apiHubRevokeAcl,
  apiHubSetLoadout,
  apiHubSummary,
  apiHubTeams,
} from './routes/hub.js';

import {
  apiWikiBacklinks,
  apiWikiCreatePage,
  apiWikiHistory,
  apiWikiPage,
  apiWikiPages,
  apiWikiSearch,
  apiWikiSummary,
  apiWikiUpdatePage,
} from './routes/wiki.js';

import {
  apiGovernanceAudit,
  apiGovernancePolicy,
  apiGovernanceQuality,
  apiGovernanceReviewDecision,
  apiGovernanceReviews,
  apiGovernanceSetPolicy,
  apiGovernanceSummary,
} from './routes/governance.js';

export interface ApiServerOptions {
  project: ProjectManifest;
  retrieval: RetrievalEngine;
  token?: string;
  hub?: MemoryHubService;
  wiki?: WikiService;
  governance?: KnowledgeGovernanceService;
}

function requestPrincipal(req: IncomingMessage): string {
  const value = req.headers['x-toolnet-principal'];

  const principal = Array.isArray(value) ? value[0] : value;

  return principal?.trim() || 'anonymous';
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
  mode?: 'local';
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

  if (input.mode !== undefined && input.mode !== 'local') {
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

      const principal = requestPrincipal(req);
      const startedAt = Date.now();

      res.once('finish', () => {
        if (!options.hub) {
          return;
        }

        void options.hub
          .recordRequest({
            method: req.method ?? 'GET',
            path: url.pathname,
            principal,
            statusCode: res.statusCode,
            durationMs: Date.now() - startedAt,
          })
          .catch(() => {
            // Observability is best-effort.
          });
      });

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

      if (url.pathname.startsWith('/v1/hub') && !options.hub) {
        sendJson(res, 503, {
          error: 'Memory Hub unavailable',
        });
        return;
      }

      if (req.method === 'GET' && url.pathname === '/v1/hub') {
        sendJson(res, 200, await apiHubSummary(options.hub!, principal));
        return;
      }

      if (req.method === 'GET' && url.pathname === '/v1/hub/teams') {
        sendJson(res, 200, await apiHubTeams(options.hub!, principal));
        return;
      }

      if (req.method === 'POST' && url.pathname === '/v1/hub/teams') {
        sendJson(
          res,
          201,
          await apiHubCreateTeam(options.hub!, principal, await readJsonBody(req))
        );
        return;
      }

      if (req.method === 'GET' && url.pathname === '/v1/hub/agents') {
        sendJson(res, 200, await apiHubAgents(options.hub!, principal));
        return;
      }

      if (req.method === 'POST' && url.pathname === '/v1/hub/agents') {
        sendJson(
          res,
          201,
          await apiHubCreateAgent(options.hub!, principal, await readJsonBody(req))
        );
        return;
      }

      if (req.method === 'GET' && url.pathname === '/v1/hub/acl') {
        sendJson(res, 200, await apiHubAcl(options.hub!, principal));
        return;
      }

      if (req.method === 'POST' && url.pathname === '/v1/hub/acl/grant') {
        sendJson(res, 200, await apiHubGrantAcl(options.hub!, principal, await readJsonBody(req)));
        return;
      }

      if (req.method === 'POST' && url.pathname === '/v1/hub/acl/revoke') {
        sendJson(res, 200, await apiHubRevokeAcl(options.hub!, principal, await readJsonBody(req)));
        return;
      }

      if (req.method === 'GET' && url.pathname === '/v1/hub/loadouts') {
        sendJson(res, 200, await apiHubLoadouts(options.hub!, principal));
        return;
      }

      if (req.method === 'POST' && url.pathname === '/v1/hub/loadouts') {
        sendJson(
          res,
          200,
          await apiHubSetLoadout(options.hub!, principal, await readJsonBody(req))
        );
        return;
      }

      if (req.method === 'GET' && url.pathname === '/v1/hub/observability') {
        sendJson(res, 200, await apiHubObservability(options.hub!, principal));
        return;
      }

      if (url.pathname.startsWith('/v1/wiki') && (!options.wiki || !options.hub)) {
        sendJson(res, 503, {
          error: 'Wiki unavailable',
        });
        return;
      }

      if (req.method === 'GET' && url.pathname === '/v1/wiki') {
        sendJson(res, 200, await apiWikiSummary(options.wiki!, options.hub!, principal));
        return;
      }

      if (req.method === 'GET' && url.pathname === '/v1/wiki/pages') {
        sendJson(res, 200, await apiWikiPages(options.wiki!, options.hub!, principal));
        return;
      }

      if (req.method === 'POST' && url.pathname === '/v1/wiki/pages') {
        sendJson(
          res,
          201,
          await apiWikiCreatePage(options.wiki!, options.hub!, principal, await readJsonBody(req))
        );
        return;
      }

      if (req.method === 'GET' && url.pathname === '/v1/wiki/search') {
        const query = url.searchParams.get('q') ?? '';

        const parsedLimit = Number(url.searchParams.get('limit') ?? 10);

        const limit = Number.isInteger(parsedLimit) ? Math.max(1, Math.min(20, parsedLimit)) : 10;

        sendJson(
          res,
          200,
          await apiWikiSearch(options.wiki!, options.hub!, principal, query, limit)
        );
        return;
      }

      const wikiHistoryMatch = /^\/v1\/wiki\/pages\/([^/]+)\/history$/u.exec(url.pathname);

      if (req.method === 'GET' && wikiHistoryMatch) {
        sendJson(
          res,
          200,
          await apiWikiHistory(
            options.wiki!,
            options.hub!,
            principal,
            decodeURIComponent(wikiHistoryMatch[1])
          )
        );
        return;
      }

      const wikiBacklinksMatch = /^\/v1\/wiki\/pages\/([^/]+)\/backlinks$/u.exec(url.pathname);

      if (req.method === 'GET' && wikiBacklinksMatch) {
        sendJson(
          res,
          200,
          await apiWikiBacklinks(
            options.wiki!,
            options.hub!,
            principal,
            decodeURIComponent(wikiBacklinksMatch[1])
          )
        );
        return;
      }

      const wikiPageMatch = /^\/v1\/wiki\/pages\/([^/]+)$/u.exec(url.pathname);

      if (req.method === 'GET' && wikiPageMatch) {
        sendJson(
          res,
          200,
          await apiWikiPage(
            options.wiki!,
            options.hub!,
            principal,
            decodeURIComponent(wikiPageMatch[1])
          )
        );
        return;
      }

      if (req.method === 'PUT' && wikiPageMatch) {
        sendJson(
          res,
          200,
          await apiWikiUpdatePage(
            options.wiki!,
            options.hub!,
            principal,
            decodeURIComponent(wikiPageMatch[1]),
            await readJsonBody(req)
          )
        );
        return;
      }

      if (
        url.pathname.startsWith('/v1/governance') &&
        (!options.governance || !options.wiki || !options.hub)
      ) {
        sendJson(res, 503, {
          error: 'Knowledge Governance unavailable',
        });
        return;
      }

      if (req.method === 'GET' && url.pathname === '/v1/governance') {
        sendJson(
          res,
          200,
          await apiGovernanceSummary(options.governance!, options.hub!, principal)
        );
        return;
      }

      if (req.method === 'GET' && url.pathname === '/v1/governance/reviews') {
        sendJson(
          res,
          200,
          await apiGovernanceReviews(
            options.governance!,
            options.hub!,
            principal,
            url.searchParams.get('status') ?? undefined
          )
        );
        return;
      }

      const governanceReviewMatch = /^\/v1\/governance\/reviews\/([^/]+)$/u.exec(url.pathname);

      if (req.method === 'POST' && governanceReviewMatch) {
        sendJson(
          res,
          200,
          await apiGovernanceReviewDecision(
            options.governance!,
            options.wiki!,
            options.hub!,
            principal,
            decodeURIComponent(governanceReviewMatch[1]),
            await readJsonBody(req)
          )
        );
        return;
      }

      if (req.method === 'GET' && url.pathname === '/v1/governance/quality') {
        sendJson(
          res,
          200,
          await apiGovernanceQuality(options.governance!, options.wiki!, options.hub!, principal)
        );
        return;
      }

      if (req.method === 'GET' && url.pathname === '/v1/governance/policy') {
        sendJson(res, 200, await apiGovernancePolicy(options.governance!, options.hub!, principal));
        return;
      }

      if (req.method === 'PUT' && url.pathname === '/v1/governance/policy') {
        sendJson(
          res,
          200,
          await apiGovernanceSetPolicy(
            options.governance!,
            options.hub!,
            principal,
            await readJsonBody(req)
          )
        );
        return;
      }

      if (req.method === 'GET' && url.pathname === '/v1/governance/audit') {
        const rawLimit = Number(url.searchParams.get('limit') ?? 100);

        const limit = Number.isInteger(rawLimit) ? Math.max(1, Math.min(500, rawLimit)) : 100;

        sendJson(
          res,
          200,
          await apiGovernanceAudit(options.governance!, options.hub!, principal, limit)
        );
        return;
      }

      sendJson(res, 404, {
        error: 'Not found',
      });
    } catch (error) {
      if (error instanceof MemoryHubError || error instanceof WikiError) {
        sendJson(res, error.statusCode, {
          error: error.message,
        });
        return;
      }

      if (error instanceof Error && error.message.startsWith('Invalid ')) {
        sendJson(res, 400, {
          error: error.message,
        });
        return;
      }

      sendJson(res, 500, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}
