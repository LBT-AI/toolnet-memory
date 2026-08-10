import { describe, expect, it } from 'vitest';

import { AiHttpError } from '../../src/ai/http.js';

import { isRetryableProviderError } from '../../src/ai/fallback.js';

describe('fallback router policy', () => {
  it('retries transient HTTP errors', () => {
    expect(isRetryableProviderError(new AiHttpError('rate limit', 429))).toBe(true);

    expect(isRetryableProviderError(new AiHttpError('temporary unavailable', 503))).toBe(true);

    expect(isRetryableProviderError(new AiHttpError('timeout', 408))).toBe(true);
  });

  it('does not fail over on bad credentials or bad requests', () => {
    expect(isRetryableProviderError(new AiHttpError('bad request', 400))).toBe(false);

    expect(isRetryableProviderError(new AiHttpError('unauthorized', 401))).toBe(false);

    expect(isRetryableProviderError(new AiHttpError('forbidden', 403))).toBe(false);
  });

  it('retries common network failures', () => {
    expect(isRetryableProviderError(new Error('fetch failed: ECONNRESET'))).toBe(true);

    expect(isRetryableProviderError(new Error('request timeout'))).toBe(true);
  });
});
