import type { MemoryEngine } from '../core/memory-engine.js';
import {
  ActivityCapture,
  EventDeduplicator,
  EventQueue,
  SessionCapture,
} from '../capture/index.js';
import { MemoryProcessor } from '../processor/memory-processor.js';
import type { MemoryStore } from '../storage/memory-store.js';
import { deduplicateMemories } from '../memory/deduplicate.js';
import { ProjectManager } from '../core/project-manager.js';
import { TaskAutoEvidenceEngine } from '../tasks/auto-evidence.js';
import { TaskStore } from '../tasks/store.js';

export interface HookRuntimeOptions {
  projectId: string;
  memory: MemoryEngine;
  memoryStore: MemoryStore;
  maxEventsBeforeFlush?: number;
  projectRoot?: string;
  taskAgentId?: string;
  taskId?: string;
  autoTaskEvidence?: boolean;
}

export class HookRuntime {
  private readonly projectId: string;
  private readonly memory: MemoryEngine;
  private readonly memoryStore: MemoryStore;

  private readonly queue = new EventQueue();
  private readonly capture = new ActivityCapture(this.queue);
  private readonly session = new SessionCapture(this.capture);
  private readonly processor: MemoryProcessor;
  private readonly dedup = new EventDeduplicator();

  private readonly maxEventsBeforeFlush: number;
  private readonly taskAutoEvidence?: TaskAutoEvidenceEngine;
  private taskAutoEvidenceFailures = 0;

  constructor(options: HookRuntimeOptions) {
    this.projectId = options.projectId;
    this.memory = options.memory;
    this.memoryStore = options.memoryStore;

    this.maxEventsBeforeFlush = options.maxEventsBeforeFlush ?? 100;

    this.processor = new MemoryProcessor(this.memory);

    const autoEvidenceEnabled =
      options.autoTaskEvidence !== false &&
      process.env.TOOLNET_AUTO_TASK_EVIDENCE?.trim().toLowerCase() !== 'off';
    const taskAgentId = options.taskAgentId?.trim() || process.env.TOOLNET_AGENT_ID?.trim();

    if (autoEvidenceEnabled && taskAgentId) {
      try {
        const project = new ProjectManager().requireExisting(options.projectRoot ?? process.cwd());

        if (project.id === this.projectId) {
          this.taskAutoEvidence = new TaskAutoEvidenceEngine(new TaskStore(project), {
            projectRoot: project.rootPath,
            agentId: taskAgentId,
            targetTaskId:
              options.taskId?.trim() || process.env.TOOLNET_TASK_ID?.trim() || undefined,
          });
        }
      } catch {
        /*
         * Hook runtime must remain backward compatible.
         *
         * Missing Task project/claim support must never break
         * existing Memory capture.
         */
      }
    }
  }

  private async captureTaskEvidence(action: () => Promise<unknown>): Promise<void> {
    if (!this.taskAutoEvidence) {
      return;
    }

    try {
      await action();
    } catch {
      this.taskAutoEvidenceFailures += 1;
    }
  }

  async sessionStart(): Promise<void> {
    this.session.start(this.projectId);
    await this.flushIfNeeded();
  }

  async sessionEnd(): Promise<void> {
    this.session.end(this.projectId);
    await this.flush();
  }

  async userPrompt(content: string): Promise<void> {
    this.capture.capture(this.projectId, 'user_prompt', { content });

    await this.flushIfNeeded();
  }

  async beforeTool(tool: string, input?: unknown): Promise<void> {
    this.capture.capture(this.projectId, 'tool_call', {
      phase: 'before',
      tool,
      input,
    });

    await this.flushIfNeeded();
  }

  async afterTool(tool: string, output?: unknown): Promise<void> {
    this.capture.capture(this.projectId, 'tool_call', {
      phase: 'after',
      tool,
      output,
    });

    await this.flushIfNeeded();
  }

  async fileRead(filePath: string): Promise<void> {
    this.capture.capture(this.projectId, 'file_read', { filePath });

    await this.flushIfNeeded();
  }

  async fileWrite(filePath: string): Promise<void> {
    this.capture.capture(this.projectId, 'file_write', { filePath });

    await this.captureTaskEvidence(() => this.taskAutoEvidence!.recordFileWrite(filePath));

    await this.flushIfNeeded();
  }

  async command(command: string, exitCode?: number): Promise<void> {
    this.capture.capture(this.projectId, 'command', {
      command,
      exitCode,
    });

    await this.captureTaskEvidence(() => this.taskAutoEvidence!.recordCommand(command, exitCode));

    await this.flushIfNeeded();
  }

  async error(error: unknown): Promise<void> {
    const message = error instanceof Error ? error.message : String(error);

    this.capture.capture(this.projectId, 'error', { message });

    await this.flushIfNeeded();
  }

  async decision(content: string, metadata: Record<string, unknown> = {}): Promise<void> {
    this.capture.capture(this.projectId, 'decision', {
      content,
      ...metadata,
    });

    await this.flushIfNeeded();
  }

  async todo(content: string, metadata: Record<string, unknown> = {}): Promise<void> {
    this.capture.capture(this.projectId, 'todo', {
      content,
      ...metadata,
    });

    await this.flushIfNeeded();
  }

  async flushIfNeeded(): Promise<void> {
    if (this.queue.shouldFlush(this.maxEventsBeforeFlush)) {
      await this.flush();
    }
  }

  async flush(): Promise<number> {
    const events = this.queue.drain();

    if (events.length === 0) {
      return 0;
    }

    const uniqueEvents = this.dedup.filter(events);

    if (uniqueEvents.length === 0) {
      return 0;
    }

    const created = this.processor.process(uniqueEvents);

    const records = deduplicateMemories(this.memory.exportProject(this.projectId));

    this.memory.clearProject(this.projectId);

    this.memory.importRecords(records);

    await this.memoryStore.save(this.projectId, records);

    return created;
  }

  pendingEvents(): number {
    return this.queue.size();
  }

  taskEvidenceFailureCount(): number {
    return this.taskAutoEvidenceFailures;
  }

  taskAutoEvidenceEnabled(): boolean {
    return Boolean(this.taskAutoEvidence);
  }
}
