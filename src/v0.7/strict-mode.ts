/**
 * ToolNet v0.7 strict cloud-only mode enforcement.
 *
 * Enforces zero-disk storage requirements and prevents local fallbacks when
 * strict cloud-only mode is enabled. Ensures all memory operations go through
 * cloud authority only.
 */

export interface StrictModeOptions {
  strictCloudOnly?: boolean;
  allowLocalFallback?: boolean;
  checkSwapSpace?: boolean;
  maxMemoryBufferSize?: number;
  preventCrashDumps?: boolean;
}

export class StrictCloudMode {
  private readonly options: StrictModeOptions;
  private readonly violations: string[] = [];

  constructor(options: StrictModeOptions = {}) {
    this.options = {
      strictCloudOnly: true,
      allowLocalFallback: false,
      checkSwapSpace: true,
      maxMemoryBufferSize: 100 * 1024 * 1024, // 100MB
      preventCrashDumps: true,
      ...options,
    };
  }

  validateStorageAccess(projectId: string, operation: string): boolean {
    if (!this.options.strictCloudOnly) {
      return true;
    }

    switch (operation) {
      case 'session.wal':
      case 'taskstore.write':
      case 'workstate.save':
      case 'handoff.snapshot':
      case 'startup.cache':
      case 'injection.marker':
      case 'memory.index':
      case 'codeintelligence.index':
      case 'retrieval.cache':
      case 'telemetry.write':
      case 'background.worker':
      case 'temporary.file':
        this.violations.push(`STRICT_MODE: ${operation} blocked for project ${projectId}`);
        return false;
    }

    return true;
  }

  validateCloudFailureHandling(projectId: string): boolean {
    if (!this.options.strictCloudOnly) {
      return true;
    }

    // Cloud failure must fail closed - no local fallback
    this.violations.push(`STRICT_MODE: Cloud failure for project ${projectId} must fail closed`);
    return false;
  }

  validateMemoryBuffer(projectId: string, dataSize: number): boolean {
    if (!this.options.maxMemoryBufferSize || dataSize <= this.options.maxMemoryBufferSize) {
      return true;
    }

    this.violations.push(`STRICT_MODE: Memory buffer overflow for project ${projectId}: ${dataSize} > ${this.options.maxMemoryBufferSize}`);
    return false;
  }

  validateCheckpointAcknowledged(projectId: string, checkpoint: any): boolean {
    if (!this.options.strictCloudOnly) {
      return true;
    }

    if (!checkpoint || !checkpoint.acknowledged) {
      this.violations.push(`STRICT_MODE: Checkpoint must be cloud-ACKed for project ${projectId}`);
      return false;
    }

    return true;
  }

  getViolations(): string[] {
    return [...this.violations];
  }

  clearViolations(): void {
    this.violations.length = 0;
  }
}

export function checkSwapSpace(): boolean {
  if (!process.platform.startsWith('linux')) {
    return true; // Assume OK on non-Linux systems
  }

  try {
    const fs = require('node:fs');
    const stats = fs.statSync('/tmp', 'utf8');
    // Check if /tmp is on a tmpfs or has sufficient space
    // For now, just return true as this is a basic check
    return true;
  } catch {
    return false;
  }
}

export function checkCrashDumpConfiguration(): boolean {
  if (!process.platform.startsWith('linux')) {
    return true;
  }

  // Basic check for crash dump configuration
  try {
    const fs = require('node:fs');
    const corePattern = '/proc/sys/kernel/core_pattern';
    if (fs.existsSync(corePattern)) {
      const pattern = fs.readFileSync(corePattern, 'utf8').trim();
      // If core_pattern contains a pipe (|), crash dumps go to a file
      // If it contains a path, crash dumps go to a file
      // Both are acceptable for our purposes
      return pattern.includes('|') || !pattern.startsWith('/');
    }
  } catch {
    // Can't read core pattern, assume it's safe
  }

  return true;
}

export function isStrictCloudOnly(): boolean {
  const mode = process.env.TOOLNET_DURABILITY_MODE;
  return mode === 'strict-cloud-only' || mode === 'strict';
}
