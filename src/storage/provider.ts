import {
  homedir,
} from "node:os";

import {
  join,
} from "node:path";

import {
  HuggingFaceStorageProvider,
} from "./huggingface/client.js";

import {
  LocalStorageProvider,
} from "./local/client.js";

import type {
  StorageProvider,
} from "./types.js";

export interface StorageFactoryConfig {
  provider: string;

  huggingface?: {
    namespace?: string;
    bucket?: string;

    accessKeyId?: string;
    secretAccessKey?: string;
  };

  localRoot?: string;
}

export function createStorageProvider(
  config:
    StorageFactoryConfig,
): StorageProvider {
  const localRoot =
    config.localRoot ??
    join(
      homedir(),
      ".toolnet-memory",
      "storage",
    );

  if (
    config.provider ===
    "huggingface"
  ) {
    const hf =
      config.huggingface;

    if (
      hf?.namespace &&
      hf.bucket &&
      hf.accessKeyId &&
      hf.secretAccessKey
    ) {
      return new HuggingFaceStorageProvider({
        namespace:
          hf.namespace,

        bucket:
          hf.bucket,

        accessKeyId:
          hf.accessKeyId,

        secretAccessKey:
          hf.secretAccessKey,
      });
    }

    console.warn(
      "[storage] Hugging Face credentials missing. Using local fallback.",
    );

    return new LocalStorageProvider(
      localRoot,
    );
  }

  return new LocalStorageProvider(
    localRoot,
  );
}
