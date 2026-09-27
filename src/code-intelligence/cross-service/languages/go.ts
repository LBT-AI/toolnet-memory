import type { Node } from 'web-tree-sitter';

import { fieldOf, type TreeSitterRuntime } from '../../parsers/tree-sitter/runtime.js';
import {
  emptyExtraction,
  type ExtractionContext,
  type ExtractionOutput,
  type ProtocolExtractor,
} from '../extractor.js';
import { joinHttpPaths, redactUrl, type HttpMethod } from '../endpoint-normalizer.js';
import type { EventDeclaration, HttpClientCall, HttpRouteDeclaration } from '../types.js';

const GO_ROUTE_METHODS: Record<string, HttpMethod> = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
  OPTIONS: 'OPTIONS',
  HEAD: 'HEAD',
  Get: 'GET',
  Post: 'POST',
  Put: 'PUT',
  Patch: 'PATCH',
  Delete: 'DELETE',
};

const HANDLE_FUNCS = new Set(['HandleFunc', 'Handle']);

const CLIENT_RECEIVERS = new Set(['http', 'client', 'c', 'session']);

const EMIT_METHODS = new Set(['Publish', 'Emit', 'Send']);
const LISTEN_METHODS = new Set(['Subscribe', 'On', 'Listen']);

function safeText(node: Node, source: string): string {
  return source.slice(node.startIndex, node.endIndex);
}

function lineOf(node: Node, source: string): number {
  return [...source.slice(0, node.startIndex).matchAll(/\r?\n/gu)].length + 1;
}

function walk(node: Node, visit: (candidate: Node) => void): void {
  visit(node);
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child) {
      walk(child, visit);
    }
  }
}

function directChildren(node: Node): Node[] {
  const children: Node[] = [];
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child) {
      children.push(child);
    }
  }
  return children;
}

