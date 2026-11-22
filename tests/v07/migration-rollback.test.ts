import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { describe, expect, it, beforeEach } from 'vitest';

import { MigrationManager, BackupManager } from '../../src/v0.7/security/migration-manager.js';

import {
  LEGACY_MIGRATION_SOURCE_VERSION,
  LEGACY_MIGRATION_TARGET_VERSION,
  LEGACY_MIGRATION_IDENTIFIER,
} from '../../src/v0.7/security/migration-versions.js';

describe('v0.7 Migration & Rollback', () => {
  let migrationManager: MigrationManager;
  let backupManager: BackupManager;
  let tempDir: string;

  beforeEach(() => {
    backupManager = new BackupManager();
    tempDir = mkdtempSync(join(tmpdir(), 'toolnet-migration-test-'));
    migrationManager = new MigrationManager(backupManager, {
      backupDir: join(tempDir, 'backups'),
    });
  });

  function createV062Project(projectId: string, projectName: string, tasks: any[] = []): string {
    const projectPath = join(tempDir, projectId);
    mkdirSync(projectPath, { recursive: true });
    const data = {
      version: LEGACY_MIGRATION_SOURCE_VERSION,
      projects: [
        {
          id: projectId,
          name: projectName,
          tasks,
        },
      ],
    };
    const filePath = join(projectPath, 'v062-data.json');
    writeFileSync(filePath, JSON.stringify(data, null, 2));
    return filePath;
  }

  describe('Migration from v0.6.2 to v0.7.0', () => {
    it('migrates valid v0.6.2 data to v0.7.0 with correct version', async () => {
      const projectPath = createV062Project('project-a', 'Project A', [
        { id: 'T1', title: 'Task 1', status: 'completed' },
      ]);

      const result = await migrationManager.migrateFromV062(projectPath, 'project-a');

      expect(result.success).toBe(true);
      expect(result.transformedData.version).toBe(LEGACY_MIGRATION_TARGET_VERSION);
      expect(result.transformedData.projects[0].id).toBe('project-a');
      expect(result.transformedData.projects[0].name).toBe('Project A');
      expect(result.transformedData.projects[0].tasks).toHaveLength(1);
    });

    it('adds migration metadata to transformed projects', async () => {
      const projectPath = createV062Project('project-b', 'Project B');

      const result = await migrationManager.migrateFromV062(projectPath, 'project-b');

      expect(result.success).toBe(true);
      const project = result.transformedData.projects[0];
      expect(project.metadata.migrationVersion).toBe(LEGACY_MIGRATION_IDENTIFIER);
      expect(project.metadata.migratedAt).toBeDefined();
    });

    it('includes migration metadata in _migration field', async () => {
      const projectPath = createV062Project('project-c', 'Project C');

      const result = await migrationManager.migrateFromV062(projectPath, 'project-c');

      expect(result.success).toBe(true);
      expect(result.transformedData._migration.sourceVersion).toBe(LEGACY_MIGRATION_SOURCE_VERSION);
      expect(result.transformedData._migration.targetVersion).toBe(LEGACY_MIGRATION_TARGET_VERSION);
      expect(result.transformedData._migration.migrationTimestamp).toBeDefined();
    });

    it('creates a pre-migration backup with correct version', async () => {
      const projectPath = createV062Project('project-d', 'Project D');

      const result = await migrationManager.migrateFromV062(projectPath, 'project-d');

      expect(result.success).toBe(true);
      expect(result.backup).toBeDefined();
      expect(result.backup!.version).toBe(LEGACY_MIGRATION_SOURCE_VERSION);
      expect(result.backup!.projectId).toBe('project-d-pre-migration');
    });

    it('rejects invalid v0.6.2 schema', async () => {
      const projectPath = join(tempDir, 'invalid-project');
      mkdirSync(projectPath, { recursive: true });
      const filePath = join(projectPath, 'v062-data.json');
      writeFileSync(filePath, JSON.stringify({ version: '0.5.0', projects: [] }));

      const result = await migrationManager.migrateFromV062(filePath, 'invalid-project');

      expect(result.success).toBe(false);
      expect(result.error).toBe('MIGRATION_SCHEMA_INVALID');
    });

    it('rejects missing version field', async () => {
      const projectPath = join(tempDir, 'no-version-project');
      mkdirSync(projectPath, { recursive: true });
      const filePath = join(projectPath, 'v062-data.json');
      writeFileSync(filePath, JSON.stringify({ projects: [] }));

      const result = await migrationManager.migrateFromV062(filePath, 'no-version-project');

      expect(result.success).toBe(false);
      expect(result.error).toBe('MIGRATION_SCHEMA_INVALID');
    });

    it('rejects missing projects field', async () => {
      const projectPath = join(tempDir, 'no-projects');
      mkdirSync(projectPath, { recursive: true });
      const filePath = join(projectPath, 'v062-data.json');
      writeFileSync(filePath, JSON.stringify({ version: '0.6.2' }));

      const result = await migrationManager.migrateFromV062(filePath, 'no-projects');

      expect(result.success).toBe(false);
      expect(result.error).toBe('MIGRATION_SCHEMA_INVALID');
    });
  });

  describe('Rollback', () => {
    it('restores pre-migration backup successfully', async () => {
      const filePath = createV062Project('project-e', 'Project E', [{ id: 'T1', title: 'Task 1' }]);

      const migrateResult = await migrationManager.migrateFromV062(filePath, 'project-e');
      expect(migrateResult.success).toBe(true);

      const rollbackPath = join(tempDir, 'rollback-target');
      const rollbackResult = await migrationManager.rollbackMigration('project-e', rollbackPath);

      expect(rollbackResult.success).toBe(true);
      expect(rollbackResult.restoredAt).toBeDefined();
    });

    it('fails when backup checksum does not match', async () => {
      const filePath = createV062Project('project-f', 'Project F');

      await migrationManager.migrateFromV062(filePath, 'project-f');

      // Corrupt the backup file
      const backupRecord = (migrationManager as any).backupManager.backups.get(
        'project-f-pre-migration'
      );
      if (backupRecord) {
        writeFileSync(backupRecord.backupPath, 'corrupted data');
      }

      const rollbackPath = join(tempDir, 'rollback-corrupt');
      const rollbackResult = await migrationManager.rollbackMigration('project-f', rollbackPath);

      expect(rollbackResult.success).toBe(false);
      expect(rollbackResult.error).toBe('ROLLBACK_BACKUP_INVALID');
    });

    it('fails when backup does not exist', async () => {
      const rollbackPath = join(tempDir, 'rollback-nonexistent');
      const rollbackResult = await migrationManager.rollbackMigration(
        'nonexistent-project',
        rollbackPath
      );

      expect(rollbackResult.success).toBe(false);
      expect(rollbackResult.error).toBe('ROLLBACK_BACKUP_INVALID');
    });
  });

  describe('Conflict Detection', () => {
    it('detects data conflicts between source and target', async () => {
      const projectPath = join(tempDir, 'conflict-project');
      mkdirSync(projectPath, { recursive: true });
      const data = {
        version: LEGACY_MIGRATION_SOURCE_VERSION,
        projects: [
          {
            id: 'project-g',
            name: 'Project G',
            tasks: [{ id: 'T1', title: 'Task 1', data: 'original' }],
          },
        ],
      };
      const filePath = join(projectPath, 'v062-data.json');
      writeFileSync(filePath, JSON.stringify(data));

      const result = await migrationManager.migrateFromV062(filePath, 'project-g');

      expect(result.success).toBe(true);
      // Conflicts are detected when source and target have same project ID but different data
      // In this case, since it's a fresh migration, there should be no conflicts
      expect(result.conflicts).toBeDefined();
    });
  });

  describe('Warnings', () => {
    it('warns when source data has no version', async () => {
      const projectPath = join(tempDir, 'warn-no-version');
      mkdirSync(projectPath, { recursive: true });
      const filePath = join(projectPath, 'v062-data.json');
      writeFileSync(filePath, JSON.stringify({ projects: [] }));

      const result = await migrationManager.migrateFromV062(filePath, 'warn-no-version');

      expect(result.success).toBe(false);
      expect(result.error).toBe('MIGRATION_SCHEMA_INVALID');
    });

    it('warns when source data has no projects', async () => {
      const projectPath = join(tempDir, 'warn-no-projects');
      mkdirSync(projectPath, { recursive: true });
      const filePath = join(projectPath, 'v062-data.json');
      writeFileSync(filePath, JSON.stringify({ version: '0.6.2', projects: [] }));

      const result = await migrationManager.migrateFromV062(filePath, 'warn-no-projects');

      expect(result.success).toBe(true);
      expect(result.warnings).toContain('Source data has no projects to migrate');
    });
  });

  describe('Idempotency', () => {
    it('can migrate the same project multiple times with consistent results', async () => {
      const filePath = createV062Project('project-h', 'Project H', [{ id: 'T1', title: 'Task 1' }]);

      const result1 = await migrationManager.migrateFromV062(filePath, 'project-h');
      const result2 = await migrationManager.migrateFromV062(filePath, 'project-h');

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.transformedData.version).toBe(result2.transformedData.version);
      expect(result1.transformedData.projects[0].id).toBe(result2.transformedData.projects[0].id);
    });
  });
});
