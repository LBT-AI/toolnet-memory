/*
 * Phase 74 — TGQL parser.
 *
 * Recursive descent over the token stream. Produces a small AST that the
 * validator and planner operate on; the query string is never executed and is
 * never converted into SQL or JavaScript.
 */

import { tokenize, type Token } from './lexer.js';

import { MAX_EXPRESSION_DEPTH, MAX_IN_VALUES } from './limits.js';

import {
  QueryError,
  type MatchPattern,
  type NodePattern,
  type EdgePattern,
  type PatternElement,
  type ProjectionItem,
  type OrderByItem,
  type QueryAst,
  type QueryExpression,
  type QueryOperand,
  type QueryNodeType,
  type QueryEdgeType,
} from './types.js';

class Parser {
  private index = 0;

  constructor(private readonly tokens: readonly Token[]) {}

  private get current(): Token {
    return this.tokens[this.index]!;
  }

  private advance(): Token {
    const token = this.current;
    if (token.kind !== 'eof') {
      this.index += 1;
    }
    return token;
  }

  private fail(message: string, token: Token = this.current): never {
    throw new QueryError('QUERY_SYNTAX_ERROR', message, {
      line: token.line,
      column: token.column,
    });
  }

  private isKeyword(value: string): boolean {
    return this.current.kind === 'keyword' && this.current.value === value;
  }

  /*
   * Read through a method so TypeScript cannot carry a stale literal
   * narrowing of `current.kind` across the many lookahead calls above.
   */
  private atNumber(): boolean {
    return this.current.kind === 'number';
  }

  private matchKeyword(value: string): boolean {
    if (this.isKeyword(value)) {
      this.advance();
      return true;
    }
    return false;
  }

  private expectKeyword(value: string): void {
    if (!this.matchKeyword(value)) {
      this.fail(`Expected ${value}`);
    }
  }

  private matchSymbol(value: string): boolean {
    if (this.current.kind === 'symbol' && this.current.value === value) {
      this.advance();
      return true;
    }
    return false;
  }

  private expectSymbol(value: string): void {
    if (!this.matchSymbol(value)) {
      this.fail(`Expected "${value}"`);
    }
  }

  private expectIdentifier(): string {
    if (this.current.kind !== 'identifier') {
      this.fail('Expected identifier');
    }
    return this.advance().value;
  }

  parse(): QueryAst {
    if (this.isKeyword('MATCH') === false) {
      this.fail('Query must start with MATCH');
    }

    const match: MatchPattern[] = [];
    while (this.matchKeyword('MATCH')) {
      do {
        match.push(this.parsePattern());
      } while (this.matchSymbol(','));
    }

    const where = this.matchKeyword('WHERE') ? this.parseExpression(0) : undefined;

    this.expectKeyword('RETURN');
    const distinct = this.matchKeyword('DISTINCT');
    const projection = this.parseProjection();

    const orderBy: OrderByItem[] = [];
    if (this.matchKeyword('ORDER')) {
      this.expectKeyword('BY');
      do {
        orderBy.push(this.parseOrderByItem());
      } while (this.matchSymbol(','));
    }

    let limit: number | undefined;
    let skip: number | undefined;

    for (;;) {
      if (limit === undefined && this.matchKeyword('LIMIT')) {
        limit = this.parseInteger('LIMIT');
        continue;
      }
      if (skip === undefined && this.matchKeyword('SKIP')) {
        skip = this.parseInteger('SKIP');
        continue;
      }
      break;
    }

    if (this.current.kind !== 'eof') {
      this.fail(`Unexpected token "${this.current.value || this.current.kind}"`);
    }

    return {
      distinct,
      match,
      ...(where ? { where } : {}),
      projection,
      orderBy,
      ...(limit !== undefined ? { limit } : {}),
      ...(skip !== undefined ? { skip } : {}),
    };
  }

  private parseInteger(clause: string): number {
    if (this.current.kind !== 'number') {
      this.fail(`${clause} requires an integer value`);
    }
    const raw = this.advance().value;
    if (!/^-?[0-9]+$/u.test(raw)) {
      this.fail(`${clause} requires an integer value`);
    }
    return Number.parseInt(raw, 10);
  }

  private parsePattern(): MatchPattern {
    let pathAlias: string | undefined;

    if (this.current.kind === 'identifier' && this.tokens[this.index + 1]?.value === '=') {
      pathAlias = this.advance().value;
      this.advance();
    }

    const elements: PatternElement[] = [];

    const first = this.parseNodePattern();
    elements.push({ node: first });

    for (;;) {
      const edge = this.tryParseEdgePattern();
      if (!edge) {
        break;
      }
      elements[elements.length - 1]!.edge = edge;
      elements.push({ node: this.parseNodePattern() });
    }

    return { ...(pathAlias ? { pathAlias } : {}), elements };
  }

