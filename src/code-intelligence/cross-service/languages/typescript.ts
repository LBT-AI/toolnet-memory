import * as ts from 'typescript';

import { isHttpMethod, joinHttpPaths, redactUrl, type HttpMethod } from '../endpoint-normalizer.js';
import {
  emptyExtraction,
  type ExtractionContext,
  type ExtractionOutput,
  type ProtocolExtractor,
} from '../extractor.js';
import type { EventDeclaration, HttpClientCall } from '../types.js';

const ROUTE_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head']);

const CLIENT_METHODS = new Set([
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'options',
  'head',
  'request',
]);

const EMIT_METHODS = new Set(['emit', 'publish', 'dispatch']);
const LISTEN_METHODS = new Set(['on', 'once', 'addListener', 'subscribe']);

const NEST_METHODS: Record<string, HttpMethod> = {
  Get: 'GET',
  Post: 'POST',
  Put: 'PUT',
  Patch: 'PATCH',
  Delete: 'DELETE',
  Options: 'OPTIONS',
  Head: 'HEAD',
};

function lineOf(source: ts.SourceFile, node: ts.Node): number {
  return source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
}

function stringLiteralValue(node: ts.Node | undefined): string | undefined {
  if (!node) {
    return undefined;
  }
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  return undefined;
}

/**
 * Deterministic, purely static evaluation of a string expression.
 *
 * Only literals, known constants and fully-static template/`+` expressions are
 * accepted. Anything else returns `null`, which the linker treats as a dynamic
 * (unresolved) target. No runtime environment is ever inspected.
 */
export function staticStringOf(
  node: ts.Node | undefined,
  constants: ReadonlyMap<string, string>
): string | null {
  if (!node) {
    return null;
  }

  const literal = stringLiteralValue(node);
  if (literal !== undefined) {
    return literal;
  }

  if (ts.isIdentifier(node)) {
    return constants.get(node.text) ?? null;
  }

  if (ts.isTemplateExpression(node)) {
    let value = node.head.text;
    for (const span of node.templateSpans) {
      const resolved = staticStringOf(span.expression, constants);
      if (resolved === null) {
        return null;
      }
      value += resolved + span.literal.text;
    }
    return value;
  }

  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = staticStringOf(node.left, constants);
    const right = staticStringOf(node.right, constants);
    if (left === null || right === null) {
      return null;
    }
    return left + right;
  }

  return null;
}

