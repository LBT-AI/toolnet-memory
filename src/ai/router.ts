import { loadAiConfig, resolveLlmFallbackOptions, resolveLlmFallbacks } from './config.js';

import { FallbackAiRouter } from './fallback.js';

import type { AiGenerateOptions, AiGenerateResult, AiProvider } from './types.js';

function createDefaultRouter(): FallbackAiRouter {
  const config = loadAiConfig();

  const fallbacks = resolveLlmFallbacks();

  return new FallbackAiRouter(
    {
      label: `Primary (${config.llm.provider})`,

      config: {
        id: config.llm.provider,
        apiKey: config.llm.apiKey,
        baseUrl: config.llm.baseUrl,
        model: config.llm.model,
        accountId: config.llm.accountId,
      },
    },

    fallbacks.map((item) => ({
      label: `Fallback ${item.slot} (${item.config.provider})`,

      config: {
        id: item.config.provider,
        apiKey: item.config.apiKey,
        baseUrl: item.config.baseUrl,
        model: item.config.model,
        accountId: item.config.accountId,
      },
    })),

    resolveLlmFallbackOptions()
  );
}

export class AiRouter {
  constructor(private provider: AiProvider = createDefaultRouter()) {}

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

export function createResilientAiRouter(): AiRouter {
  return new AiRouter(createDefaultRouter());
}