function unwrapString(node: Node | null, source: string): string | null {
  if (!node) {
    return null;
  }
  if (node.type === 'interpreted_string_literal' || node.type === 'raw_string_literal') {
    return safeText(node, source).replace(/^[`"]|[`"]$/gu, '');
  }
  return null;
}

interface Selector {
  operand: string;
  field: string;
}

function selectorOf(node: Node, source: string): Selector | null {
  if (node.type !== 'selector_expression') {
    return null;
  }
  const operandNode = fieldOf(node, 'operand');
  const fieldNode = fieldOf(node, 'field');
  if (!operandNode || !fieldNode) {
    return null;
  }
  return { operand: safeText(operandNode, source), field: safeText(fieldNode, source) };
}

function callTarget(call: Node): Node | null {
  return fieldOf(call, 'function');
}

function callArguments(call: Node): Node | null {
  return fieldOf(call, 'arguments');
}

function argumentList(call: Node): Node[] {
  const list = callArguments(call);
  if (!list) {
    return [];
  }
  return directChildren(list).filter(
    (child) => child.type !== ',' && child.type !== '(' && child.type !== ')'
  );
}

function groupPrefixes(root: Node, source: string): Map<string, string> {
  const prefixes = new Map<string, string>();

  walk(root, (node) => {
    if (node.type !== 'short_var_declaration' && node.type !== 'assignment_statement') {
      return;
    }
    const left = fieldOf(node, 'left') ?? directChildren(node)[0] ?? null;
    const right = fieldOf(node, 'right') ?? directChildren(node).at(-1) ?? null;
    if (!left || !right || left.type !== 'expression_list' || right.type !== 'expression_list') {
      return;
    }
    const leftExpr = directChildren(left)[0];
    const rightExpr = directChildren(right)[0];
    if (
      !leftExpr ||
      !rightExpr ||
      leftExpr.type !== 'identifier' ||
      rightExpr.type !== 'call_expression'
    ) {
      return;
    }
    const target = callTarget(rightExpr);
    if (!target) {
      return;
    }
    const selector = selectorOf(target, source);
    if (!selector || selector.field !== 'Group') {
      return;
    }
    const args = argumentList(rightExpr);
    const prefix = unwrapString(args[0] ?? null, source);
    if (prefix && prefix.startsWith('/')) {
      prefixes.set(safeText(leftExpr, source), prefix);
    }
  });

  return prefixes;
}

/**
 * Go extractor (net/http, Gin/Echo/Fiber style routers, http.Client callers,
 * pub/sub style event channels) built on the tree-sitter grammar.
 */
export class GoCrossServiceExtractor implements ProtocolExtractor {
  readonly id = 'cross-service-go';
  readonly language = 'go';

  constructor(private readonly runtime: TreeSitterRuntime) {}

  supports(filePath: string): boolean {
    return /\.go$/u.test(filePath);
  }

  async extract(context: ExtractionContext): Promise<ExtractionOutput> {
    const output = emptyExtraction();
    const service = context.service;

    if (!service) {
      return output;
    }

    const parser = await this.runtime.getParser('go');
    if (!parser) {
      output.unsupportedFrameworks.push('go-parser-unavailable');
      return output;
    }

    const tree = parser.parse(context.source);
    if (!tree) {
      output.unsupportedFrameworks.push('go-parse-failed');
      return output;
    }

    return this.extractFromTree(context, tree.rootNode);
  }

  extractFromTree(context: ExtractionContext, root: Node): ExtractionOutput {
    const output = emptyExtraction();

    if (!context.service) {
      return output;
    }

    this.extractRoutes(context, root, output);
    this.extractClients(context, root, output);
    this.extractEvents(context, root, output);

    return output;
  }

  private extractRoutes(context: ExtractionContext, root: Node, output: ExtractionOutput): void {
    const source = context.source;
    const prefixes = groupPrefixes(root, source);

    walk(root, (node) => {
      if (node.type !== 'call_expression') {
        return;
      }

      const target = callTarget(node);
      if (!target) {
        return;
      }

      const selector = selectorOf(target, source);
      if (!selector) {
        return;
      }

      const args = argumentList(node);

      if (selector.operand === 'http' && HANDLE_FUNCS.has(selector.field)) {
        const rawPath = unwrapString(args[0] ?? null, source);
        if (rawPath && rawPath.startsWith('/')) {
          output.routes.push(this.route(context, node, 'GET', rawPath, 'net/http'));
        }
        return;
      }

      const method = GO_ROUTE_METHODS[selector.field];
      if (!method) {
        return;
      }

      const rawPath = unwrapString(args[0] ?? null, source);
      if (!rawPath || !rawPath.startsWith('/')) {
        return;
      }

      const prefix = prefixes.get(selector.operand);
      const handlerNode = args[1];
      const declaration = this.route(context, node, method, rawPath, 'gin', prefix);
      if (handlerNode && handlerNode.type === 'identifier') {
        declaration.handlerName = safeText(handlerNode, source);
      }
      output.routes.push(declaration);
    });
  }

  private route(
    context: ExtractionContext,
    node: Node,
    method: HttpMethod,
    rawPath: string,
    framework: string,
    prefix?: string
  ): HttpRouteDeclaration {
    return {
      protocol: 'http',
      serviceId: context.service!.id,
      method,
      path: joinHttpPaths(prefix, rawPath),
      rawPath,
      filePath: context.filePath,
      line: lineOf(node, context.source),
      framework,
    };
  }

  private extractClients(context: ExtractionContext, root: Node, output: ExtractionOutput): void {
    const source = context.source;

    walk(root, (node) => {
      if (node.type !== 'call_expression') {
        return;
      }

      const target = callTarget(node);
      if (!target) {
        return;
      }

      const selector = selectorOf(target, source);
      if (!selector) {
        return;
      }

      const method = GO_ROUTE_METHODS[selector.field];
      const isHttpPackage =
        selector.operand === 'http' &&
        (selector.field === 'Get' || selector.field === 'Post' || selector.field === 'Do');
      const isClientCall = CLIENT_RECEIVERS.has(selector.operand.toLowerCase()) && Boolean(method);

      if (!isHttpPackage && !isClientCall) {
        return;
      }

      const args = argumentList(node);
      const raw = unwrapString(args[0] ?? null, source);
      const line = lineOf(node, source);
      const callerSymbolId = context.callerSymbolFor(line);

      const resolvedMethod: HttpMethod | 'UNKNOWN' = isHttpPackage
        ? selector.field === 'Post'
          ? 'POST'
          : selector.field === 'Get'
            ? 'GET'
            : 'UNKNOWN'
        : (method as HttpMethod);

      output.clients.push({
        protocol: 'http',
        target: {
          protocol: 'http',
          method: resolvedMethod,
          path: raw,
          rawTarget: redactUrl(raw ?? '<dynamic>'),
        },
        filePath: context.filePath,
        line,
        ...(callerSymbolId ? { callerSymbolId } : {}),
        framework: 'net/http',
      } satisfies HttpClientCall);
    });
  }

  private extractEvents(context: ExtractionContext, root: Node, output: ExtractionOutput): void {
    const source = context.source;
    const seen = new Set<string>();

    walk(root, (node) => {
      if (node.type !== 'call_expression') {
        return;
      }

      const target = callTarget(node);
      const selector = target ? selectorOf(target, source) : null;
      if (!selector) {
        return;
      }

      const isEmit = EMIT_METHODS.has(selector.field);
      const isListen = LISTEN_METHODS.has(selector.field);
      if (!isEmit && !isListen) {
        return;
      }

      const rawChannel = unwrapString(argumentList(node)[0] ?? null, source);
      const channel = rawChannel && !rawChannel.includes(' ') ? rawChannel : '';

      const line = lineOf(node, source);
      const callerSymbolId = context.callerSymbolFor(line);
      const provider = /kafka/iu.test(selector.operand.toLowerCase()) ? 'kafka' : 'go';

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
    });
  }
}
