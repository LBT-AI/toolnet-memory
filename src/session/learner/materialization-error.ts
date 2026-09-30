/**
 * Coded failures for turning learned journal batches into canonical memory.
 *
 * Codes stay coarse on purpose: each one maps to a distinct durable boundary
 * whose failure keeps the learned journal intact for retry.
 */
export type MaterializationErrorCode =
  | 'journal-read-failed'
  | 'memory-store-read-failed'
  | 'memory-store-save-failed'
  | 'materialize-failed';

export class MaterializationError extends Error {
  readonly code: MaterializationErrorCode;

  constructor(code: MaterializationErrorCode, message: string) {
    super(message);

    this.name = 'MaterializationError';

    this.code = code;
  }
}

export function materializationErrorCode(error: unknown): MaterializationErrorCode {
  if (error instanceof MaterializationError) {
    return error.code;
  }

  return 'materialize-failed';
}
