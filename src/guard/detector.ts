/**
 * Guard Detector
 * Detect rule violations, conflicts, and dangerous operations
 */

import type { ProjectManifest } from '../core/types.js';
import {
  loadProjectRules,
  matchRules,
  extractForbiddenPaths,
  extractSourcePath,
  extractDeployCommand,
  type ProjectRule,
  type GuardConfig,
} from './rules.js';
import {
  collectEvidence,
  detectConflict,
  isDangerousPath,
  isDangerousCommand,
  type CodeEvidence,
} from './evidence.js';
import { join } from 'node:path';

export type WarningType =
  | 'rule_violation'
  | 'memory_conflict'
  | 'architecture_conflict'
  | 'dangerous_path'
  | 'dangerous_command';

export type WarningSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface GuardWarning {
  type: WarningType;
  severity: WarningSeverity;
  reason: string;
  matchedRule?: string;
  target?: string;
  recommendation?: string;
  evidence?: string;
}

export interface GuardResult {
  ok: boolean;
  mode: 'off' | 'warn' | 'strict';
  warnings: GuardWarning[];
  rules: ProjectRule[];
  evidence: CodeEvidence;
  sourcePath?: string;
  deployCommand?: string;
  forbiddenPaths: string[];
}

/**
 * Check file path against rules
 */
export function checkPath(
  project: ProjectManifest,
  filePath: string,
  config: GuardConfig
): GuardResult {
  const warnings: GuardWarning[] = [];
  const rules = loadProjectRules(project);
  const evidence = collectEvidence(project);

  const profilePath = join(project.rootPath, '.toolnet', 'profile.md');
  const sourcePath = extractSourcePath(profilePath);
  const deployCommand = extractDeployCommand(profilePath);
  const forbiddenPaths = extractForbiddenPaths(profilePath);

  if (config.mode === 'off') {
    return {
      ok: true,
      mode: 'off',
      warnings: [],
      rules,
      evidence,
      sourcePath: sourcePath || undefined,
      deployCommand: deployCommand || undefined,
      forbiddenPaths,
    };
  }

  // Check if path is dangerous
  if (config.checkPaths) {
    const dangerCheck = isDangerousPath(filePath);
    if (dangerCheck.dangerous) {
      warnings.push({
        type: 'dangerous_path',
        severity: 'high',
        reason: dangerCheck.reason || 'Dangerous path detected',
        target: filePath,
        recommendation: sourcePath
          ? `Edit source path instead: ${sourcePath}`
          : 'Verify this is the correct path to modify',
      });
    }

    // Check against forbidden paths
    for (const forbidden of forbiddenPaths) {
      if (filePath.includes(forbidden)) {
        warnings.push({
          type: 'rule_violation',
          severity: 'high',
          reason: 'Target path appears to be production or forbidden',
          matchedRule: 'Never edit production directly',
          target: filePath,
          recommendation: sourcePath
            ? `Edit source path instead: ${sourcePath}\nDeploy: ${deployCommand || 'Use project deploy command'}`
            : 'Use proper deployment process',
        });
      }
    }

    // Check if outside source path
    if (sourcePath && !filePath.includes(sourcePath)) {
      const matchedRules = matchRules(rules, filePath, 'path');
      for (const rule of matchedRules) {
        warnings.push({
          type: 'rule_violation',
          severity: rule.severity,
          reason: 'File is outside designated source path',
          matchedRule: rule.text,
          target: filePath,
          recommendation: `Source path: ${sourcePath}`,
        });
      }
    }
  }

  const ok = warnings.length === 0 || config.mode === 'warn';

  return {
    ok,
    mode: config.mode,
    warnings,
    rules,
    evidence,
    sourcePath: sourcePath || undefined,
    deployCommand: deployCommand || undefined,
    forbiddenPaths,
  };
}

/**
 * Check command against rules
 */
