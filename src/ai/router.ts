import { createAiProvider } from './factory.js';

import type { AiGenerateOptions, AiGenerateResult, AiProvider } from './types.js';

export class AiRouter {
  constructor(private provider: AiProvider = createAiProvider()) {}

  get activeProvider(): AiProvider {
    return this.provider;
  }

  setProvider(provider: AiProvider): void {
    this.provider = provider;
  }

  generate(options: AiGenerateOptions): Promise<AiGenerateResult> {
    return this.provider.generate(options);
  }
}
