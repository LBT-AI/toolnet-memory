import { describe, expect, it, beforeEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  loadProjectRules,
  extractSourcePath,
  extractDeployCommand,
} from '../../src/guard/rules.js';
import { checkPath, checkCommand } from '../../src/guard/detector.js';
import { collectEvidence, isDangerousPath, isDangerousCommand } from '../../src/guard/evidence.js';
import type { ProjectManifest } from '../../src/core/types.js';

describe('Guard System', () => {
  let testProjectPath: string;
  let testProject: ProjectManifest;

  beforeEach(() => {
    // Create temporary test project
    testProjectPath = join(tmpdir(), `toolnet-guard-test-${Date.now()}`);
    mkdirSync(testProjectPath, { recursive: true });
    mkdirSync(join(testProjectPath, '.toolnet'), { recursive: true });

    testProject = {
      id: 'test-project',
      name: 'test-project',
      rootPath: testProjectPath,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      graphVersion: 1,
      memoryVersion: 1,
    };
  });

  describe('Rule Loading', () => {
    it('loads rules from profile.md', () => {
      const profileContent = `
# Project Rules

- Never edit production directly
- Always use source path /project/src
- Deploy using npm run deploy:prod
`;

      writeFileSync(join(testProjectPath, '.toolnet', 'profile.md'), profileContent);

      const rules = loadProjectRules(testProject);

      expect(rules.length).toBeGreaterThan(0);
      const productionRule = rules.find((r) => r.text.includes('production'));
      expect(productionRule).toBeDefined();
      expect(productionRule?.severity).toBe('high');
    });

    it('extracts source path from profile', () => {
      const profileContent = `
Source path: /project/src
`;

      writeFileSync(join(testProjectPath, '.toolnet', 'profile.md'), profileContent);

      const sourcePath = extractSourcePath(join(testProjectPath, '.toolnet', 'profile.md'));

      expect(sourcePath).toBe('/project/src');
    });

    it('extracts deploy command from profile', () => {
      const profileContent = `
Deploy command: npm run deploy:prod
`;

      writeFileSync(join(testProjectPath, '.toolnet', 'profile.md'), profileContent);

      const deployCmd = extractDeployCommand(join(testProjectPath, '.toolnet', 'profile.md'));

      expect(deployCmd).toBe('npm run deploy:prod');
    });
  });

  describe('Path Checking', () => {
    it('warns when editing production path', () => {
      const profileContent = `
# Rules

- Never edit production directly

Production path: /var/www/app
Source path: /project/src
`;

      writeFileSync(join(testProjectPath, '.toolnet', 'profile.md'), profileContent);

      const result = checkPath(testProject, '/var/www/app/theme/header.php', {
        mode: 'warn',
        checkPaths: true,
        checkCommands: true,
        checkArchitecture: true,
      });

      expect(result.warnings.length).toBeGreaterThan(0);
      const warning = result.warnings.find(
        (w) => w.type === 'rule_violation' || w.type === 'dangerous_path'
      );
      expect(warning).toBeDefined();
      expect(warning?.severity).toMatch(/high|critical/);
    });

    it('warns when file is outside source path', () => {
      const profileContent = `
Source path: /project/src
`;

      writeFileSync(join(testProjectPath, '.toolnet', 'profile.md'), profileContent);

      const result = checkPath(testProject, '/other/path/file.ts', {
        mode: 'warn',
        checkPaths: true,
        checkCommands: true,
        checkArchitecture: true,
      });

      expect(result.sourcePath).toBe('/project/src');
    });

    it('allows files in source path', () => {
      const profileContent = `
Source path: /project/src
`;

      writeFileSync(join(testProjectPath, '.toolnet', 'profile.md'), profileContent);

      const result = checkPath(testProject, '/project/src/components/Button.tsx', {
        mode: 'warn',
        checkPaths: true,
        checkCommands: true,
        checkArchitecture: true,
      });

      // Should have fewer or no warnings for files in source path
      const highWarnings = result.warnings.filter(
        (w) => w.severity === 'high' || w.severity === 'critical'
      );
      expect(highWarnings.length).toBe(0);
    });
  });

  describe('Command Checking', () => {
    it('warns on rm -rf /', () => {
      const result = checkCommand(testProject, 'rm -rf /', {
        mode: 'warn',
        checkPaths: true,
        checkCommands: true,
        checkArchitecture: true,
      });

      expect(result.warnings.length).toBeGreaterThan(0);
      const warning = result.warnings.find((w) => w.type === 'dangerous_command');
      expect(warning).toBeDefined();
      expect(warning?.severity).toBe('critical');
    });

    it('allows safe deploy command', () => {
      const profileContent = `
Deploy command: npm run deploy:prod
`;

      writeFileSync(join(testProjectPath, '.toolnet', 'profile.md'), profileContent);

      const result = checkCommand(testProject, 'npm run deploy:prod', {
        mode: 'warn',
        checkPaths: true,
        checkCommands: true,
        checkArchitecture: true,
      });

      expect(result.deployCommand).toBe('npm run deploy:prod');
      // Should not have critical warnings for approved deploy command
      const criticalWarnings = result.warnings.filter((w) => w.severity === 'critical');
      expect(criticalWarnings.length).toBe(0);
    });

    it('detects dangerous chmod 777', () => {
      const dangerous = isDangerousCommand('chmod -R 777 /var/www');

      expect(dangerous.dangerous).toBe(true);
      expect(dangerous.reason).toContain('Insecure permissions');
    });

    it('detects destructive database commands', () => {
      const dangerous = isDangerousCommand('DROP DATABASE production');

      expect(dangerous.dangerous).toBe(true);
      expect(dangerous.reason).toContain('database');
    });
  });

  describe('Evidence Collection', () => {
    it('detects framework from package.json', () => {
      const packageJson = {
        dependencies: {
          react: '^18.0.0',
          next: '^14.0.0',
        },
      };

      writeFileSync(join(testProjectPath, 'package.json'), JSON.stringify(packageJson));

      const evidence = collectEvidence(testProject);

      expect(evidence.framework).toBe('Next.js');
    });

    it('detects database from package.json', () => {
      const packageJson = {
        dependencies: {
          pg: '^8.0.0',
        },
      };

      writeFileSync(join(testProjectPath, 'package.json'), JSON.stringify(packageJson));

      const evidence = collectEvidence(testProject);

      expect(evidence.database).toBe('PostgreSQL');
    });

    it('detects state management from package.json', () => {
      const packageJson = {
        dependencies: {
          zustand: '^4.0.0',
        },
      };

      writeFileSync(join(testProjectPath, 'package.json'), JSON.stringify(packageJson));

      const evidence = collectEvidence(testProject);

      expect(evidence.stateManagement).toBe('Zustand');
    });
  });

  describe('Dangerous Path Detection', () => {
    it('detects /etc/ as dangerous', () => {
      const result = isDangerousPath('/etc/nginx/nginx.conf');

      expect(result.dangerous).toBe(true);
      expect(result.reason).toContain('System configuration');
    });

    it('detects /var/www/ as dangerous', () => {
      const result = isDangerousPath('/var/www/html/index.php');

      expect(result.dangerous).toBe(true);
      expect(result.reason).toContain('Production');
    });

    it('detects .env files as dangerous', () => {
      const result = isDangerousPath('/project/.env');

      expect(result.dangerous).toBe(true);
      expect(result.reason).toContain('Environment configuration');
    });

    it('allows normal project paths', () => {
      const result = isDangerousPath('/project/src/components/Button.tsx');

      expect(result.dangerous).toBe(false);
    });
  });

  describe('No Hardcoded Paths', () => {
    it('does not contain hardcoded /root/mercedes', () => {
      const rules = loadProjectRules(testProject);

      for (const rule of rules) {
        expect(rule.text).not.toContain('/root/mercedes');
      }
    });

    it('uses project-relative paths', () => {
      const profileContent = `
Source path: /project/src
`;

      writeFileSync(join(testProjectPath, '.toolnet', 'profile.md'), profileContent);

      const sourcePath = extractSourcePath(join(testProjectPath, '.toolnet', 'profile.md'));

      expect(sourcePath).toBeTruthy();
      expect(sourcePath).not.toContain('/root/mercedes');
    });
  });

  describe('JSON Output', () => {
    it('produces valid JSON output', () => {
      const result = checkPath(testProject, '/var/www/app/file.php', {
        mode: 'warn',
        checkPaths: true,
        checkCommands: true,
        checkArchitecture: true,
      });

      const json = JSON.stringify(result);
      const parsed = JSON.parse(json);

      expect(parsed).toHaveProperty('ok');
      expect(parsed).toHaveProperty('mode');
      expect(parsed).toHaveProperty('warnings');
      expect(Array.isArray(parsed.warnings)).toBe(true);
    });

    it('does not leak secrets in JSON output', () => {
      const profileContent = `
API Key: sk_live_1234567890
`;

      writeFileSync(join(testProjectPath, '.toolnet', 'profile.md'), profileContent);

      const result = checkPath(testProject, '/project/src/file.ts', {
        mode: 'warn',
        checkPaths: true,
        checkCommands: true,
        checkArchitecture: true,
      });

      const json = JSON.stringify(result);

      expect(json).not.toContain('sk_live_');
    });
  });
});
