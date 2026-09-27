/*
 * Phase 74 — TGQL lexer.
 *
 * A real tokenizer, not a regex pile. Produces location-aware tokens so the
 * validator and parser can report deterministic line/column errors.
 */

import { MAX_QUERY_LENGTH, MAX_QUERY_TOKENS } from './limits.js';
import { QueryError } from './types.js';

export type TokenKind =
  'identifier' | 'keyword' | 'string' | 'number' | 'parameter' | 'symbol' | 'eof';

export interface Token {
  kind: TokenKind;
  value: string;
  line: number;
  column: number;
}

export const KEYWORDS: readonly string[] = [
  'MATCH',
  'WHERE',
  'RETURN',
  'ORDER',
  'BY',
  'LIMIT',
  'SKIP',
  'DISTINCT',
  'AND',
  'OR',
  'NOT',
  'IN',
  'IS',
  'NULL',
  'ASC',
  'DESC',
  'AS',
  'STARTS',
  'ENDS',
  'WITH',
  'CONTAINS',
  'TRUE',
  'FALSE',
];

/**
 * Write/mutation vocabulary. These are never valid in TGQL; the validator
 * rejects them explicitly so read-only enforcement is a hard gate rather than
 * a convention.
 */
export const WRITE_KEYWORDS: readonly string[] = [
  'CREATE',
  'MERGE',
  'DELETE',
  'DETACH',
  'SET',
  'REMOVE',
  'DROP',
  'CALL',
  'LOAD',
  'CSV',
  'FOREACH',
  'UNWIND',
  'INSERT',
  'UPDATE',
  'UPSERT',
];

const READ_ONLY_KEYWORDS: readonly string[] = [
  'CREATE',
  'MERGE',
  'DELETE',
  'DETACH',
  'SET',
  'REMOVE',
  'DROP',
  'INSERT',
  'UPDATE',
  'UPSERT',
];

const UNSUPPORTED_CLAUSE_KEYWORDS: readonly string[] = ['CALL', 'LOAD', 'CSV', 'FOREACH', 'UNWIND'];

/** One authority for read-only enforcement; called per emitted keyword token. */
export function assertNoMutationToken(value: string, line: number, column: number): void {
  if (READ_ONLY_KEYWORDS.includes(value)) {
    throw new QueryError('READ_ONLY_VIOLATION', `TGQL is read-only: "${value}" is not supported`, {
      line,
      column,
    });
  }
  if (UNSUPPORTED_CLAUSE_KEYWORDS.includes(value)) {
    throw new QueryError('UNSUPPORTED_CLAUSE', `"${value}" is not a supported clause`, {
      line,
      column,
    });
  }
}

const SYMBOLS = new Set([
  '(',
  ')',
  '[',
  ']',
  '{',
  '}',
  ':',
  ',',
  '.',
  '=',
  '<',
  '>',
  '!',
  '-',
  '*',
  '$',
  ';',
  '+',
  '/',
]);

function isIdentifierStart(char: string): boolean {
  return /[A-Za-z_]/u.test(char);
}

function isIdentifierPart(char: string): boolean {
  return /[A-Za-z0-9_]/u.test(char);
}