  private parseNodePattern(): NodePattern {
    this.expectSymbol('(');

    let alias: string | undefined;
    let type: QueryNodeType | undefined;

    if (this.current.kind === 'identifier') {
      alias = this.advance().value;
    }

    if (this.matchSymbol(':')) {
      const name = this.expectIdentifier();
      type = name as QueryNodeType;
    }

    this.expectSymbol(')');

    return {
      ...(alias ? { alias } : {}),
      ...(type ? { type } : {}),
      anonymous: alias === undefined,
    };
  }

  private tryParseEdgePattern(): EdgePattern | undefined {
    let direction: EdgePattern['direction'];
    let leading = false;

    if (this.current.kind === 'symbol' && this.current.value === '-') {
      this.advance();
      direction = 'undirected';
    } else if (this.current.kind === 'symbol' && this.current.value === '<') {
      this.advance();
      if (!this.matchSymbol('-')) {
        this.index -= 1;
        return undefined;
      }
      direction = 'incoming';
      leading = true;
    } else {
      return undefined;
    }

    if (!this.matchSymbol('[')) {
      this.index -= leading ? 2 : 1;
      return undefined;
    }

    const types: QueryEdgeType[] = [];

    if (this.matchSymbol(':')) {
      types.push(this.expectIdentifier() as QueryEdgeType);
      while (this.matchSymbol('|')) {
        if (this.matchSymbol(':')) {
          types.push(this.expectIdentifier() as QueryEdgeType);
        } else {
          types.push(this.expectIdentifier() as QueryEdgeType);
        }
      }
    }

    let minHops = 1;
    let maxHops = 1;
    let variableLength = false;

    if (this.matchSymbol('*')) {
      variableLength = true;
      minHops = 1;
      maxHops = 1;

      let bounded = false;

      if (this.atNumber()) {
        minHops = this.parseInteger('Variable-length path');
        maxHops = minHops;
        bounded = true;
      }

      if (this.matchSymbol('..')) {
        if (this.atNumber()) {
          maxHops = this.parseInteger('Variable-length path');
          bounded = true;
        } else {
          this.fail('Unbounded variable-length paths are not allowed');
        }
      }

      /* `[:CALLS*]` has no bound at all and must never be accepted. */
      if (!bounded) {
        throw new QueryError(
          'QUERY_LIMIT_EXCEEDED',
          'Variable-length paths must declare a bound, e.g. [:CALLS*1..3]'
        );
      }
    }

    this.expectSymbol(']');

    if (!leading) {
      if (this.matchSymbol('->')) {
        direction = 'outgoing';
      } else if (this.matchSymbol('-')) {
        direction = 'undirected';
      } else {
        this.fail('Expected "->" or "-" to close the relationship');
      }
    } else {
      this.expectSymbol('-');
    }

    return { types, direction, minHops, maxHops, variableLength };
  }

  private parseProjection(): ProjectionItem[] {
    const items: ProjectionItem[] = [];

    const parseItem = (): ProjectionItem => {
      const variable = this.expectIdentifier();
      let property: string | undefined;

      if (this.matchSymbol('.')) {
        property = this.expectIdentifier();
      }

      let alias = property ? `${variable}.${property}` : variable;

      if (this.matchKeyword('AS')) {
        alias = this.expectIdentifier();
      }

      return { variable, ...(property ? { property } : {}), alias };
    };

    items.push(parseItem());
    while (this.matchSymbol(',')) {
      items.push(parseItem());
    }

    return items;
  }

  private parseOrderByItem(): OrderByItem {
    const variable = this.expectIdentifier();
    let property: string | undefined;

    if (this.matchSymbol('.')) {
      property = this.expectIdentifier();
    }

    let direction: OrderByItem['direction'] = 'ASC';
    if (this.matchKeyword('DESC')) {
      direction = 'DESC';
    } else {
      this.matchKeyword('ASC');
    }

    return { variable, ...(property ? { property } : {}), direction };
  }

  private checkDepth(depth: number): void {
    if (depth > MAX_EXPRESSION_DEPTH) {
      throw new QueryError('QUERY_TOO_COMPLEX', 'WHERE expression nesting is too deep');
    }
  }

