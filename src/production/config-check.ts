export interface ConfigCheck {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export function checkProductionConfig():
  ConfigCheck {
  const errors:
    string[] = [];

  const warnings:
    string[] = [];

  const provider =
    process.env
      .MEMORY_STORAGE_PROVIDER ??
    "local";

  if (
    provider ===
    "huggingface"
  ) {
    const required = [
      "HF_NAMESPACE",
      "HF_BUCKET",
      "HF_S3_ACCESS_KEY_ID",
      "HF_S3_SECRET_ACCESS_KEY",
    ];

    for (
      const key
      of required
    ) {
      if (
        !process.env[key]
      ) {
        errors.push(
          `Missing ${key}`,
        );
      }
    }

    if (
      !process.env.HF_TOKEN
    ) {
      warnings.push(
        "HF_TOKEN missing: semantic embedding will use fallback",
      );
    }
  }

  const model =
    process.env
      .HF_EMBEDDING_MODEL;

  if (!model) {
    warnings.push(
      "HF_EMBEDDING_MODEL not set; default model will be used",
    );
  }

  return {
    ok:
      errors.length === 0,

    errors,
    warnings,
  };
}
