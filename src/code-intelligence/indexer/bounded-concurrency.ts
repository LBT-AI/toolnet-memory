export interface BoundedMapProgress {
  completed: number;
  total: number;
  index: number;
}

export interface BoundedMapOptions {
  concurrency?: number;
  signal?: AbortSignal;
  onProgress?: (progress: BoundedMapProgress) => void;
}

export const DEFAULT_PARSE_CONCURRENCY = 4;

export const DEFAULT_HASH_CONCURRENCY = 8;

function normalizeConcurrency(value: number | undefined): number {
  const concurrency = value ?? DEFAULT_PARSE_CONCURRENCY;

  if (!Number.isSafeInteger(concurrency) || concurrency < 1 || concurrency > 64) {
    throw new Error('concurrency must be an integer between 1 and 64');
  }

  return concurrency;
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw new Error('Operation aborted');
  }
}

/*
 * Bounded worker pool.
 *
 * Promise.all() is used only for the fixed worker count,
 * never once per repository file.
 */
export async function mapWithConcurrency<Input, Output>(
  items: readonly Input[],
  worker: (item: Input, index: number) => Promise<Output>,
  options: BoundedMapOptions = {}
): Promise<Output[]> {
  if (items.length === 0) {
    return [];
  }

  const concurrency = Math.min(normalizeConcurrency(options.concurrency), items.length);

  const output = new Array<Output>(items.length);

  let nextIndex = 0;
  let completed = 0;

  const runWorker = async (): Promise<void> => {
    for (;;) {
      throwIfAborted(options.signal);

      const index = nextIndex;
      nextIndex += 1;

      if (index >= items.length) {
        return;
      }

      output[index] = await worker(items[index]!, index);

      completed += 1;

      options.onProgress?.({
        completed,
        total: items.length,
        index,
      });
    }
  };

  const workers = Array.from(
    {
      length: concurrency,
    },
    () => runWorker()
  );

  await Promise.all(workers);

  return output;
}
