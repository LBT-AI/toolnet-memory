/*
 * Phase 77 — daemon-backed CodeIntelligenceRuntime.
 *
 * Thin adapter over the local daemon client. It never creates, enriches or
 * mutates graph state: query execution stays the daemon's read-only Phase 74
 * pipeline, and cursors remain bound to the runtime generation.
 */

import type { DaemonClient } from '../../daemon/client.js';

import type { DaemonProjectRef } from '../../daemon/types.js';

import type {
  CodeIntelligenceRuntime,
  RuntimeChangeInput,
  RuntimeContractInput,
  RuntimeProjectRef,
  RuntimeQueryInput,
  RuntimeReadiness,
  RuntimeTestRunInput,
  RuntimeTestSelectionInput,
  RuntimeTraceIngestInput,
} from './types.js';

import type { ChangeIntelligenceReport } from '../change/types.js';

import type { ContractIntelligenceReport } from '../contract/types.js';

import type { TestSelection, TestVerificationReport } from '../test-intelligence/types.js';

import type { ReleaseAnalysisInput, ReleaseReadinessReport } from '../release/types.js';

import type { RuntimeTraceImportResult } from '../runtime-trace/types.js';

import type { QueryResult } from '../query-v2/types.js';

import type { EvidenceBundle, EvidenceRequest } from '../evidence/types.js';

function toRef(project: RuntimeProjectRef): DaemonProjectRef {
  return {
    id: project.id,
    name: project.name,
    rootPath: project.rootPath,
    ...(project.remote ? { remote: project.remote } : {}),
  };
}

export class DaemonCodeIntelligenceRuntime implements CodeIntelligenceRuntime {
  readonly kind = 'daemon' as const;

  constructor(private readonly client: DaemonClient) {}

  get sessionId(): string {
    return this.client.sessionId;
  }

  get instance() {
    return this.client.instance;
  }

  async ensureProjectReady(project: RuntimeProjectRef): Promise<RuntimeReadiness> {
    const response = await this.client.request({
      type: 'ensure_ready',
      sessionId: this.client.sessionId,
      project: toRef(project),
    });

    if (!response.ok) {
      throw new Error(`${response.code}: ${response.error}`);
    }

    if (response.type !== 'job_result') {
      return { via: 'local' };
    }

    return {
      ...(response.generation ? { generation: response.generation } : {}),
      via: response.jobKind === 'hydrate' ? 'hydrated' : 'indexed',
    };
  }

  async query(project: RuntimeProjectRef, input: RuntimeQueryInput): Promise<QueryResult> {
    const response = await this.client.request({
      type: 'query',
      sessionId: this.client.sessionId,
      project: toRef(project),
      query: input.query,
      ...(input.scope ? { scope: input.scope } : {}),
      ...(input.parameters ? { parameters: input.parameters } : {}),
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
      ...(input.cursor ? { cursor: input.cursor } : {}),
      ...(input.explain !== undefined ? { explain: input.explain } : {}),
    });

    if (!response.ok) {
      throw new Error(`${response.code}: ${response.error}`);
    }

    if (response.type !== 'query') {
      throw new Error('Unexpected daemon query response.');
    }

    return response.result;
  }

  async evidence(project: RuntimeProjectRef, request: EvidenceRequest): Promise<EvidenceBundle> {
    const response = await this.client.request({
      type: 'evidence',
      sessionId: this.client.sessionId,
      project: toRef(project),
      evidence: request,
    });

    if (!response.ok) {
      throw new Error(`${response.code}: ${response.error}`);
    }

    if (response.type !== 'evidence') {
      throw new Error('Unexpected daemon evidence response.');
    }

    return response.bundle;
  }

  async ingestTraces(
    project: RuntimeProjectRef,
    input: RuntimeTraceIngestInput
  ): Promise<RuntimeTraceImportResult> {
    const response = await this.client.request({
      type: 'ingest_traces',
      sessionId: this.client.sessionId,
      project: toRef(project),
      ingest: {
        projectId: input.projectId,
        ...(input.graphGeneration ? { graphGeneration: input.graphGeneration } : {}),
        input: input.input,
      },
    });

    if (!response.ok) {
      throw new Error(`${response.code}: ${response.error}`);
    }

    if (response.type !== 'ingest_traces') {
      throw new Error('Unexpected daemon trace ingest response.');
    }

    return response.result;
  }

