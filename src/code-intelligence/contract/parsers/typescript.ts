/*
 * Phase 81 — exported TypeScript type/interface contract parser.
 *
 * Only PUBLIC/EXPORTED declarations become contract surfaces: a private type
 * is never an external API and must never be classified as an API break. Member
 * optionality (`?`) is the requiredness signal; nested object literal members
 * are captured one level deep so a removed nested field is still visible.
 *
 * Uses the TypeScript compiler API already present in this project. No source
 * execution. No type-checking (structural parse only).
 */

import * as ts from 'typescript';

import { canonicalType, contractId } from '../shape.js';

import type { ContractEntry, ContractField } from '../types.js';

import { emptyParseResult, type ContractParseInput, type ContractParseResult } from './types.js';

function hasExportModifier(node: ts.Node): boolean {
  const modifiers = (node as { modifiers?: ts.NodeArray<ts.ModifierLike> }).modifiers;

  return Boolean(modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword));
}

/** Canonicalise a member type node without type-checking. */
function typeText(node: ts.TypeNode | undefined): string {
  if (!node) {
    return 'unknown';
  }

  if (ts.isArrayTypeNode(node)) {
    return 'array';
  }

  if (ts.isUnionTypeNode(node)) {
    const kinds = node.types.map((part) => typeText(part));

    /* `string | null` is a nullable string, not an unknown union of kinds. */
    const nonNull = kinds.filter((kind) => kind !== 'null');

    if (nonNull.length === 1) {
      return nonNull[0]!;
    }

    return 'any';
  }

  const text = node.getText();

  return canonicalType(text.replace(/<[^>]*>/gu, '').trim());
}

function isNullishUnion(node: ts.TypeNode | undefined): boolean {
  return Boolean(
    node &&
    ts.isUnionTypeNode(node) &&
    node.types.some((part) => part.kind === ts.SyntaxKind.NullKeyword)
  );
}

function fieldsFromMembers(members: ts.NodeArray<ts.TypeElement>): ContractField[] {
  const fields: ContractField[] = [];

  for (const member of members) {
    if (ts.isPropertySignature(member) && member.name) {
      const name = member.name.getText().replace(/['"]/gu, '');

      const enumValues = enumLikeValues(member.type);

      const field: ContractField = {
        name,
        type: typeText(member.type),
        required: member.questionToken === undefined,
      };

      if (enumValues.length > 0) {
        field.enumValues = enumValues;
      }

      if (isNullishUnion(member.type)) {
        field.nullable = true;
      }

      fields.push(field);
      continue;
    }

    if (ts.isMethodSignature(member) && member.name) {
      const parameters: ContractField[] = member.parameters.map((parameter) => ({
        name: parameter.name.getText(),
        type: typeText(parameter.type),
        required: parameter.questionToken === undefined && parameter.initializer === undefined,
      }));

      fields.push({
        name: member.name.getText(),
        type: 'function',
        required: member.questionToken === undefined,
      });

      /* Method parameters become request-side fields of the method entry. */
      if (parameters.length > 0) {
        fields.push({
          name: `${member.name.getText()}()`,
          type: 'function',
          required: true,
        });
      }
    }
  }

  return fields;
}

function enumLikeValues(node: ts.TypeNode | undefined): string[] {
  if (node && ts.isUnionTypeNode(node)) {
    const values: string[] = [];

    for (const part of node.types) {
      if (ts.isLiteralTypeNode(part) && ts.isStringLiteral(part.literal)) {
        values.push(part.literal.text);
      }
    }

    return values;
  }

  return [];
}

export function parseTypeScriptContracts(input: ContractParseInput): ContractParseResult {
  const result = emptyParseResult();

  const source = ts.createSourceFile(
    input.path,
    input.source,
    ts.ScriptTarget.Latest,
    true,
    input.path.endsWith('.tsx') || input.path.endsWith('.jsx')
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.TS
  );

  let nodes = 0;

  const push = (entry: ContractEntry): void => {
    nodes += 1;

    if (nodes > input.maxNodes) {
      result.truncated = true;
      return;
    }

    result.entries.push(entry);
  };

  for (const statement of source.statements) {
    if (ts.isInterfaceDeclaration(statement) && hasExportModifier(statement)) {
      const entry: ContractEntry = {
        id: contractId('type', statement.name.text),
        kind: 'type',
        identity: statement.name.text,
        sourcePath: input.path,
        request: { fields: fieldsFromMembers(statement.members) },
        response: { fields: [] },
      };

      if (input.serviceId !== undefined) {
        entry.serviceId = input.serviceId;
      }

      push(entry);
      continue;
    }

    if (ts.isTypeAliasDeclaration(statement) && hasExportModifier(statement)) {
      const alias = statement.type;

      if (ts.isTypeLiteralNode(alias)) {
        const entry: ContractEntry = {
          id: contractId('type', statement.name.text),
          kind: 'type',
          identity: statement.name.text,
          sourcePath: input.path,
          request: { fields: fieldsFromMembers(alias.members) },
          response: { fields: [] },
        };

        if (input.serviceId !== undefined) {
          entry.serviceId = input.serviceId;
        }

        push(entry);
      }

      continue;
    }

    if (ts.isEnumDeclaration(statement) && hasExportModifier(statement)) {
      const values = statement.members.map((member) => member.name.getText().replace(/['"]/gu, ''));

      const entry: ContractEntry = {
        id: contractId('type', `enum:${statement.name.text}`),
        kind: 'type',
        identity: `enum:${statement.name.text}`,
        sourcePath: input.path,
        request: {
          fields: [{ name: 'values', type: 'enum', required: true, enumValues: values }],
        },
        response: { fields: [] },
      };

      if (input.serviceId !== undefined) {
        entry.serviceId = input.serviceId;
      }

      push(entry);
      continue;
    }

    if (ts.isClassDeclaration(statement) && hasExportModifier(statement) && statement.name) {
      const members: ContractField[] = [];

      for (const member of statement.members) {
        if (
          (ts.isMethodDeclaration(member) || ts.isPropertyDeclaration(member)) &&
          member.name &&
          member.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.PublicKeyword)
        ) {
          members.push({
            name: member.name.getText(),
            type: ts.isMethodDeclaration(member) ? 'function' : 'property',
            required: true,
          });
        }
      }

      if (members.length > 0) {
        const entry: ContractEntry = {
          id: contractId('type', statement.name.text),
          kind: 'type',
          identity: statement.name.text,
          sourcePath: input.path,
          request: { fields: members },
          response: { fields: [] },
        };

        if (input.serviceId !== undefined) {
          entry.serviceId = input.serviceId;
        }

        push(entry);
      }
    }
  }

  /*
   * A source file with no exported type/interface declaration is simply not a
   * contract surface. It is NOT an unsupported schema, so it must never make a
   * contract analysis "incomplete".
   */
  return result;
}
