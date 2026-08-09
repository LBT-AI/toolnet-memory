import type { HookRuntime } from './runtime.js';
import type { AutoContextBuilder } from './auto-context.js';

export class AutoRetrieval {
  constructor(
    private readonly runtime: HookRuntime,
    private readonly builder: AutoContextBuilder,
    private readonly projectId: string
  ) {}

  async prepare(prompt: string) {
    await this.runtime.userPrompt(prompt);

    const context = this.builder.build(this.projectId, prompt);

    return {
      originalPrompt: prompt,

      context,

      augmentedPrompt: context
        ? ['<toolnet_memory>', context, '</toolnet_memory>', '', prompt].join('\n')
        : prompt,
    };
  }
}