export function checkCommand(
  project: ProjectManifest,
  command: string,
  config: GuardConfig
): GuardResult {
  const warnings: GuardWarning[] = [];
  const rules = loadProjectRules(project);
  const evidence = collectEvidence(project);

  const profilePath = join(project.rootPath, '.toolnet', 'profile.md');
  const sourcePath = extractSourcePath(profilePath);
  const deployCommand = extractDeployCommand(profilePath);
  const forbiddenPaths = extractForbiddenPaths(profilePath);

  if (config.mode === 'off') {
    return {
      ok: true,
      mode: 'off',
      warnings: [],
      rules,
      evidence,
      sourcePath: sourcePath || undefined,
      deployCommand: deployCommand || undefined,
      forbiddenPaths,
    };
  }

  // Check if command is dangerous
  if (config.checkCommands) {
    const dangerCheck = isDangerousCommand(command);
    if (dangerCheck.dangerous) {
      warnings.push({
        type: 'dangerous_command',
        severity: 'critical',
        reason: dangerCheck.reason || 'Dangerous command detected',
        target: command,
        recommendation: 'Review command carefully before execution',
      });
    }

    // Check against rules
    const matchedRules = matchRules(rules, command, 'command');
    for (const rule of matchedRules) {
      warnings.push({
        type: 'rule_violation',
        severity: rule.severity,
        reason: 'Command may violate project rules',
        matchedRule: rule.text,
        target: command,
        recommendation: deployCommand
          ? `Use approved deploy command: ${deployCommand}`
          : 'Follow project deployment guidelines',
      });
    }
  }

  const ok = warnings.length === 0 || config.mode === 'warn';

  return {
    ok,
    mode: config.mode,
    warnings,
    rules,
    evidence,
    sourcePath: sourcePath || undefined,
    deployCommand: deployCommand || undefined,
    forbiddenPaths,
  };
}

/**
 * Check for memory conflicts
 */
export function checkMemoryConflict(
  project: ProjectManifest,
  memoryText: string,
  config: GuardConfig
): GuardResult {
  const warnings: GuardWarning[] = [];
  const rules = loadProjectRules(project);
  const evidence = collectEvidence(project);

  const profilePath = join(project.rootPath, '.toolnet', 'profile.md');
  const sourcePath = extractSourcePath(profilePath);
  const deployCommand = extractDeployCommand(profilePath);
  const forbiddenPaths = extractForbiddenPaths(profilePath);

  if (config.mode === 'off' || !config.checkArchitecture) {
    return {
      ok: true,
      mode: config.mode,
      warnings: [],
      rules,
      evidence,
      sourcePath: sourcePath || undefined,
      deployCommand: deployCommand || undefined,
      forbiddenPaths,
    };
  }

  // Check for conflicts
  const conflict = detectConflict(evidence, memoryText);
  if (conflict.conflict) {
    warnings.push({
      type: 'memory_conflict',
      severity: 'medium',
      reason: conflict.reason || 'Memory conflicts with current code',
      evidence: `Current: ${evidence.framework || evidence.database || evidence.stateManagement || 'unknown'}`,
      recommendation: 'Verify which is correct and update accordingly',
    });
  }

  const ok = warnings.length === 0 || config.mode === 'warn';

  return {
    ok,
    mode: config.mode,
    warnings,
    rules,
    evidence,
    sourcePath: sourcePath || undefined,
    deployCommand: deployCommand || undefined,
    forbiddenPaths,
  };
}

/**
 * General project check
 */
export function checkProject(
  project: ProjectManifest,
  config: GuardConfig
): GuardResult {
  const rules = loadProjectRules(project);
  const evidence = collectEvidence(project);

  const profilePath = join(project.rootPath, '.toolnet', 'profile.md');
  const sourcePath = extractSourcePath(profilePath);
  const deployCommand = extractDeployCommand(profilePath);
  const forbiddenPaths = extractForbiddenPaths(profilePath);

  return {
    ok: true,
    mode: config.mode,
    warnings: [],
    rules,
    evidence,
    sourcePath: sourcePath || undefined,
    deployCommand: deployCommand || undefined,
    forbiddenPaths,
  };
}
