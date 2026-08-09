export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retry<T>(
  operation: () => Promise<T>,

  options: RetryOptions = {}
): Promise<T> {
  const attempts = Math.max(1, options.attempts ?? 3);

  const baseDelayMs = options.baseDelayMs ?? 150;

  const maxDelayMs = options.maxDelayMs ?? 2000;

  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt >= attempts) {
        break;
      }

      const exponential = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));

      const jitter = Math.floor(Math.random() * Math.max(1, exponential * 0.2));

      await sleep(exponential + jitter);
    }
  }

  throw lastError;
}
