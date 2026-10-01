import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import type { MemoryRecord } from '../../src/core/types.js';

import {
  durableMemoryPolicyFindings,
  inspectDurableMemoryPolicy,
} from '../../src/memory/quality.js';

import {
  memoryKnowledgeClassMatrix,
  MEMORY_POLICY_VERSION,
} from '../../src/memory/promotion-policy.js';

import { certifyMemoryQualityGA } from '../../src/production/memory-quality-ga-certify.js';

import { inspectMemoryPipeline } from '../../src/production/memory-pipeline-status.js';

function record(input: Partial<MemoryRecord> & { id: string; content: string }): MemoryRecord {
  return {
    projectId: 'phase86d-certify',
    type: 'rule',
    importance: 'high',
    importanceScore: 75,
    tags: [],
    source: 'test',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    metadata: {},
    ...input,
  };
}

describe('Phase 86D durable memory quality certification', () => {
  it('certifies the durable memory policy alongside the existing quality checks', async () => {
    const result = await certifyMemoryQualityGA();

    const durable = result.checks.find((item) => item.id === 'durable-memory-policy');

    expect(durable, JSON.stringify(result.checks, null, 2)).toBeDefined();

    expect(durable?.passed, durable?.detail).toBe(true);

    expect(result.passed).toBe(true);

    expect(result.total).toBeGreaterThanOrEqual(8);
  });

  it('reports policy compliance findings deterministically and content-free', () => {
    expect(durableMemoryPolicyFindings(inspectDurableMemoryPolicy([]))).toEqual([]);

    const leaky = inspectDurableMemoryPolicy([
      record({
        id: 'leaky',
        content: 'api_key=sk-1234567890abcdefABCDEF1234567890abcdef',
        metadata: { policyVersion: MEMORY_POLICY_VERSION },
      }),
    ]);

    expect(leaky.secretLeaks).toBe(1);

    const findings = durableMemoryPolicyFindings(leaky);

    expect(findings.join(' ')).toContain('contain a secret');

    expect(findings.join(' ')).not.toContain('sk-1234');

    const rejected = inspectDurableMemoryPolicy([
      record({
        id: 'rejected',
        content: 'A rejected candidate that somehow reached the store.',
        metadata: { policyReason: 'rejected_transient', policyVersion: MEMORY_POLICY_VERSION },
      }),
    ]);

    expect(rejected.rejectedArtifacts).toBe(1);

    expect(durableMemoryPolicyFindings(rejected).join(' ')).toContain('rejected candidate');

    const accepted = inspectDurableMemoryPolicy([
      record({
        id: 'accepted',
        content: 'Rule: always run the full test suite before committing.',
        metadata: {
          policyReason: 'accepted_project_rule',
          policyVersion: MEMORY_POLICY_VERSION,
          knowledgeType: 'project_rule',
          knowledgeClass: 'permanent',
        },
      }),
    ]);

    expect(accepted.accepted).toBe(1);

    expect(accepted.unknownPolicy).toBe(0);

    expect(durableMemoryPolicyFindings(accepted)).toEqual([]);
  });

  it('keeps memory quality inspection separate from memory pipeline health', () => {
    const pipelineSource = readFileSync('src/production/memory-pipeline-status.ts', 'utf8');

    const qualitySource = readFileSync('src/memory/quality.ts', 'utf8');

    expect(pipelineSource).not.toContain("from '../memory/quality.js'");

    expect(qualitySource).not.toContain("from '../production/memory-pipeline-status.js'");

    expect(typeof inspectMemoryPipeline).toBe('function');

    expect(typeof inspectDurableMemoryPolicy).toBe('function');
  });

  it('exposes the canonical knowledge-class certification matrix', () => {
    const matrix = memoryKnowledgeClassMatrix();

    expect(matrix.map((entry) => entry.knowledgeType)).toEqual(
      expect.arrayContaining([
        'project_rule',
        'requirement',
        'architecture_decision',
        'decision',
        'root_cause',
        'verified_fix',
        'deployment',
        'blocker',
        'handoff',
      ])
    );

    expect(matrix.every((entry) => entry.timeless === (entry.knowledgeClass === 'permanent'))).toBe(
      true
    );

    expect(matrix.find((entry) => entry.knowledgeType === 'root_cause')?.verificationRequired).toBe(
      true
    );

    expect(matrix.find((entry) => entry.knowledgeType === 'verified_fix')?.autoCapture).toBe(true);
  });

  it('keeps the durable policy version explicit', () => {
    const source = readFileSync('src/memory/promotion-policy.ts', 'utf8');

    expect(source).toContain('export function evaluateMemoryPolicy');

    expect(source).toContain('MEMORY_POLICY_VERSION');

    expect(MEMORY_POLICY_VERSION).toBe(1);
  });
});
