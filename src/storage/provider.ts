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

import {
  S3StorageProvider,
} from "./s3/client.js";

import type {
  StorageProvider,
} from "./types.js";

export interface StorageFactoryConfig {
  provider: string;

  r2?: {
    accountId?: string;
    bucket?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
  };

  s3?: {
    endpoint?: string;
    region?: string;
    bucket?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    forcePathStyle?: boolean;
  };

  huggingface?: {
    namespace?: string;
    bucket?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
  };

  localRoot?: string;
}

function fallback(
  localRoot: string,
  message: string,
): StorageProvider {
  console.warn(message);
  return new LocalStorageProvider(localRoot);
}

export function createStorageProvider(
  config: StorageFactoryConfig,
): StorageProvider {
  const localRoot =
    config.localRoot ??
    join(
      homedir(),
      ".toolnet-memory",
      "storage",
    );

  if (config.provider === "r2") {
    const r2 = config.r2;

    if (
      r2?.accountId &&
      r2.bucket &&
      r2.accessKeyId &&
      r2.secretAccessKey
    ) {
      return new S3StorageProvider({
        name: "r2",
        endpoint:
          `https://${r2.accountId}.r2.cloudflarestorage.com`,
        region: "auto",
        bucket: r2.bucket,
        forcePathStyle: true,
        accessKeyId: r2.accessKeyId,
        secretAccessKey: r2.secretAccessKey,
      });
    }

    return fallback(
      localRoot,
      "[storage] Cloudflare R2 credentials missing. Using local fallback.",
    );
  }

  if (config.provider === "s3") {
    const s3 = config.s3;

    if (
      s3?.bucket &&
      s3.accessKeyId &&
      s3.secretAccessKey
    ) {
      return new S3StorageProvider({
        name: "s3",
        endpoint: s3.endpoint,
        region: s3.region ?? "us-east-1",
        bucket: s3.bucket,
        forcePathStyle: s3.forcePathStyle ?? false,
        accessKeyId: s3.accessKeyId,
        secretAccessKey: s3.secretAccessKey,
      });
    }

    return fallback(
      localRoot,
      "[storage] S3 credentials missing. Using local fallback.",
    );
  }

  // Backward compatibility for existing Hugging Face installations.
  if (config.provider === "huggingface") {
    const hf = config.huggingface;

    if (
      hf?.namespace &&
      hf.bucket &&
      hf.accessKeyId &&
      hf.secretAccessKey
    ) {
      return new HuggingFaceStorageProvider({
        namespace: hf.namespace,
        bucket: hf.bucket,
        accessKeyId: hf.accessKeyId,
        secretAccessKey: hf.secretAccessKey,
      });
    }

    return fallback(
      localRoot,
      "[storage] Hugging Face credentials missing. Using local fallback.",
    );
  }

  return new LocalStorageProvider(localRoot);
}
