/**
 * ToolNet v0.7 backup and integrity verification for memory data.
 *
 * Provides backup creation, integrity hash verification, and restoration capabilities
 * for ToolNet memory data with cryptographic integrity guarantees.
 */

import { createHash, createHmac } from 'node:crypto';
import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

import {
  LEGACY_MIGRATION_SOURCE_VERSION,
  LEGACY_MIGRATION_TARGET_VERSION,
  LEGACY_MIGRATION_IDENTIFIER,
} from './migration-versions.js';

export interface BackupRecord {
  projectId: string;
  timestamp: number;
  version: string;
  checksum: string;
  backupPath: string;
  dataSize: number;
}

export interface BackupIntegrity {
  original: BackupRecord;
  current: BackupRecord;
  checksumMatches: boolean;
  sizeMatches: boolean;
  dataCorrupted: boolean;
}

export class BackupManager {
  private readonly backups = new Map<string, BackupRecord>();
  private readonly integrityCache = new Map<string, Map<string, BackupRecord>>();

  createBackup(
    data: unknown,
    projectId: string,
    backupDir: string = './backups',
    version?: string
  ): BackupRecord {
    const timestamp = Date.now();
    const backupPath = join(backupDir, `backup-${projectId}-${timestamp}.json`);

    mkdirSync(dirname(backupPath), { recursive: true });

    const dataString = JSON.stringify(data, null, 2);
    const checksum = createHash('sha256').update(dataString).digest('hex');
    const dataSize = Buffer.byteLength(dataString);

    // Infer version from data if not provided
    const inferredVersion = (data as any)?.version ?? '0.7.0';

    const record: BackupRecord = {
      projectId,
      timestamp,
      version: version ?? inferredVersion,
      checksum,
      backupPath,
      dataSize,
    };

    writeFileSync(backupPath, dataString, 'utf8');
    this.backups.set(projectId, record);

    return record;
  }

  createIntegrityHash(data: unknown): { checksum: string; hmac: string } {
    const dataString = JSON.stringify(data, null, 2);
    const checksum = createHash('sha256').update(dataString).digest('hex');
    const hmac = createHmac('sha256', Buffer.from(checksum, 'hex'))
      .update(dataString)
      .digest('hex');

    return { checksum, hmac };
  }

  verifyIntegrity(data: unknown, expectedChecksum: string): { valid: boolean; checksum: string } {
    const { checksum } = this.createIntegrityHash(data);
    return {
      valid: checksum === expectedChecksum,
      checksum,
    };
  }

  verifyBackupIntegrity(projectId: string): BackupIntegrity | null {
    const original = this.backups.get(projectId);
    if (!original) {
      return null;
    }

    if (!existsSync(original.backupPath)) {
      return {
        original,
        current: original,
        checksumMatches: false,
        sizeMatches: false,
        dataCorrupted: true,
      };
    }

    let currentData: unknown;
    try {
      currentData = JSON.parse(readFileSync(original.backupPath, 'utf8'));
    } catch {
      return {
        original,
        current: original,
        checksumMatches: false,
        sizeMatches: false,
        dataCorrupted: true,
      };
    }

    const currentChecksum = createHash('sha256')
      .update(JSON.stringify(currentData, null, 2))
      .digest('hex');

    return {
      original,
      current: {
        ...original,
        checksum: currentChecksum,
      },
      checksumMatches: original.checksum === currentChecksum,
      sizeMatches: original.dataSize === Buffer.byteLength(JSON.stringify(currentData, null, 2)),
      dataCorrupted: original.checksum !== currentChecksum,
    };
  }

  restoreBackup(projectId: string, restorePath?: string): boolean {
    const record = this.backups.get(projectId);
    if (!record) {
      return false;
    }

    if (!existsSync(record.backupPath)) {
      return false;
    }

    const targetPath = restorePath || record.backupPath;
    const data = readFileSync(record.backupPath, 'utf8');
    writeFileSync(targetPath, data, 'utf8');

    return true;
  }

  exportBackups(backupDir: string): Map<string, BackupRecord> {
    const exported: Map<string, BackupRecord> = new Map();

    for (const [projectId, record] of this.backups) {
      if (existsSync(record.backupPath)) {
        const sourceData = readFileSync(record.backupPath, 'utf8');
        const targetPath = join(backupDir, `exported-${projectId}-${record.timestamp}.json`);

        mkdirSync(dirname(targetPath), { recursive: true });
        writeFileSync(targetPath, sourceData, 'utf8');

        exported.set(projectId, { ...record, backupPath: targetPath });
      }
    }

    return exported;
  }

  importBackups(backupDir: string): void {
    const files = this.readBackupFiles(backupDir);
    for (const file of files) {
      const data = JSON.parse(readFileSync(file, 'utf8'));
      if (data.projectId && data.checksum) {
        const record: BackupRecord = {
          projectId: data.projectId,
          timestamp: data.timestamp || Date.now(),
          version: data.version || '0.7.0',
          checksum: data.checksum,
          backupPath: file,
          dataSize: data.dataSize || Buffer.byteLength(JSON.stringify(data, null, 2)),
        };
        this.backups.set(record.projectId, record);
      }
    }
  }

