import type { HookRuntime } from '../../src/hooks/runtime.js';

import type { AutoRetrieval } from '../../src/hooks/auto-retrieval.js';

import type { AutoImpactGuard } from '../../src/hooks/auto-impact-guard.js';

export class ToolNetMemoryClient {
  constructor(
    private readonly runtime: HookRuntime,

    private readonly autoRetrieval?: AutoRetrieval,

    private readonly autoImpactGuard?: AutoImpactGuard
  ) {}

  sessionStart() {
    return this.runtime.sessionStart();
  }

  sessionEnd() {
    return this.runtime.sessionEnd();
  }

  prompt(content: string) {
    return this.runtime.userPrompt(content);
  }

  preparePrompt(content: string) {
    if (!this.autoRetrieval) {
      return Promise.resolve({
        originalPrompt: content,

        context: '',

        augmentedPrompt: content,
      });
    }

    return this.autoRetrieval.prepare(content);
  }

  /*
   * Đây là hook ToolNet Agent cần gọi
   * TRƯỚC tool executor.
   */
  async beforeTool(tool: string, input?: unknown) {
    const impact = this.autoImpactGuard ? await this.autoImpactGuard.beforeTool(tool, input) : null;

    await this.runtime.beforeTool(tool, input);

    return impact;
  }

  afterTool(tool: string, output?: unknown) {
    return this.runtime.afterTool(tool, output);
  }

  fileRead(filePath: string) {
    return this.runtime.fileRead(filePath);
  }

  fileWrite(filePath: string) {
    return this.runtime.fileWrite(filePath);
  }

  command(command: string, exitCode?: number) {
    return this.runtime.command(command, exitCode);
  }

  error(error: unknown) {
    return this.runtime.error(error);
  }

  decision(content: string) {
    return this.runtime.decision(content);
  }

  todo(content: string) {
    return this.runtime.todo(content);
  }

  flush() {
    return this.runtime.flush();
  }
}
