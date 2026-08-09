/**
 * Guard Rules
 * Load and match project rules from profile, memory, and config
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ProjectManifest } from '../core/types.js';

export type RuleSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ProjectRule {
  id: string;
  text: string;
  severity: RuleSeverity;
  source: 'profile' | 'memory' | 'config';
  category?: 'path' | 'command' | 'architecture' | 'deployment' | 'security';
}

export interface GuardConfig {
  mode: 'off' | 'warn' | 'strict';
  checkPaths: boolean;
  checkCommands: boolean;
  checkArchitecture: boolean;
}

/**
 * Load guard configuration
 */
export function loadGuardConfig(): GuardConfig {
  return {
    mode: (process.env.TOOLNET_GUARD_MODE as GuardConfig['mode']) || 'warn',
    checkPaths: process.env.TOOLNET_GUARD_CHECK_PATHS !== 'false',
    checkCommands: process.env.TOOLNET_GUARD_CHECK_COMMANDS !== 'false',
    checkArchitecture: process.env.TOOLNET_GUARD_CHECK_ARCHITECTURE !== 'false',
  };
}

/**
 * Extract rules from profile markdown
 */
function extractProfileRules(profilePath: string): ProjectRule[] {
  if (!existsSync(profilePath)) {
    return [];
  }

  const content = readFileSync(profilePath, 'utf-8');
  const rules: ProjectRule[] = [];

  // Extract rules from various sections
  const lines = content.split('\n');
  let inRulesSection = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect rules section
    if (/^#+\s*(rules|guidelines|constraints)/i.test(trimmed)) {
      inRulesSection = true;
      continue;
    }

    // Exit rules section on next heading
    if (inRulesSection && /^#+\s+/.test(trimmed)) {
      inRulesSection = false;
    }

    // Extract rule patterns
    if (trimmed.startsWith('-') || trimmed.startsWith('*') || /^\d+\./.test(trimmed)) {
      const ruleText = trimmed.replace(/^[-*]\s*/, '').replace(/^\d+\.\s*/, '');

      if (ruleText.length < 10) continue;

      let severity: RuleSeverity = 'medium';
      let category: ProjectRule['category'] = undefined;

      // Detect severity
      if (/\b(never|must not|forbidden|prohibited|critical)\b/i.test(ruleText)) {
        severity = 'high';
      } else if (/\b(always|must|required)\b/i.test(ruleText)) {
        severity = 'medium';
      } else if (/\b(should|prefer|recommend)\b/i.test(ruleText)) {
        severity = 'low';
      }

      // Detect category
      if (/\b(production|deploy|release)\b/i.test(ruleText)) {
        category = 'deployment';
        severity = 'high';
      } else if (/\b(path|directory|folder|source)\b/i.test(ruleText)) {
        category = 'path';
      } else if (/\b(command|script|run)\b/i.test(ruleText)) {
        category = 'command';
      } else if (/\b(architecture|pattern|framework|library)\b/i.test(ruleText)) {
        category = 'architecture';
      } else if (/\b(secret|key|password|token|credential)\b/i.test(ruleText)) {
        category = 'security';
        severity = 'high';
      }

      rules.push({
        id: `profile-${rules.length}`,
        text: ruleText,
        severity,
        source: 'profile',
        category,
      });
    }
  }

  return rules;
}

/**
 * Extract dangerous path patterns from profile
 */
export function extractForbiddenPaths(profilePath: string): string[] {
  if (!existsSync(profilePath)) {
    return [];
  }

  const content = readFileSync(profilePath, 'utf-8');
  const paths: string[] = [];

  // Common production paths
  const productionPatterns = [
    /production.*path[:\s]+([^\s\n]+)/gi,
    /deploy.*path[:\s]+([^\s\n]+)/gi,
    /live.*path[:\s]+([^\s\n]+)/gi,
  ];

  for (const pattern of productionPatterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        paths.push(match[1].trim());
      }
    }
  }

  return paths;
}

/**
 * Extract source path from profile
 */
export function extractSourcePath(profilePath: string): string | null {
  if (!existsSync(profilePath)) {
    return null;
  }

  const content = readFileSync(profilePath, 'utf-8');

  const patterns = [
    /source.*path[:\s]+([^\s\n]+)/i,
    /code.*path[:\s]+([^\s\n]+)/i,
    /working.*path[:\s]+([^\s\n]+)/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Extract deploy command from profile
 */
export function extractDeployCommand(profilePath: string): string | null {
  if (!existsSync(profilePath)) {
    return null;
  }

  const content = readFileSync(profilePath, 'utf-8');

  const patterns = [
    /deploy.*command[:\s]+([^\n]+)/i,
    /deployment[:\s]+`([^`]+)`/i,
    /to deploy[:\s]+([^\n]+)/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Load all project rules
 */
export function loadProjectRules(project: ProjectManifest): ProjectRule[] {
  const rules: ProjectRule[] = [];

  // Load from profile
  const profilePath = join(project.rootPath, '.toolnet', 'profile.md');
  rules.push(...extractProfileRules(profilePath));

  // Add default security rules
  rules.push({
    id: 'default-no-rm-rf',
    text: 'Never use rm -rf / or similar destructive commands',
    severity: 'critical',
    source: 'config',
    category: 'security',
  });

  rules.push({
    id: 'default-no-system-paths',
    text: 'Do not modify system paths like /etc, /usr, /var without explicit permission',
    severity: 'high',
    source: 'config',
    category: 'security',
  });

  return rules;
}

/**
 * Match rules against target
 */
export function matchRules(
  rules: ProjectRule[],
  target: string,
  type: 'path' | 'command'
): ProjectRule[] {
  const matched: ProjectRule[] = [];

  for (const rule of rules) {
    // Skip if category doesn't match
    if (rule.category && rule.category !== type && rule.category !== 'security') {
      continue;
    }

    const lowerRule = rule.text.toLowerCase();
    const lowerTarget = target.toLowerCase();

    // Check for keyword matches
    if (type === 'path') {
      if (
        lowerRule.includes('production') &&
        (lowerTarget.includes('/var/www') ||
          lowerTarget.includes('production') ||
          lowerTarget.includes('/public_html'))
      ) {
        matched.push(rule);
      }

      if (
        lowerRule.includes('source') &&
        !lowerTarget.includes('/src') &&
        !lowerTarget.includes('/source')
      ) {
        matched.push(rule);
      }
    }

    if (type === 'command') {
      if (lowerRule.includes('deploy') && lowerTarget.includes('deploy')) {
        matched.push(rule);
      }

      if (
        lowerRule.includes('never') &&
        (lowerTarget.includes('rm -rf') || lowerTarget.includes('chmod 777'))
      ) {
        matched.push(rule);
      }
    }
  }

  return matched;
}