export function tokenize(source: string): Token[] {
  if (source.length > MAX_QUERY_LENGTH) {
    throw new QueryError(
      'QUERY_LIMIT_EXCEEDED',
      `Query exceeds maximum length of ${MAX_QUERY_LENGTH} characters`
    );
  }

  const tokens: Token[] = [];
  let index = 0;
  let line = 1;
  let column = 1;

  const push = (kind: TokenKind, value: string, startLine: number, startColumn: number): void => {
    /*
     * Read-only enforcement is applied as each token is produced, so a
     * mutation clause is reported as READ_ONLY_VIOLATION instead of being
     * masked by a later lexer/parser syntax error on an unrelated character.
     */
    if (kind === 'keyword') {
      assertNoMutationToken(value, startLine, startColumn);
    }

    tokens.push({ kind, value, line: startLine, column: startColumn });
    if (tokens.length > MAX_QUERY_TOKENS) {
      throw new QueryError(
        'QUERY_LIMIT_EXCEEDED',
        `Query exceeds maximum of ${MAX_QUERY_TOKENS} tokens`,
        { line: startLine, column: startColumn }
      );
    }
  };

  const advance = (count = 1): void => {
    for (let step = 0; step < count; step++) {
      if (source[index] === '\n') {
        line += 1;
        column = 1;
      } else {
        column += 1;
      }
      index += 1;
    }
  };

  while (index < source.length) {
    const char = source[index];

    if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
      advance();
      continue;
    }

    /* Line comment `// ...` and block comment `/* ... *\/`. */
    if (char === '/' && source[index + 1] === '/') {
      while (index < source.length && source[index] !== '\n') {
        advance();
      }
      continue;
    }
    if (char === '/' && source[index + 1] === '*') {
      advance(2);
      while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) {
        advance();
      }
      if (index >= source.length) {
        throw new QueryError('QUERY_SYNTAX_ERROR', 'Unterminated block comment', { line, column });
      }
      advance(2);
      continue;
    }

    const startLine = line;
    const startColumn = column;

    if (char === '"' || char === "'") {
      const quote = char;
      advance();
      let value = '';
      let closed = false;
      while (index < source.length) {
        const current = source[index];
        if (current === '\\' && quote === '"') {
          const escaped = source[index + 1];
          if (escaped === undefined) {
            break;
          }
          value += escaped;
          advance(2);
          continue;
        }
        if (current === quote) {
          advance();
          closed = true;
          break;
        }
        if (current === '\n') {
          break;
        }
        value += current;
        advance();
      }
      if (!closed) {
        throw new QueryError('QUERY_SYNTAX_ERROR', 'Unterminated string literal', {
          line: startLine,
          column: startColumn,
        });
      }
      push('string', value, startLine, startColumn);
      continue;
    }

    if (/[0-9]/u.test(char) || (char === '-' && /[0-9]/u.test(source[index + 1] ?? ''))) {
      let value = '';
      if (char === '-') {
        value += '-';
        advance();
      }
      while (index < source.length && /[0-9]/u.test(source[index])) {
        value += source[index];
        advance();
      }
      /*
       * A fraction is only consumed when the dot is followed by a digit, so
       * the variable-length range operator `*1..3` keeps its own `..` token.
       */
      if (source[index] === '.' && /[0-9]/u.test(source[index + 1] ?? '')) {
        value += '.';
        advance();
        while (index < source.length && /[0-9]/u.test(source[index])) {
          value += source[index];
          advance();
        }
      }
      if (!/^-?[0-9]+(\.[0-9]+)?$/u.test(value)) {
        throw new QueryError('QUERY_SYNTAX_ERROR', `Invalid numeric literal "${value}"`, {
          line: startLine,
          column: startColumn,
        });
      }
      push('number', value, startLine, startColumn);
      continue;
    }

    if (char === '$') {
      advance();
      let name = '';
      while (index < source.length && isIdentifierPart(source[index])) {
        name += source[index];
        advance();
      }
      if (!name) {
        throw new QueryError('QUERY_SYNTAX_ERROR', 'Parameter name expected after "$"', {
          line: startLine,
          column: startColumn,
        });
      }
      push('parameter', name, startLine, startColumn);
      continue;
    }

    if (isIdentifierStart(char)) {
      let value = '';
      while (index < source.length && isIdentifierPart(source[index])) {
        value += source[index];
        advance();
      }
      const upper = value.toUpperCase();
      if (KEYWORDS.includes(upper)) {
        push('keyword', upper, startLine, startColumn);
      } else if (WRITE_KEYWORDS.includes(upper)) {
        push('keyword', upper, startLine, startColumn);
      } else {
        push('identifier', value, startLine, startColumn);
      }
      continue;
    }

    if (SYMBOLS.has(char)) {
      let value = char;
      const next = source[index + 1];
      if (
        (char === '!' && next === '=') ||
        (char === '<' && next === '=') ||
        (char === '>' && next === '=')
      ) {
        value += next;
        advance(2);
      } else if (char === '.' && next === '.') {
        value = '..';
        advance(2);
      } else if (char === '-' && next === '>') {
        value = '->';
        advance(2);
      } else {
        advance();
      }
      push('symbol', value, startLine, startColumn);
      continue;
    }

    throw new QueryError('QUERY_SYNTAX_ERROR', `Unexpected character "${char}"`, {
      line: startLine,
      column: startColumn,
    });
  }

  tokens.push({ kind: 'eof', value: '', line, column });
  return tokens;
}
