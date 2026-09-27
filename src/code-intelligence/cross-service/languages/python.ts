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

const HTTP_METHOD_NAMES: Record<string, HttpMethod> = {
  get: 'GET',
  post: 'POST',
  put: 'PUT',
  patch: 'PATCH',
  delete: 'DELETE',
  options: 'OPTIONS',
  head: 'HEAD',
};

const REQUEST_RECEIVERS = new Set(['requests', 'httpx', 'session', 'client', 'aiohttp', 'http']);

const EMIT_METHODS = new Set(['emit', 'publish', 'send_event']);
const LISTEN_METHODS = new Set(['on', 'once', 'subscribe', 'listen', 'add_listener']);

function lineOf(node: Node, source: string): number {
  return [...source.slice(0, node.startIndex).matchAll(/\r?\n/gu)].length + 1;
}

function textOf(node: Node, source: string): string {
  return source.slice(node.startIndex, node.endIndex);
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

  if (node.type === 'string') {
    const raw = textOf(node, source);
    const match = /^(?:[fFrRbBuU]{0,2})?("""|'''|"|')([\s\S]*)\1$/u.exec(raw);
    return match ? match[2] : null;
  }

  if (node.type === 'concatenated_string') {
    let value = '';
    for (const child of directChildren(node)) {
      const part = unwrapString(child, source);
      if (part === null) {
        return null;
      }
      value += part;
    }
    return value;
  }

  return null;
}

function attributeParts(node: Node, source: string): string[] {
  if (node.type === 'identifier') {
    return [textOf(node, source)];
  }
  if (node.type === 'attribute') {
    const object = fieldOf(node, 'object');
    const attribute = fieldOf(node, 'attribute');
    if (object && attribute) {
      return [...attributeParts(object, source), textOf(attribute, source)];
    }
  }
  return [];
}

interface KeywordArgument {
  name: string;
  value: Node;
}

function keywordArguments(argumentList: Node, source: string): KeywordArgument[] {
  const results: KeywordArgument[] = [];

  for (const child of directChildren(argumentList)) {
    if (child.type !== 'keyword_argument') {
      continue;
    }
    const name = fieldOf(child, 'name');
    const value = fieldOf(child, 'value');
    if (name && value && name.type === 'identifier') {
      results.push({ name: textOf(name, source), value });
    }
  }

  return results;
}

function positionalArguments(argumentList: Node): Node[] {
  const results: Node[] = [];

  for (const child of directChildren(argumentList)) {
    if (
      child.type === 'identifier' ||
      child.type === 'string' ||
      child.type === 'concatenated_string' ||
      child.type === 'attribute' ||
      child.type === 'call'
    ) {
      results.push(child);
    }
  }

  return results;
}

function assignmentTargets(root: Node, source: string): Map<string, Node> {
  const targets = new Map<string, Node>();

  walk(root, (node) => {
    if (node.type !== 'assignment') {
      return;
    }
    const left = fieldOf(node, 'left');
    const right = fieldOf(node, 'right');
    if (left && right && left.type === 'identifier') {
      targets.set(textOf(left, source), right);
    }
  });

  return targets;
}

function routerPrefixes(root: Node, source: string): Map<string, string> {
  const prefixes = new Map<string, string>();

  for (const [name, value] of assignmentTargets(root, source)) {
    if (value.type !== 'call') {
      continue;
    }
    const functionNode = fieldOf(value, 'function');
    if (!functionNode) {
      continue;
    }
    const parts = attributeParts(functionNode, source);
    const callee = parts.at(-1) ?? '';
    if (!/^(?:APIRouter|Blueprint|Router)$/u.test(callee)) {
      continue;
    }
    const argumentList = fieldOf(value, 'arguments');
    if (!argumentList) {
      continue;
    }
    for (const keyword of keywordArguments(argumentList, source)) {
      if (keyword.name !== 'prefix') {
        continue;
      }
      const prefix = unwrapString(keyword.value, source);
      if (prefix) {
        prefixes.set(name, prefix);
      }
    }
  }

  return prefixes;
}

interface DecoratorRoute {
  method: HttpMethod;
  rawPath: string;
}

function decoratorRoute(decorator: Node, source: string): DecoratorRoute | null {
  let call: Node | null = null;
  walk(decorator, (candidate) => {
    if (call) {
      return;
    }
    if (candidate.type === 'call') {
      call = candidate;
    }
  });

  if (!call) {
    return null;
  }

  const callNode: Node = call;
  const functionNode = fieldOf(callNode, 'function');
  if (!functionNode || functionNode.type !== 'attribute') {
    return null;
  }

  const parts = attributeParts(functionNode, source);
  if (parts.length < 2) {
    return null;
  }

  const decoratorName = parts.at(-1)!.toLowerCase();
  const argumentList = fieldOf(callNode, 'arguments');
  if (!argumentList) {
    return null;
  }

  const positional = positionalArguments(argumentList);

  if (decoratorName === 'route') {
    const rawPath = unwrapString(positional[0] ?? null, source);
    if (rawPath === null || !rawPath.startsWith('/')) {
      return null;
    }
    const methodsKw = keywordArguments(argumentList, source).find(
      (item) => item.name === 'methods'
    );
    const methods: HttpMethod[] = [];
    if (methodsKw) {
      walk(methodsKw.value, (element) => {
        const value = unwrapString(element, source);
        const mapped = value ? HTTP_METHOD_NAMES[value.toLowerCase()] : undefined;
        if (mapped && !methods.includes(mapped)) {
          methods.push(mapped);
        }
      });
    }
    return { method: methods[0] ?? 'GET', rawPath };
  }

  const method = HTTP_METHOD_NAMES[decoratorName];
  if (!method) {
    return null;
  }

  const rawPath = unwrapString(positional[0] ?? null, source);
  if (rawPath === null || !rawPath.startsWith('/')) {
    return null;
  }

  return { method, rawPath };
}

/**
 * Python extractor (FastAPI / Flask decorators, requests/httpx clients,
 * pub/sub style event channels) built on the tree-sitter grammar.
 */
export class PythonCrossServiceExtractor implements ProtocolExtractor {
  readonly id = 'cross-service-python';
  readonly language = 'python';

  constructor(private readonly runtime: TreeSitterRuntime) {}

  supports(filePath: string): boolean {
    return /\.py$/u.test(filePath);
  }

  async extract(context: ExtractionContext): Promise<ExtractionOutput> {
    const output = emptyExtraction();
    const service = context.service;

    if (!service) {
      return output;
    }

    const parser = await this.runtime.getParser('python');
    if (!parser) {
      output.unsupportedFrameworks.push('python-parser-unavailable');
      return output;
    }

    const tree = parser.parse(context.source);
    if (!tree) {
      output.unsupportedFrameworks.push('python-parse-failed');
      return output;
    }

    return this.extractFromTree(context, tree.rootNode);
  }

  extractFromTree(context: ExtractionContext, root: Node): ExtractionOutput {
    const output = emptyExtraction();

    if (!context.service) {
      return output;
    }

    const prefixes = routerPrefixes(root, context.source);

    this.extractRoutes(context, root, prefixes, output);
    this.extractClients(context, root, output);
    this.extractEvents(context, root, output);

    return output;
  }

  private extractRoutes(
    context: ExtractionContext,
    root: Node,
    prefixes: Map<string, string>,
    output: ExtractionOutput
  ): void {
    const source = context.source;

    walk(root, (node) => {
      if (node.type !== 'decorated_definition') {
        return;
      }

      const definition = fieldOf(node, 'definition');
      const decorators = directChildren(node).filter(
        (child) => child.type === 'decorator' || child.type === 'decorator_definition'
      );

      const nameNode = definition ? fieldOf(definition, 'name') : null;
      const handler = nameNode && nameNode.type === 'identifier' ? textOf(nameNode, source) : '';

      for (const decorator of decorators) {
        const route = decoratorRoute(decorator, source);
        if (!route) {
          continue;
        }

        const receiver = this.decoratorReceiver(decorator, source);
        const prefix = receiver ? prefixes.get(receiver) : undefined;

        const declaration: HttpRouteDeclaration = {
          protocol: 'http',
          serviceId: context.service!.id,
          method: route.method,
          path: joinHttpPaths(prefix, route.rawPath),
          rawPath: route.rawPath,
          filePath: context.filePath,
          line: lineOf(definition ?? node, source),
          ...(handler ? { handlerName: handler } : {}),
          framework: 'fastapi',
        };
        output.routes.push(declaration);
      }
    });
  }

  private decoratorReceiver(decorator: Node, source: string): string | undefined {
    let receiver: string | undefined;

    walk(decorator, (node) => {
      if (receiver !== undefined || node.type !== 'attribute') {
        return;
      }
      const parts = attributeParts(node, source);
      if (parts.length >= 2) {
        receiver = parts.slice(0, -1).join('.');
      }
    });

    return receiver;
  }

  private extractClients(context: ExtractionContext, root: Node, output: ExtractionOutput): void {
    const source = context.source;

    walk(root, (node) => {
      if (node.type !== 'call') {
        return;
      }

      const functionNode = fieldOf(node, 'function');
      if (!functionNode || functionNode.type !== 'attribute') {
        return;
      }

      const parts = attributeParts(functionNode, source);
      if (parts.length < 2) {
        return;
      }

      const methodName = parts.at(-1)!.toLowerCase();
      const receiver = parts.at(-2)!.toLowerCase();
      if (!REQUEST_RECEIVERS.has(receiver)) {
        return;
      }

      const argumentList = fieldOf(node, 'arguments');
      if (!argumentList) {
        return;
      }

      const positional = positionalArguments(argumentList);
      const line = lineOf(node, source);
      const callerSymbolId = context.callerSymbolFor(line);

      let method: HttpMethod | 'UNKNOWN' = HTTP_METHOD_NAMES[methodName] ?? 'UNKNOWN';
      let targetNode: Node | null = positional[0] ?? null;

      if (methodName === 'request' && positional.length >= 2) {
        const explicit = unwrapString(positional[0], source);
        const mapped = explicit ? HTTP_METHOD_NAMES[explicit.toLowerCase()] : undefined;
        if (mapped) {
          method = mapped;
        }
        targetNode = positional[1] ?? null;
      }

      const raw = unwrapString(targetNode, source);
      output.clients.push({
        protocol: 'http',
        target: {
          protocol: 'http',
          method,
          path: raw,
          rawTarget: redactUrl(raw ?? '<dynamic>'),
        },
        filePath: context.filePath,
        line,
        ...(callerSymbolId ? { callerSymbolId } : {}),
        framework: 'requests',
      } satisfies HttpClientCall);
    });
  }

  private extractEvents(context: ExtractionContext, root: Node, output: ExtractionOutput): void {
    const source = context.source;
    const seen = new Set<string>();

    walk(root, (node) => {
      if (node.type !== 'call') {
        return;
      }

      const functionNode = fieldOf(node, 'function');
      if (!functionNode || functionNode.type !== 'attribute') {
        return;
      }

      const parts = attributeParts(functionNode, source);
      if (parts.length < 2) {
        return;
      }

      const methodName = parts.at(-1)!.toLowerCase();
      const isEmit = EMIT_METHODS.has(methodName);
      const isListen = LISTEN_METHODS.has(methodName);
      if (!isEmit && !isListen) {
        return;
      }

      const argumentList = fieldOf(node, 'arguments');
      if (!argumentList) {
        return;
      }

      const rawChannel = unwrapString(positionalArguments(argumentList)[0] ?? null, source);
      const channel = rawChannel && !rawChannel.includes(' ') ? rawChannel : '';

      const line = lineOf(node, source);
      const callerSymbolId = context.callerSymbolFor(line);
      const receiver = parts.at(-2)!.toLowerCase();
      const provider = receiver === 'client' || receiver === 'pubsub' ? 'redis' : 'python';

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
