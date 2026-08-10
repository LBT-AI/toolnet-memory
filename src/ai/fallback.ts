import { AiHttpError } from './http.js';

import type {
  AiGenerateOptions,
  AiGenerateResult,
  AiHealthResult,
  AiProvider,
  AiProviderConfig,
} from './types.js';

import { createAiProvider } from './factory.js';

export interface FallbackProviderConfig {
  config: AiProviderConfig;
  label: string;
}

export interface FallbackRouterOptions {
  cooldownMs?: number;
  maxRetries?: number;
}

type ProviderState = {
  failures: number;
  cooldownUntil: number;
  lastError?: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function isRetryableProviderError(error: unknown): boolean {
  if (error instanceof AiHttpError) {
    const status = error.status;

    if (status === undefined) {
      return true;
    }

    if (status === 408 || status === 409 || status === 425 || status === 429) {
      return true;
    }

    return status >= 500;
  }

  if (!(error instanceof Error)) {
    return true;
  }

  const message = error.message.toLowerCase();

  if (
    message.includes('401') ||
    message.includes('403') ||
    message.includes('400') ||
    message.includes('invalid api key') ||
    message.includes('unauthorized') ||
    message.includes('forbidden')
  ) {
    return false;
  }

  return (
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('abort') ||
    message.includes('network') ||
    message.includes('fetch failed') ||
    message.includes('econnreset') ||
    message.includes('econnrefused') ||
    message.includes('429') ||
    message.includes('rate limit') ||
    message.includes('500') ||
    message.includes('502') ||
    message.includes('503') ||
    message.includes('504')
  );
}

export class FallbackAiRouter implements AiProvider {
  readonly id;
  readonly config;

  private readonly providers: Array<{
    provider: AiProvider;
    label: string;
  }>;

  private readonly states = new Map<string, ProviderState>();

  private readonly cooldownMs: number;
  private readonly maxRetries: number;

  constructor(
    primary: FallbackProviderConfig,
    fallbacks: FallbackProviderConfig[] = [],
    options: FallbackRouterOptions = {}
  ) {
    this.id = primary.config.id;
    this.config = primary.config;

    this.cooldownMs = options.cooldownMs ?? 60_000;

    this.maxRetries = Math.max(0, options.maxRetries ?? 1);

    this.providers = [primary, ...fallbacks].map((item) => ({
      provider: createAiProvider(item.config),
      label: item.label,
    }));
  }

  private key(index: number): string {
    const item = this.providers[index];

    return `${index}:${item.provider.id}:${item.provider.config.model ?? ''}`;
  }

  private state(index: number): ProviderState {
    const key = this.key(index);

    let state = this.states.get(key);

    if (!state) {
      state = {
        failures: 0,
        cooldownUntil: 0,
      };

      this.states.set(key, state);
    }

    return state;
  }

  private available(index: number): boolean {
    return this.state(index).cooldownUntil <= Date.now();
  }

  private success(index: number): void {
    const state = this.state(index);

    state.failures = 0;
    state.cooldownUntil = 0;
    state.lastError = undefined;
  }

  private fail(index: number, error: unknown): void {
    const state = this.state(index);

    state.failures += 1;

    state.lastError = error instanceof Error ? error.message : String(error);

    state.cooldownUntil = Date.now() + this.cooldownMs;
  }

  async generate(options: AiGenerateOptions): Promise<AiGenerateResult> {
    const errors: string[] = [];

    for (let index = 0; index < this.providers.length; index += 1) {
      if (!this.available(index)) {
        errors.push(`${this.providers[index].label}: cooldown`);

        continue;
      }

      const item = this.providers[index];

      for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
        try {
          const result = await item.provider.generate(options);

          this.success(index);

          return result;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);

          const retryable = isRetryableProviderError(error);

          errors.push(`${item.label}: ${message}`);

          /*
           * Auth/config errors MUST NOT cascade to another
           * provider silently. Fix the configuration instead.
           */
          if (!retryable) {
            throw error;
          }

          if (attempt < this.maxRetries) {
            await sleep(Math.min(250 * 2 ** attempt, 2_000));

            continue;
          }

          this.fail(index, error);
        }
      }
    }

    throw new Error(`All ToolNet LLM providers failed: ${errors.join(' | ')}`);
  }

  async healthCheck(): Promise<AiHealthResult> {
    const started = Date.now();

    try {
      const result = await this.generate({
        messages: [
          {
            role: 'user',
            content: 'Reply exactly: OK',
          },
        ],
        temperature: 0,
        maxTokens: 8,
      });

      return {
        ok: true,
        provider: result.provider,
        model: result.model,
        message: 'Fallback chain reachable',
        latencyMs: Date.now() - started,
      };
    } catch (error) {
      return {
        ok: false,
        provider: this.id,
        model: this.config.model,
        message: error instanceof Error ? error.message : String(error),
        latencyMs: Date.now() - started,
      };
    }
  }

  status(): Array<{
    position: number;
    provider: string;
    model?: string;
    cooldown: boolean;
    cooldownUntil?: number;
    failures: number;
    lastError?: string;
  }> {
    return this.providers.map((item, index) => {
      const state = this.state(index);

      return {
        position: index,
        provider: item.provider.id,
        model: item.provider.config.model,
        cooldown: state.cooldownUntil > Date.now(),
        cooldownUntil: state.cooldownUntil || undefined,
        failures: state.failures,
        lastError: state.lastError,
      };
    });
  }
}
