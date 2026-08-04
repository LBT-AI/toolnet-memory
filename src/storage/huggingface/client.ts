import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type {
  StorageObject,
  StorageProvider,
} from "../types.js";

export interface HuggingFaceStorageOptions {
  namespace: string;
  bucket: string;

  accessKeyId: string;
  secretAccessKey: string;
}

export class HuggingFaceStorageProvider
  implements StorageProvider
{
  readonly name =
    "huggingface";

  private readonly client:
    S3Client;

  private readonly bucket:
    string;

  constructor(
    options:
      HuggingFaceStorageOptions,
  ) {
    this.bucket =
      options.bucket;

    this.client =
      new S3Client({
        region:
          "us-east-1",

        endpoint:
          `https://s3.hf.co/${options.namespace}`,

        forcePathStyle:
          true,

        requestChecksumCalculation:
          "WHEN_REQUIRED",

        responseChecksumValidation:
          "WHEN_REQUIRED",

        credentials: {
          accessKeyId:
            options.accessKeyId,

          secretAccessKey:
            options.secretAccessKey,
        },
      });
  }

  async put(
    key: string,
    data: string | Uint8Array,
    contentType =
      "application/octet-stream",
  ): Promise<void> {
    const body =
      typeof data === "string"
        ? Buffer.from(
            data,
            "utf8",
          )
        : data;

    await this.client.send(
      new PutObjectCommand({
        Bucket:
          this.bucket,

        Key:
          key,

        Body:
          body,

        ContentType:
          contentType,
      }),
    );
  }

  async get(
    key: string,
  ): Promise<Uint8Array | null> {
    const signedUrl =
      await getSignedUrl(
        this.client,
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
        {
          expiresIn: 60,
        },
      );

    const response =
      await fetch(
        signedUrl,
        {
          redirect: "follow",
        },
      );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(
        `HF download failed: ${response.status} ${response.statusText}`,
      );
    }

    return new Uint8Array(
      await response.arrayBuffer(),
    );
  }

  async getText(
    key: string,
  ): Promise<string | null> {
    const data =
      await this.get(key);

    if (!data) {
      return null;
    }

    return Buffer
      .from(data)
      .toString("utf8");
  }

  async exists(
    key: string,
  ): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket:
            this.bucket,

          Key:
            key,
        }),
      );

      return true;
    } catch (
      error: unknown
    ) {
      if (
        typeof error === "object" &&
        error !== null &&
        "$metadata" in error
      ) {
        const status =
          (
            error as {
              $metadata?: {
                httpStatusCode?: number;
              };
            }
          ).$metadata
            ?.httpStatusCode;

        if (
          status === 404
        ) {
          return false;
        }
      }

      throw error;
    }
  }

  async delete(
    key: string,
  ): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket:
          this.bucket,

        Key:
          key,
      }),
    );
  }

  async list(
    prefix = "",
  ): Promise<StorageObject[]> {
    const output:
      StorageObject[] = [];

    let continuationToken:
      string | undefined;

    do {
      const response =
        await this.client.send(
          new ListObjectsV2Command({
            Bucket:
              this.bucket,

            Prefix:
              prefix || undefined,

            ContinuationToken:
              continuationToken,
          }),
        );

      for (
        const item
        of response.Contents ?? []
      ) {
        if (!item.Key) {
          continue;
        }

        output.push({
          key:
            item.Key,

          size:
            item.Size,

          updatedAt:
            item.LastModified
              ?.toISOString(),
        });
      }

      continuationToken =
        response.IsTruncated
          ? response
              .NextContinuationToken
          : undefined;
    } while (
      continuationToken
    );

    return output;
  }
}