  /* OR binds loosest, then AND, then NOT — deterministic C-like precedence. */
  private parseExpression(depth: number): QueryExpression {
    this.checkDepth(depth);

    let left = this.parseAnd(depth);

    while (this.matchKeyword('OR')) {
      const right = this.parseAnd(depth + 1);
      left =
        left.kind === 'logical' && left.op === 'OR'
          ? { kind: 'logical', op: 'OR', operands: [...left.operands, right] }
          : { kind: 'logical', op: 'OR', operands: [left, right] };
    }

    return left;
  }

  private parseAnd(depth: number): QueryExpression {
    this.checkDepth(depth);

    let left = this.parseNot(depth);

    while (this.matchKeyword('AND')) {
      const right = this.parseNot(depth + 1);
      left =
        left.kind === 'logical' && left.op === 'AND'
          ? { kind: 'logical', op: 'AND', operands: [...left.operands, right] }
          : { kind: 'logical', op: 'AND', operands: [left, right] };
    }

    return left;
  }

  private parseNot(depth: number): QueryExpression {
    this.checkDepth(depth);

    if (this.matchKeyword('NOT')) {
      return { kind: 'not', operand: this.parseNot(depth + 1) };
    }

    return this.parseComparison(depth);
  }

  private parseComparison(depth: number): QueryExpression {
    if (this.matchSymbol('(')) {
      const inner = this.parseExpression(depth + 1);
      this.expectSymbol(')');
      return inner;
    }

    const left = this.parseOperand();

    if (this.matchKeyword('IS')) {
      const negated = this.matchKeyword('NOT');
      this.expectKeyword('NULL');
      return { kind: 'null', operand: left, negated };
    }

    if (this.matchKeyword('IN')) {
      this.expectSymbol('[');
      const values: QueryOperand[] = [];
      if (!this.matchSymbol(']')) {
        values.push(this.parseOperand());
        while (this.matchSymbol(',')) {
          if (values.length >= MAX_IN_VALUES) {
            throw new QueryError('QUERY_LIMIT_EXCEEDED', `IN list exceeds ${MAX_IN_VALUES} values`);
          }
          values.push(this.parseOperand());
        }
        this.expectSymbol(']');
      }
      return { kind: 'in', left, values };
    }

    for (const op of ['STARTS', 'ENDS'] as const) {
      if (this.isKeyword(op)) {
        this.advance();
        this.expectKeyword('WITH');
        return {
          kind: 'string',
          op: op === 'STARTS' ? 'STARTS WITH' : 'ENDS WITH',
          left,
          right: this.parseOperand(),
        };
      }
    }

    if (this.matchKeyword('CONTAINS')) {
      return { kind: 'string', op: 'CONTAINS', left, right: this.parseOperand() };
    }

    const operator = this.current;
    if (
      operator.kind === 'symbol' &&
      (operator.value === '=' ||
        operator.value === '!=' ||
        operator.value === '<' ||
        operator.value === '<=' ||
        operator.value === '>' ||
        operator.value === '>=')
    ) {
      this.advance();
      return {
        kind: 'comparison',
        op: operator.value as Extract<QueryExpression, { kind: 'comparison' }>['op'],
        left,
        right: this.parseOperand(),
      };
    }

    this.fail('Expected a comparison operator');
  }

  private parseOperand(): QueryOperand {
    const token = this.current;

    if (token.kind === 'parameter') {
      this.advance();
      return { kind: 'parameter', name: token.value };
    }

    if (token.kind === 'string') {
      this.advance();
      return { kind: 'literal', value: token.value };
    }

    if (token.kind === 'number') {
      this.advance();
      return { kind: 'literal', value: Number.parseFloat(token.value) };
    }

    if (this.matchKeyword('TRUE')) {
      return { kind: 'literal', value: true };
    }

    if (this.matchKeyword('FALSE')) {
      return { kind: 'literal', value: false };
    }

    if (this.matchKeyword('NULL')) {
      return { kind: 'literal', value: null };
    }

    if (token.kind === 'identifier') {
      this.advance();
      if (this.matchSymbol('.')) {
        return { kind: 'property', variable: token.value, property: this.expectIdentifier() };
      }
      /*
       * A bare identifier is not a comparable value: comparing whole nodes is
       * not part of the supported subset, and silently comparing ids would
       * produce surprising results. Reject it instead.
       */
      this.fail('Expected a property access (variable.property)');
    }

    this.fail('Expected a value, parameter or property reference');
  }
}

export function parseQuery(source: string): { ast: QueryAst; tokens: readonly Token[] } {
  const tokens = tokenize(source);
  const ast = new Parser(tokens).parse();
  return { ast, tokens };
}