  async change(
    project: RuntimeProjectRef,
    input: RuntimeChangeInput
  ): Promise<ChangeIntelligenceReport> {
    const response = await this.client.request({
      type: 'change',
      sessionId: this.client.sessionId,
      project: toRef(project),
      change: input,
    });

    if (!response.ok) {
      throw new Error(`${response.code}: ${response.error}`);
    }

    if (response.type !== 'change') {
      throw new Error('Unexpected daemon change response.');
    }

    return response.report;
  }

  async contract(
    project: RuntimeProjectRef,
    input: RuntimeContractInput
  ): Promise<ContractIntelligenceReport> {
    const response = await this.client.request({
      type: 'contract',
      sessionId: this.client.sessionId,
      project: toRef(project),
      contract: input,
    });

    if (!response.ok) {
      throw new Error(`${response.code}: ${response.error}`);
    }

    if (response.type !== 'contract') {
      throw new Error('Unexpected daemon contract response.');
    }

    return response.report;
  }

  async testSelection(
    project: RuntimeProjectRef,
    input: RuntimeTestSelectionInput
  ): Promise<TestSelection> {
    const response = await this.client.request({
      type: 'test_selection',
      sessionId: this.client.sessionId,
      project: toRef(project),
      selection: input,
    });

    if (!response.ok) {
      throw new Error(`${response.code}: ${response.error}`);
    }

    if (response.type !== 'test_selection') {
      throw new Error('Unexpected daemon test-selection response.');
    }

    return response.selection;
  }

  async runTests(
    project: RuntimeProjectRef,
    input: RuntimeTestRunInput
  ): Promise<TestVerificationReport> {
    const response = await this.client.request({
      type: 'run_tests',
      sessionId: this.client.sessionId,
      project: toRef(project),
      run: input,
    });

    if (!response.ok) {
      throw new Error(`${response.code}: ${response.error}`);
    }

    if (response.type !== 'run_tests') {
      throw new Error('Unexpected daemon test-run response.');
    }

    return response.verification;
  }

  async testStatus(project: RuntimeProjectRef, limit?: number): Promise<unknown> {
    const response = await this.client.request({
      type: 'test_status',
      sessionId: this.client.sessionId,
      project: toRef(project),
      ...(limit !== undefined ? { limit } : {}),
    });

    if (!response.ok) {
      throw new Error(`${response.code}: ${response.error}`);
    }

    if (response.type !== 'test_status') {
      throw new Error('Unexpected daemon test-status response.');
    }

    return response.status;
  }

  /**
   * Phase 83: release analysis always runs locally in the caller's process —
   * it inspects the working tree, package manifests and the built bundle of
   * the project on this machine, which the daemon does not own. This keeps
   * standalone/daemon parity: both runtimes expose the same method with the
   * same semantics.
   */
  async release(
    project: RuntimeProjectRef,
    input: ReleaseAnalysisInput
  ): Promise<ReleaseReadinessReport> {
    const { buildReleaseFacts, runReleaseAnalysis, resolveReleaseLimits, REQUIRED_RELEASE_PHASES } =
      await import('../release/index.js');

    const limits = resolveReleaseLimits(input.request.limits);

    const facts = buildReleaseFacts({
      projectRoot: input.projectRoot,
      profile: input.request.evidenceProfile ?? 'auditor',
      requiredPhases: REQUIRED_RELEASE_PHASES,
      maxCapabilities: limits.maxCapabilities,
      maxBundleReadBytes: limits.maxBundleReadBytes,
      maxPackageJsonBytes: limits.maxPackageJsonBytes,
      maxWorktreeFiles: limits.maxWorktreeFiles,
    });

    return runReleaseAnalysis({ facts, request: input.request, rebuild: input.rebuild });
  }

  async status(project?: RuntimeProjectRef): Promise<unknown> {
    if (project) {
      const response = await this.client.request({
        type: 'project_status',
        sessionId: this.client.sessionId,
        project: toRef(project),
      });

      if (response.ok && response.type === 'project_status') {
        return response.status;
      }

      return response;
    }

    const response = await this.client.request({ type: 'daemon_status' });

    if (response.ok && response.type === 'daemon_status') {
      return response.status;
    }

    return response;
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}
