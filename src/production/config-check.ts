export interface ConfigCheck {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

function requireKeys(
  keys: string[],
  errors: string[],
): void {
  for (const key of keys) {
    if (!process.env[key]) {
      errors.push(`Missing ${key}`);
    }
  }
}

export function checkProductionConfig(): ConfigCheck {
  const errors: string[] = [];
  const warnings: string[] = [];

  const provider =
    process.env.MEMORY_STORAGE_PROVIDER ??
    "local";

  if (provider === "r2") {
    requireKeys(
      [
        "R2_ACCOUNT_ID",
        "R2_BUCKET",
        "R2_ACCESS_KEY_ID",
        "R2_SECRET_ACCESS_KEY",
      ],
      errors,
    );
  } else if (provider === "s3") {
    requireKeys(
      [
        "S3_BUCKET",
        "S3_ACCESS_KEY_ID",
        "S3_SECRET_ACCESS_KEY",
      ],
      errors,
    );
  } else if (provider === "huggingface") {
    // Legacy provider kept for existing installations.
    requireKeys(
      [
        "HF_NAMESPACE",
        "HF_BUCKET",
        "HF_S3_ACCESS_KEY_ID",
        "HF_S3_SECRET_ACCESS_KEY",
      ],
      errors,
    );
  } else if (provider !== "local") {
    errors.push(
      `Unsupported MEMORY_STORAGE_PROVIDER: ${provider}`,
    );
  }

  if (!process.env.HF_TOKEN) {
    warnings.push(
      "HF_TOKEN missing: semantic embedding will use fallback",
    );
  }

  if (!process.env.HF_EMBEDDING_MODEL) {
    warnings.push(
      "HF_EMBEDDING_MODEL not set; default model will be used",
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}
