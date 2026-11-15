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
  maxMemoryBufferSize?: number;
}

export class StrictCloudMode {
  private readonly options: StrictModeOptions;
  private readonly violations: string[] = [];

  constructor(options: StrictModeOptions = {}) {
    this.options = {
      strictCloudOnly: true,
      allowLocalFallback: false,
      maxMemoryBufferSize: 100 * 1024 * 1024, // 100MB
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

    this.violations.push(
      `STRICT_MODE: Memory buffer overflow for project ${projectId}: ${dataSize} > ${this.options.maxMemoryBufferSize}`
    );
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
