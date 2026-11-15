/**
 * Strict cloud-only storage factory.
 *
 * `src/storage` is a protected authority path and must not be modified, so the
 * strict-mode gate lives here and wraps the existing factory. In strict mode the
 * wrapper proves cloud credentials exist before construction; therefore the
 * legacy factory can never take its local fallback branch. If credentials are
 * missing the call fails closed instead of writing memory data to the VPS.
 */

import type { StorageFactoryConfig } from '../storage/provider.js';
import { createStorageProvider } from '../storage/provider.js';
import type { StorageProvider } from '../storage/types.js';
import {
  DurabilityPolicyError,
  resolveDurabilityMode,
  type DurabilityMode,
} from './durability-policy.js';

function refuse(reason: string): never {
  throw new DurabilityPolicyError(
    'STRICT_CLOUD_ONLY_WRITE_BLOCKED',
    `Strict cloud-only mode refuses local storage: ${reason}`
  );
}

function completeR2(config: StorageFactoryConfig['r2']): boolean {
  return Boolean(
    config?.accountId && config.bucket && config.accessKeyId && config.secretAccessKey
  );
}

function completeS3(config: StorageFactoryConfig['s3']): boolean {
  return Boolean(config?.bucket && config.accessKeyId && config.secretAccessKey);
}

function completeHuggingFace(config: StorageFactoryConfig['huggingface']): boolean {
  return Boolean(
    config?.namespace && config.bucket && config.accessKeyId && config.secretAccessKey
  );
}

export function createDurabilityAwareStorageProvider(
  config: StorageFactoryConfig,
  mode: DurabilityMode = resolveDurabilityMode(process.env.TOOLNET_DURABILITY_MODE)
): StorageProvider {
  if (mode === 'local-first') {
    return createStorageProvider(config);
  }

  switch (config.provider) {
    case 'r2': {
      if (!completeR2(config.r2)) {
        refuse('Cloudflare R2 credentials missing');
      }

      break;
    }

    case 's3': {
      if (!completeS3(config.s3)) {
        refuse('S3 credentials missing');
      }

      break;
    }

    case 'huggingface': {
      if (!completeHuggingFace(config.huggingface)) {
        refuse('Hugging Face credentials missing');
      }

      break;
    }

    default: {
      refuse(`provider ${config.provider} is not a cloud provider`);
    }
  }

  return createStorageProvider(config);
}
