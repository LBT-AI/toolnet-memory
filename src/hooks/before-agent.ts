import type { HookRuntime } from "./runtime.js";
import type { AutoContextBuilder } from "./auto-context.js";

export interface BeforeAgentResult {
  prompt: string;
  memoryContext: string;
  augmentedPrompt: string;
}

export async function beforeAgent(
  runtime: HookRuntime,
  contextBuilder: AutoContextBuilder,
  projectId: string,
  prompt: string,
): Promise<BeforeAgentResult> {
  await runtime.userPrompt(
    prompt,
  );

  const memoryContext =
    contextBuilder.build(
      projectId,
      prompt,
    );

  const augmentedPrompt =
    memoryContext
      ? [
          "<toolnet_memory>",
          memoryContext,
          "</toolnet_memory>",
          "",
          prompt,
        ].join("\n")
      : prompt;

  return {
    prompt,
    memoryContext,
    augmentedPrompt,
  };
}