function collectConstants(source: ts.SourceFile): Map<string, string> {
  const constants = new Map<string, string>();

  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const value = staticStringOf(node.initializer, constants);
      if (value !== null) {
        constants.set(node.name.text, value);
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(source);
  return constants;
}

interface RouterInfo {
  /** `prefixes.get(router)` = prefixes declared for that router via `use`. */
  prefixes: Map<string, string[]>;
  /** `parents.get(child)` = routers that mount the child. */
  parents: Map<string, Set<string>>;
  /** Identifiers that behave like HTTP servers/routers. */
  routers: Set<string>;
}

function collectRouters(source: ts.SourceFile, constants: ReadonlyMap<string, string>): RouterInfo {
  const prefixes = new Map<string, string[]>();
  const parents = new Map<string, Set<string>>();
  const routers = new Set<string>();

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const receiver = node.expression.expression;
      const methodName = node.expression.name.text.toLowerCase();

      if (methodName === 'use' && ts.isIdentifier(receiver)) {
        routers.add(receiver.text);

        const prefix = staticStringOf(node.arguments[0], constants);
        const target = node.arguments[1];

        if (prefix !== null && prefix.startsWith('/') && target && ts.isIdentifier(target)) {
          const list = prefixes.get(target.text) ?? [];
          if (!list.includes(prefix)) {
            list.push(prefix);
          }
          prefixes.set(target.text, list);

          const parentSet = parents.get(target.text) ?? new Set<string>();
          parentSet.add(receiver.text);
          parents.set(target.text, parentSet);
          routers.add(target.text);
        }
      }

      /*
       * NOTE: a receiver of `.get()`/`.post()` is NOT automatically a server.
       * Treating every `x.get('/path')` as a route made HTTP *client* calls
       * (axios.get, client.get, ...) look like server route declarations,
       * which produced duplicate/ambiguous endpoints. Routers are only the
       * receivers proven below.
       */
    }

    /*
     * `const app = express()` / `const router = Router()`.
     */
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isCallExpression(node.initializer)
    ) {
      const callee = node.initializer.expression;
      if (
        (ts.isIdentifier(callee) && /^(?:express|Router|Fastify|Koa|Hono)$/u.test(callee.text)) ||
        (ts.isPropertyAccessExpression(callee) && callee.name.text === 'Router')
      ) {
        routers.add(node.name.text);
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(source);
  return { prefixes, parents, routers };
}

/**
 * Transitive deterministic prefix resolution with a cycle guard.
 *
 * Returns `undefined` for an ambiguous chain (never an arbitrary match).
 */
function resolveRouterPrefix(
  name: string,
  routers: RouterInfo,
  visited: Set<string>
): string | undefined {
  if (visited.has(name)) {
    return undefined;
  }
  visited.add(name);

  const own = [...new Set(routers.prefixes.get(name) ?? [])];
  if (own.length > 1) {
    return undefined;
  }

  const ownPrefix = own[0] ?? '';

  const parentNames = [...(routers.parents.get(name) ?? [])].sort();
  if (parentNames.length === 0) {
    return ownPrefix;
  }

  const results = new Set<string>();
  for (const parent of parentNames) {
    const parentPrefix = resolveRouterPrefix(parent, routers, new Set(visited));
    if (parentPrefix === undefined) {
      return undefined;
    }
    results.add(joinHttpPaths(parentPrefix, ownPrefix));
  }

  return results.size === 1 ? [...results][0] : undefined;
}

function classControllerPrefix(node: ts.ClassDeclaration): string | undefined {
  const decorators = ts.canHaveDecorators(node) ? (ts.getDecorators(node) ?? []) : [];

  for (const decorator of decorators) {
    const expression = decorator.expression;
    if (!ts.isCallExpression(expression) || !ts.isIdentifier(expression.expression)) {
      continue;
    }
    if (expression.expression.text !== 'Controller') {
      continue;
    }
    const value = stringLiteralValue(expression.arguments[0]);
    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

function objectProperty(node: ts.ObjectLiteralExpression, name: string): ts.Expression | undefined {
  for (const property of node.properties) {
    if (
      ts.isPropertyAssignment(property) &&
      ts.isIdentifier(property.name) &&
      property.name.text === name
    ) {
      return property.initializer;
    }
  }
  return undefined;
}

/**
 * TypeScript / JavaScript extractor.
 *
 * Uses the TypeScript Compiler API (the same engine as the structural parser)
 * so routes, client calls and event channels are read from real syntax rather
 * than textual pattern matching.
 */
export class TypeScriptCrossServiceExtractor implements ProtocolExtractor {
  readonly id = 'cross-service-typescript';
  readonly language = 'typescript';

  supports(filePath: string): boolean {
    return /\.(?:ts|tsx|js|jsx|mts|cts|mjs|cjs)$/u.test(filePath);
  }

  extract(context: ExtractionContext): ExtractionOutput {
    const output = emptyExtraction();
    const service = context.service;

    if (!service) {
      return output;
    }

    const scriptKind = /\.(?:tsx|jsx)$/u.test(context.filePath)
      ? ts.ScriptKind.TSX
      : /\.(?:ts|mts|cts)$/u.test(context.filePath)
        ? ts.ScriptKind.TS
        : ts.ScriptKind.JS;

    const source = ts.createSourceFile(
      context.filePath,
      context.source,
      ts.ScriptTarget.Latest,
      false,
      scriptKind
    );

    const constants = collectConstants(source);
    const routers = collectRouters(source, constants);
    const axiosInstances = new Map<string, string>();

    this.extractServerRoutes(context, source, constants, routers, output);
    this.extractNestRoutes(context, source, output);
    this.extractClients(context, source, constants, axiosInstances, output);
    this.extractEvents(context, source, constants, output);

    return output;
  }

  private extractServerRoutes(
    context: ExtractionContext,
    source: ts.SourceFile,
    constants: ReadonlyMap<string, string>,
    routers: RouterInfo,
    output: ExtractionOutput
  ): void {
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
        const receiver = node.expression.expression;
        const method = node.expression.name.text.toLowerCase();

        if (ROUTE_METHODS.has(method) && ts.isIdentifier(receiver)) {
          const rawPath = staticStringOf(node.arguments[0], constants);

          if (rawPath !== null && rawPath.startsWith('/') && routers.routers.has(receiver.text)) {
            const handler = node.arguments[1];
            const handlerName =
              handler && ts.isIdentifier(handler)
                ? handler.text
                : handler && ts.isPropertyAccessExpression(handler)
                  ? handler.name.text
                  : undefined;

            const prefix = resolveRouterPrefix(receiver.text, routers, new Set());

            output.routes.push({
              protocol: 'http',
              serviceId: context.service!.id,
              method: method.toUpperCase() as HttpMethod,
              path: joinHttpPaths(prefix, rawPath),
              rawPath,
              filePath: context.filePath,
              line: lineOf(source, node),
              ...(handlerName ? { handlerName } : {}),
              framework: 'express',
            });
          }
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(source);
  }

  private extractNestRoutes(
    context: ExtractionContext,
    source: ts.SourceFile,
    output: ExtractionOutput
  ): void {
    const visit = (node: ts.Node): void => {
      if (ts.isClassDeclaration(node)) {
        const prefix = classControllerPrefix(node);
        const className = node.name?.text;

        for (const member of node.members) {
          if (!ts.isMethodDeclaration(member)) {
            continue;
          }
          const decorators = ts.canHaveDecorators(member) ? (ts.getDecorators(member) ?? []) : [];

          for (const decorator of decorators) {
            const expression = decorator.expression;
            if (!ts.isCallExpression(expression) || !ts.isIdentifier(expression.expression)) {
              continue;
            }
            const httpMethod = NEST_METHODS[expression.expression.text];
            if (!httpMethod) {
              continue;
            }
            const raw = stringLiteralValue(expression.arguments[0]) ?? '/';
            if (!raw.startsWith('/')) {
              continue;
            }
            const memberName = ts.isIdentifier(member.name) ? member.name.text : undefined;

            output.routes.push({
              protocol: 'http',
              serviceId: context.service!.id,
              method: httpMethod,
              path: joinHttpPaths(prefix, raw),
              rawPath: raw,
              filePath: context.filePath,
              line: lineOf(source, member),
              ...(className && memberName
                ? { handlerName: `${className}.${memberName}` }
                : memberName
                  ? { handlerName: memberName }
                  : {}),
              framework: 'nestjs',
            });
          }
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(source);
  }

  private extractClients(
    context: ExtractionContext,
    source: ts.SourceFile,
    constants: ReadonlyMap<string, string>,
    axiosInstances: Map<string, string>,
    output: ExtractionOutput
  ): void {
    const collectAxios = (node: ts.Node): void => {
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.initializer &&
        ts.isCallExpression(node.initializer) &&
        ts.isPropertyAccessExpression(node.initializer.expression)
      ) {
        const access = node.initializer.expression;
        if (
          ts.isIdentifier(access.expression) &&
          access.expression.text === 'axios' &&
          access.name.text === 'create'
        ) {
          const options = node.initializer.arguments[0];
          if (options && ts.isObjectLiteralExpression(options)) {
            const resolved = staticStringOf(objectProperty(options, 'baseURL'), constants);
            if (resolved) {
              axiosInstances.set(node.name.text, resolved);
            }
          }
        }
      }
      ts.forEachChild(node, collectAxios);
    };
    collectAxios(source);

    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node)) {
        this.handleClientCall(context, source, constants, axiosInstances, node, output);
      }
      ts.forEachChild(node, visit);
    };

    visit(source);
  }

  private handleClientCall(
    context: ExtractionContext,
    source: ts.SourceFile,
    constants: ReadonlyMap<string, string>,
    axiosInstances: Map<string, string>,
    node: ts.CallExpression,
    output: ExtractionOutput
  ): void {
    const line = lineOf(source, node);
    const callerSymbolId = context.callerSymbolFor(line);

    const emit = (
      method: HttpMethod | 'UNKNOWN',
      target: string | null,
      rawTarget: string,
      baseUrl: string | undefined,
      framework: string
    ): void => {
      const call: HttpClientCall = {
        protocol: 'http',
        target: {
          protocol: 'http',
          method,
          path: target,
          rawTarget: redactUrl(rawTarget),
          ...(baseUrl ? { baseUrl: redactUrl(baseUrl) } : {}),
        },
        filePath: context.filePath,
        line,
        ...(callerSymbolId ? { callerSymbolId } : {}),
        ...(baseUrl ? { baseUrl: redactUrl(baseUrl) } : {}),
        framework,
      };
      output.clients.push(call);
    };

    if (ts.isIdentifier(node.expression) && node.expression.text === 'fetch') {
      const raw = staticStringOf(node.arguments[0], constants);
      const options = node.arguments[1];
      let method: HttpMethod | 'UNKNOWN' = 'GET';

      if (options && ts.isObjectLiteralExpression(options)) {
        const methodValue = staticStringOf(objectProperty(options, 'method'), constants);
        if (methodValue && isHttpMethod(methodValue)) {
          method = methodValue.toUpperCase() as HttpMethod;
        }
      }

      emit(method, raw, raw ?? '<dynamic>', undefined, 'fetch');
      return;
    }

    if (!ts.isPropertyAccessExpression(node.expression)) {
      return;
    }

    const receiver = node.expression.expression;
    const methodName = node.expression.name.text.toLowerCase();

    if (!CLIENT_METHODS.has(methodName)) {
      return;
    }

    if (ts.isIdentifier(receiver) && receiver.text === 'axios') {
      const raw = staticStringOf(node.arguments[0], constants);
      const method = methodName === 'request' ? 'GET' : (methodName.toUpperCase() as HttpMethod);
      emit(method, raw, raw ?? '<dynamic>', undefined, 'axios');
      return;
    }

    if (ts.isIdentifier(receiver) && axiosInstances.has(receiver.text)) {
      const raw = staticStringOf(node.arguments[0], constants);
      const method = methodName === 'request' ? 'GET' : (methodName.toUpperCase() as HttpMethod);
      emit(method, raw, raw ?? '<dynamic>', axiosInstances.get(receiver.text), 'axios');
    }
  }

  private extractEvents(
    context: ExtractionContext,
    source: ts.SourceFile,
    constants: ReadonlyMap<string, string>,
    output: ExtractionOutput
  ): void {
    const seen = new Set<string>();

    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
        const name = node.expression.name.text.toLowerCase();
        const isEmit = EMIT_METHODS.has(name);
        const isListen = LISTEN_METHODS.has(name);

        if (isEmit || isListen) {
          const rawChannel = staticStringOf(node.arguments[0], constants);
          /*
           * A channel that cannot be proven statically is kept as an empty
           * marker so the linker reports it as an unresolved channel instead of
           * silently dropping it.
           */
          const channel =
            rawChannel !== null && rawChannel.length > 0 && !rawChannel.includes(' ')
              ? rawChannel
              : '';
          {
            const line = lineOf(source, node);
            const callerSymbolId = context.callerSymbolFor(line);
            const receiver = node.expression.expression;
            const provider =
              ts.isIdentifier(receiver) && /socket|io|ws/iu.test(receiver.text)
                ? 'socket.io'
                : 'node';

            const key = `${provider}:${channel}:${isEmit ? 'emit' : 'listen'}:${callerSymbolId ?? line}`;
            if (seen.has(key)) {
              return;
            }
            seen.add(key);

            const declaration: EventDeclaration = {
              protocol: 'event',
              serviceId: context.service!.id,
              provider,
              channel,
              direction: isEmit ? 'emit' : 'listen',
              filePath: context.filePath,
              line,
              ...(callerSymbolId ? { callerSymbolId } : {}),
              framework: provider,
            };
            output.events.push(declaration);
          }
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(source);
  }
}
