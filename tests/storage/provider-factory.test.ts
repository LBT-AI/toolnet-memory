import {
  describe,
  expect,
  it,
} from "vitest";

import {
  createStorageProvider,
} from "../../src/storage/provider.js";

describe(
  "storage provider factory",
  () => {
    it(
      "creates Cloudflare R2 provider",
      () => {
        const storage = createStorageProvider({
          provider: "r2",
          r2: {
            accountId: "account-id",
            bucket: "toolnet-memory",
            accessKeyId: "access-key",
            secretAccessKey: "secret-key",
          },
        });

        expect(storage.name).toBe("r2");
      },
    );

    it(
      "creates generic S3 provider",
      () => {
        const storage = createStorageProvider({
          provider: "s3",
          s3: {
            endpoint: "https://s3.example.test",
            region: "us-east-1",
            bucket: "toolnet-memory",
            accessKeyId: "access-key",
            secretAccessKey: "secret-key",
            forcePathStyle: true,
          },
        });

        expect(storage.name).toBe("s3");
      },
    );

    it(
      "keeps local provider available",
      () => {
        const storage = createStorageProvider({
          provider: "local",
        });

        expect(storage.name).toBe("local");
      },
    );
  },
);
