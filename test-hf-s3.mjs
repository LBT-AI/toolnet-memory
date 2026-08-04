import "dotenv/config";
import {
  S3Client,
  ListObjectsV2Command
} from "@aws-sdk/client-s3";

const endpoint = `https://s3.hf.co/${process.env.HF_NAMESPACE}`;

console.log({
  endpoint,
  bucket: process.env.HF_BUCKET,
  accessKey: process.env.HF_S3_ACCESS_KEY_ID?.slice(0, 8) + "...",
  secretPresent: !!process.env.HF_S3_SECRET_ACCESS_KEY
});

const client = new S3Client({
  region: "us-east-1",
  endpoint,
  forcePathStyle: true,

  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",

  credentials: {
    accessKeyId: process.env.HF_S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.HF_S3_SECRET_ACCESS_KEY
  },

  maxAttempts: 1
});

try {
  const result = await client.send(
    new ListObjectsV2Command({
      Bucket: process.env.HF_BUCKET,
      MaxKeys: 5
    })
  );

  console.log("SUCCESS");
  console.log(result.Contents ?? []);
} catch (error) {
  console.error("FAILED");
  console.error({
    name: error.name,
    message: error.message,
    status: error.$metadata?.httpStatusCode,
    requestId: error.$metadata?.requestId,
    code: error.Code
  });
}
