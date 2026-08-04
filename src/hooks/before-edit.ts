import type {
  ImpactGuard,
} from "../code-intelligence/impact/impact-guard.js";

export interface BeforeEditResult {
  allowed: boolean;

  risk:
    string;

  riskScore:
    number;

  impactedFiles:
    string[];

  suggestedTests:
    string[];

  warning?: string;
}

export async function beforeEdit(
  impactGuard:
    ImpactGuard,

  projectId:
    string,

  filePath:
    string,
): Promise<BeforeEditResult> {
  const result =
    impactGuard.analyzeFile(
      projectId,
      filePath,
    );

  /*
   * Không block cứng AI.
   * Guard cảnh báo và yêu cầu verify.
   */
  return {
    allowed:
      true,

    risk:
      result.risk,

    riskScore:
      result.riskScore,

    impactedFiles:
      result.impactedFiles,

    suggestedTests:
      result.suggestedTests,

    warning:
      result.risk ===
        "CRITICAL" ||
      result.risk ===
        "HIGH"
        ? `High blast radius: verify ${result.impactedFiles.length} impacted files before finalizing edit.`
        : undefined,
  };
}
