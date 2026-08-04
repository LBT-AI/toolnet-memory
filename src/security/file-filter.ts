import {
  basename,
} from "node:path";

const BLOCKED_NAMES =
  new Set([
    ".env",
    ".env.local",
    ".env.production",
    ".env.development",
    "id_rsa",
    "id_ed25519",
    "credentials",
    "credentials.json",
    "service-account.json",
  ]);

const BLOCKED_EXTENSIONS =
  new Set([
    ".pem",
    ".key",
    ".p12",
    ".pfx",
  ]);

export function isSensitiveFile(
  filePath: string,
): boolean {
  const name =
    basename(
      filePath,
    ).toLowerCase();

  if (
    BLOCKED_NAMES.has(
      name,
    )
  ) {
    return true;
  }

  for (
    const extension
    of BLOCKED_EXTENSIONS
  ) {
    if (
      name.endsWith(
        extension,
      )
    ) {
      return true;
    }
  }

  return false;
}
