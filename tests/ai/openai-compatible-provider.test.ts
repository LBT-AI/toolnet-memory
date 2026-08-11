import { afterEach, describe, expect, it, vi } from 'vitest';

import { OpenAiCompatibleProvider } from '../../src/ai/providers/openai-compatible.js';

function completionResponse(): Response {
  return new Response(
    JSON.stringify({
      choices: [
        {
          message: {
            content: 'OK',
          },
        },
      ],
      usage: {
        prompt_tokens: 1,
        completion_tokens: 1,
        total_tokens: 2,
      },
    }),
    {
      status: 200,
      headers: {
        'content-type': 'application/json',
      },
    }
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('OpenAiCompatibleProvider provider-specific request body', () => {
  it('disables thinking for non-streaming Alibaba / DashScope calls', async () => {
    const fetchMock = vi.fn().mockResolvedValue(completionResponse());

    vi.stubGlobal('fetch', fetchMock);

    const provider = new OpenAiCompatibleProvider({
      id: 'alibaba',
      apiKey: 'test-key',
      baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
      model: 'qwen3.6-flash',
    });

    await provider.generate({
      messages: [
        {
          role: 'user',
          content: 'Reply exactly: OK',
        },
      ],
      temperature: 0,
      maxTokens: 8,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const call = fetchMock.mock.calls[0];
    const init = call?.[1] as RequestInit;
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;

    expect(body.model).toBe('qwen3.6-flash');
    expect(body.enable_thinking).toBe(false);
    expect(body.stream).toBeUndefined();
  });

  it('does not send DashScope-specific fields to other OpenAI-compatible providers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(completionResponse());

    vi.stubGlobal('fetch', fetchMock);

    const provider = new OpenAiCompatibleProvider({
      id: 'openrouter',
      apiKey: 'test-key',
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'test-model',
    });

    await provider.generate({
      messages: [
        {
          role: 'user',
          content: 'Reply exactly: OK',
        },
      ],
      temperature: 0,
      maxTokens: 8,
    });

    const call = fetchMock.mock.calls[0];
    const init = call?.[1] as RequestInit;
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;

    expect(body).not.toHaveProperty('enable_thinking');
  });
});
