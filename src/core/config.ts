import './global-env.js';

export interface ToolNetMemoryConfig {
  memory: {
    autoCapture: boolean;
    autoRetrieve: boolean;
    autoSummarize: boolean;
    autoSync: boolean;
  };

  retrieval: {
    maxCandidates: number;
    rerankTop: number;
    finalContext: number;
    tokenBudget: number;
  };

  storage: {
    provider: string;

    r2: {
      accountId?: string;
      bucket?: string;
      accessKeyId?: string;
      secretAccessKey?: string;
    };

    s3: {
      endpoint?: string;
      region?: string;
      bucket?: string;
      accessKeyId?: string;
      secretAccessKey?: string;
      forcePathStyle: boolean;
    };

    huggingface: {
      namespace?: string;
      bucket?: string;
      accessKeyId?: string;
      secretAccessKey?: string;
    };

    localRoot?: string;
  };

  cache: {
    maxMb: number;
  };
}

function envBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function envNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

export function loadConfig(): ToolNetMemoryConfig {
  return {
    memory: {
      autoCapture: envBool(process.env.MEMORY_AUTO_CAPTURE, true),

      autoRetrieve: envBool(process.env.MEMORY_AUTO_RETRIEVE, true),

      autoSummarize: envBool(process.env.MEMORY_AUTO_SUMMARIZE, true),

      autoSync: envBool(process.env.MEMORY_AUTO_SYNC, true),
    },

    retrieval: {
      maxCandidates: envNumber(process.env.MEMORY_MAX_CANDIDATES, 50),

      rerankTop: envNumber(process.env.MEMORY_RERANK_TOP, 10),

      finalContext: envNumber(process.env.MEMORY_FINAL_CONTEXT, 5),

      tokenBudget: envNumber(process.env.MEMORY_TOKEN_BUDGET, 2000),
    },

    storage: {
      provider: process.env.MEMORY_STORAGE_PROVIDER ?? 'huggingface',

      r2: {
        accountId: process.env.R2_ACCOUNT_ID,
        bucket: process.env.R2_BUCKET,
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },

      s3: {
        endpoint: process.env.S3_ENDPOINT,
        region: process.env.S3_REGION,
        bucket: process.env.S3_BUCKET,
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
        forcePathStyle: envBool(process.env.S3_FORCE_PATH_STYLE, false),
      },

      huggingface: {
        namespace: process.env.HF_NAMESPACE,
        bucket: process.env.HF_BUCKET,
        accessKeyId: process.env.HF_S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.HF_S3_SECRET_ACCESS_KEY,
      },

      localRoot: process.env.MEMORY_LOCAL_STORAGE_PATH,
    },

    cache: {
      maxMb: envNumber(process.env.MEMORY_LOCAL_CACHE_MB, 200),
    },
  };
}
