import { extractEditedFiles } from '../code-intelligence/impact/edit-tool-detector.js';

import { ImpactGuard } from '../code-intelligence/impact/impact-guard.js';

import type { RiskLevel } from '../code-intelligence/impact/blast-radius.js';

const RISK_ORDER: Record<RiskLevel, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3,
};

export interface FileImpactGuardResult {
  filePath: string;

  risk: RiskLevel;

  riskScore: number;

  impactedFiles: string[];

  suggestedTests: string[];

  impactedCount: number;
}

export interface AutoImpactGuardResult {
  triggered: boolean;

  tool: string;

  highestRisk: RiskLevel;

  totalRiskScore: number;

  files: FileImpactGuardResult[];

  impactedFiles: string[];

  suggestedTests: string[];

  requiresVerification: boolean;

  context: string;
}

export class AutoImpactGuard {
  constructor(
    private readonly guard: ImpactGuard,

    private readonly projectId: string
  ) {}

  async beforeTool(tool: string, input?: unknown): Promise<AutoImpactGuardResult> {
    const paths = extractEditedFiles(tool, input);

    if (paths.length === 0) {
      return {
        triggered: false,

        tool,

        highestRisk: 'LOW',

        totalRiskScore: 0,

        files: [],

        impactedFiles: [],

        suggestedTests: [],

        requiresVerification: false,

        context: '',
      };
    }

    const files: FileImpactGuardResult[] = [];

    for (const filePath of paths) {
      const result = this.guard.analyzeFile(this.projectId, filePath);

      files.push({
        filePath,

        risk: result.risk,

        riskScore: result.riskScore,

        impactedFiles: result.impactedFiles,

        suggestedTests: result.suggestedTests,

        impactedCount: result.impacted.length,
      });
    }

    let highestRisk: RiskLevel = 'LOW';

    for (const file of files) {
      if (RISK_ORDER[file.risk] > RISK_ORDER[highestRisk]) {
        highestRisk = file.risk;
      }
    }

    const impactedFiles = [...new Set(files.flatMap((file) => file.impactedFiles))];

    const suggestedTests = [...new Set(files.flatMap((file) => file.suggestedTests))];

    const totalRiskScore = files.reduce((total, file) => total + file.riskScore, 0);

    const requiresVerification = highestRisk === 'HIGH' || highestRisk === 'CRITICAL';

    const lines = [
      '[TOOLNET IMPACT GUARD]',
      `Risk: ${highestRisk}`,
      `Risk score: ${totalRiskScore}`,
      `Files being changed: ${paths.join(', ')}`,
      `Impacted files: ${impactedFiles.length}`,
    ];

    if (impactedFiles.length) {
      lines.push('Blast radius:', ...impactedFiles.slice(0, 20).map((path) => `- ${path}`));
    }

    if (suggestedTests.length) {
      lines.push('Verify/tests:', ...suggestedTests.slice(0, 15).map((path) => `- ${path}`));
    }

    if (requiresVerification) {
      lines.push(
        'IMPORTANT: High blast radius. Inspect affected dependencies and run relevant tests after the edit.'
      );
    }

    return {
      triggered: true,

      tool,

      highestRisk,

      totalRiskScore,

      files,

      impactedFiles,

      suggestedTests,

      requiresVerification,

      context: lines.join('\n'),
    };
  }
}
