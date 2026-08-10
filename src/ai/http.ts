export class AiHttpError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'AiHttpError';
    this.status = status;
  }
}

export async function fetchJson<T>(url: string, init: RequestInit, timeoutMs = 30_000): Promise<T> {
  const controller = new AbortController();

  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  timeout.unref?.();

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });

    const body = await response.text();

    if (!response.ok) {
      let detail = body;

      try {
        const parsed = JSON.parse(body) as {
          error?: {
            message?: string;
          };
          message?: string;
        };

        detail = parsed.error?.message ?? parsed.message ?? body;
      } catch {
        // Keep raw response.
      }

      throw new AiHttpError(detail || `HTTP ${response.status}`, response.status);
    }

    if (!body.trim()) {
      return {} as T;
    }

    return JSON.parse(body) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}
