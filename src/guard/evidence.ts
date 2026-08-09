/**
 * Guard Evidence
 * Collect code evidence from project files
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ProjectManifest } from '../core/types.js';

export interface CodeEvidence {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  framework?: string;
  database?: string;
  stateManagement?: string;
  buildTool?: string;
  deployScripts: string[];
}

/**
 * Detect framework from dependencies
 */
function detectFramework(deps: Record<string, string>): string | undefined {
  if (deps['next']) return 'Next.js';
  if (deps['react']) return 'React';
  if (deps['vue']) return 'Vue';
  if (deps['@angular/core']) return 'Angular';
  if (deps['svelte']) return 'Svelte';
  if (deps['express']) return 'Express';
  if (deps['fastify']) return 'Fastify';
  if (deps['@nestjs/core']) return 'NestJS';
  return undefined;
}

/**
 * Detect database from dependencies
 */
function detectDatabase(deps: Record<string, string>): string | undefined {
  if (deps['pg'] || deps['postgres']) return 'PostgreSQL';
  if (deps['mysql'] || deps['mysql2']) return 'MySQL';
  if (deps['sqlite3'] || deps['better-sqlite3']) return 'SQLite';
  if (deps['mongodb']) return 'MongoDB';
  if (deps['redis']) return 'Redis';
  return undefined;
}

/**
 * Detect state management from dependencies
 */
function detectStateManagement(deps: Record<string, string>): string | undefined {
  if (deps['redux'] || deps['@reduxjs/toolkit']) return 'Redux';
  if (deps['zustand']) return 'Zustand';
  if (deps['mobx']) return 'MobX';
  if (deps['recoil']) return 'Recoil';
  if (deps['jotai']) return 'Jotai';
  return undefined;
}

/**
 * Detect build tool from dependencies
 */
function detectBuildTool(deps: Record<string, string>): string | undefined {
  if (deps['vite']) return 'Vite';
  if (deps['webpack']) return 'Webpack';
  if (deps['esbuild']) return 'esbuild';
  if (deps['rollup']) return 'Rollup';
  if (deps['parcel']) return 'Parcel';
  return undefined;
}

/**
 * Extract deploy scripts from package.json
 */
function extractDeployScripts(packageJson: any): string[] {
  const scripts: string[] = [];

  if (packageJson.scripts) {
    for (const [name, command] of Object.entries(packageJson.scripts)) {
      if (
        name.includes('deploy') ||
        name.includes('release') ||
        name.includes('publish')
      ) {
        scripts.push(`npm run ${name}`);
      }
    }
  }

  return scripts;
}

/**
 * Collect code evidence from project
 */
export function collectEvidence(project: ProjectManifest): CodeEvidence {
  const evidence: CodeEvidence = {
    dependencies: {},
    devDependencies: {},
    deployScripts: [],
  };

  // Read package.json
  const packageJsonPath = join(project.rootPath, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

      evidence.dependencies = packageJson.dependencies || {};
      evidence.devDependencies = packageJson.devDependencies || {};

      // Detect patterns
      const allDeps = { ...evidence.dependencies, ...evidence.devDependencies };
      evidence.framework = detectFramework(allDeps);
      evidence.database = detectDatabase(allDeps);
      evidence.stateManagement = detectStateManagement(allDeps);
      evidence.buildTool = detectBuildTool(allDeps);

      // Extract deploy scripts
      evidence.deployScripts = extractDeployScripts(packageJson);
    } catch {
      // Ignore parse errors
    }
  }

  return evidence;
}

/**
 * Check if evidence conflicts with memory
 */
export function detectConflict(
  evidence: CodeEvidence,
  memoryText: string
): { conflict: boolean; reason?: string } {
  const lowerMemory = memoryText.toLowerCase();

  // Check framework conflict
  if (evidence.framework) {
    const frameworks = ['express', 'fastify', 'nestjs', 'koa', 'hapi'];
    for (const fw of frameworks) {
      if (
        lowerMemory.includes(fw) &&
        !evidence.framework.toLowerCase().includes(fw)
      ) {
        return {
          conflict: true,
          reason: `Memory mentions ${fw} but project uses ${evidence.framework}`,
        };
      }
    }
  }

  // Check database conflict
  if (evidence.database) {
    const databases = ['postgresql', 'mysql', 'sqlite', 'mongodb', 'redis'];
    for (const db of databases) {
      if (
        lowerMemory.includes(db) &&
        !evidence.database.toLowerCase().includes(db)
      ) {
        return {
          conflict: true,
          reason: `Memory mentions ${db} but project uses ${evidence.database}`,
        };
      }
    }
  }

  // Check state management conflict
  if (evidence.stateManagement) {
    const stateLibs = ['redux', 'zustand', 'mobx', 'recoil', 'jotai'];
    for (const lib of stateLibs) {
      if (
        lowerMemory.includes(lib) &&
        !evidence.stateManagement.toLowerCase().includes(lib)
      ) {
        return {
          conflict: true,
          reason: `Memory mentions ${lib} but project uses ${evidence.stateManagement}`,
        };
      }
    }
  }

  return { conflict: false };
}

/**
 * Check if path is dangerous
 */
export function isDangerousPath(path: string): { dangerous: boolean; reason?: string } {
  const lowerPath = path.toLowerCase();

  // System paths
  if (lowerPath.startsWith('/etc/')) {
    return { dangerous: true, reason: 'System configuration directory' };
  }

  if (lowerPath.startsWith('/usr/')) {
    return { dangerous: true, reason: 'System binaries directory' };
  }

  if (lowerPath.startsWith('/var/www/')) {
    return { dangerous: true, reason: 'Production web directory' };
  }

  if (lowerPath.includes('/public_html/')) {
    return { dangerous: true, reason: 'Production web directory' };
  }

  if (lowerPath.includes('production') || lowerPath.includes('prod/')) {
    return { dangerous: true, reason: 'Production path' };
  }

  // Sensitive files
  if (lowerPath.endsWith('.env') || lowerPath.includes('.env.')) {
    return { dangerous: true, reason: 'Environment configuration file' };
  }

  if (lowerPath.includes('secret') || lowerPath.includes('credential')) {
    return { dangerous: true, reason: 'Sensitive file' };
  }

  return { dangerous: false };
}

/**
 * Check if command is dangerous
 */
export function isDangerousCommand(
  command: string
): { dangerous: boolean; reason?: string } {
  const lowerCmd = command.toLowerCase();

  // Destructive commands
  if (lowerCmd.includes('rm -rf /')) {
    return { dangerous: true, reason: 'Destructive root deletion' };
  }

  if (lowerCmd.includes('rm -rf ~')) {
    return { dangerous: true, reason: 'Destructive home deletion' };
  }

  if (lowerCmd.includes('chmod 777') || lowerCmd.includes('chmod -r 777')) {
    return { dangerous: true, reason: 'Insecure permissions' };
  }

  if (lowerCmd.includes('chown -R root')) {
    return { dangerous: true, reason: 'Dangerous ownership change' };
  }

  // Database destructive
  if (
    lowerCmd.includes('drop database') ||
    lowerCmd.includes('drop table') ||
    lowerCmd.includes('truncate table')
  ) {
    return { dangerous: true, reason: 'Destructive database operation' };
  }

  // System modifications
  if (lowerCmd.includes('systemctl stop') || lowerCmd.includes('service stop')) {
    return { dangerous: true, reason: 'System service modification' };
  }

  return { dangerous: false };
}
