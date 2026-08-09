import type { StorageProvider } from './types.js';

import { retry, type RetryOptions } from '../utils/retry.js';

const RETRY_METHODS = new Set<PropertyKey>(['put', 'get', 'getText', 'delete', 'list']);

export function withStorageRetry(
  provider: StorageProvider,

  options: RetryOptions = {}
): StorageProvider {
  return new Proxy(provider as object, {
    get(target, property) {
      const value = Reflect.get(target, property, target);

      if (typeof value !== 'function') {
        return value;
      }

      if (!RETRY_METHODS.has(property)) {
        return value.bind(target);
      }

      return (...args: unknown[]) =>
        retry(() => Promise.resolve(value.apply(target, args)), options);
    },
  }) as StorageProvider;
}