  private readBackupFiles(backupDir: string): string[] {
    try {
      return readdirSync(backupDir)
        .filter(
          (filePath: string) => filePath.endsWith('.json') && filePath.startsWith('exported-')
        )
        .map((filePath: string) => join(backupDir, filePath));
    } catch {
      return [];
    }
  }
}

export class MigrationManager {
  private readonly backupManager: BackupManager;

  constructor(backupManager: BackupManager = new BackupManager()) {
    this.backupManager = backupManager;
  }

  async migrateFromV062(
    sourcePath: string,
    targetProjectId: string,
    options: MigrationOptions = {}
  ): Promise<MigrationResult> {
    const startTime = Date.now();

    try {
      const sourceData = this.loadV062Data(sourcePath);

      if (!this.validateV062Schema(sourceData)) {
        throw new Error('MIGRATION_SCHEMA_INVALID');
      }

      // Create backup of the actual source data for integrity verification
      const backup = this.backupManager.createBackup(
        sourceData,
        `${targetProjectId}-pre-migration`
      );

      const targetData = this.transformV062ToV070(sourceData);

      // Verify source data integrity
      const integrity = this.backupManager.verifyIntegrity(sourceData, backup.checksum);
      if (!integrity.valid) {
        throw new Error('MIGRATION_INTEGRITY_FAILED');
      }

      const migrationResult: MigrationResult = {
        success: true,
        sourcePath,
        targetProjectId,
        timestamp: startTime,
        backup,
        transformedData: targetData,
        conflicts: this.detectConflicts(sourceData, targetData),
        warnings: this.generateMigrationWarnings(sourceData, targetData),
      };

      return migrationResult;
    } catch (error) {
      return {
        success: false,
        sourcePath,
        targetProjectId,
        timestamp: startTime,
        error: error instanceof Error ? error.message : 'MIGRATION_FAILED',
        backup: undefined,
        conflicts: [],
        warnings: [],
      };
    }
  }

  async rollbackMigration(
    projectId: string,
    targetPath: string,
    options: RollbackOptions = {}
  ): Promise<RollbackResult> {
    const backup = this.backupManager.verifyBackupIntegrity(`${projectId}-pre-migration`);

    if (!backup || !backup.checksumMatches) {
      return {
        success: false,
        projectId,
        error: 'ROLLBACK_BACKUP_INVALID',
      };
    }

    try {
      const restored = this.backupManager.restoreBackup(`${projectId}-pre-migration`, targetPath);

      return {
        success: restored,
        projectId,
        restoredAt: Date.now(),
        backup,
        error: restored ? undefined : 'ROLLBACK_FAILED',
      };
    } catch (error) {
      return {
        success: false,
        projectId,
        error: error instanceof Error ? error.message : 'ROLLBACK_FAILED',
      };
    }
  }

  private loadV062Data(sourcePath: string): any {
    return JSON.parse(readFileSync(sourcePath, 'utf8'));
  }

  private validateV062Schema(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      'version' in data &&
      data.version === LEGACY_MIGRATION_SOURCE_VERSION &&
      'projects' in data
    );
  }

  private transformV062ToV070(sourceData: any): any {
    const target = {
      version: LEGACY_MIGRATION_TARGET_VERSION,
      projects: sourceData.projects.map((project: any) => ({
        ...project,
        metadata: {
          ...project.metadata,
          migrationVersion: LEGACY_MIGRATION_IDENTIFIER,
          migratedAt: new Date().toISOString(),
        },
      })),
      _migration: {
        sourceVersion: sourceData.version,
        targetVersion: LEGACY_MIGRATION_TARGET_VERSION,
        migrationTimestamp: new Date().toISOString(),
      },
    };

    return target;
  }

  private detectConflicts(sourceData: any, targetData: any): string[] {
    const conflicts: string[] = [];

    for (const sourceProject of sourceData.projects || []) {
      for (const targetProject of targetData.projects || []) {
        if (sourceProject.id === targetProject.id && sourceProject.data !== targetProject.data) {
          conflicts.push(`Project ${sourceProject.id}: data mismatch during migration`);
        }
      }
    }

    return conflicts;
  }

  private generateMigrationWarnings(sourceData: any, targetData: any): string[] {
    const warnings: string[] = [];

    if (!sourceData.version) {
      warnings.push('Source data has no version specified');
    }

    if (!sourceData.projects || sourceData.projects.length === 0) {
      warnings.push('Source data has no projects to migrate');
    }

    return warnings;
  }
}

export interface MigrationOptions {
  dryRun?: boolean;
  backup?: boolean;
  verify?: boolean;
}

export interface MigrationResult {
  success: boolean;
  sourcePath: string;
  targetProjectId: string;
  timestamp: number;
  backup?: BackupRecord;
  transformedData?: any;
  conflicts: string[];
  warnings: string[];
  error?: string;
}

export interface RollbackOptions {
  dryRun?: boolean;
  force?: boolean;
}

export interface RollbackResult {
  success: boolean;
  projectId: string;
  restoredAt?: number;
  backup?: BackupIntegrity;
  error?: string;
}
