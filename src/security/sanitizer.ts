import { SecretScanner } from "./secret-scanner.js";

export interface SanitizeResult {
  text: string;
  redacted: number;
  secretTypes: string[];
}

export class Sanitizer {
  private readonly scanner =
    new SecretScanner();

  sanitize(text: string): SanitizeResult {
    let output = text;

    const matches =
      this.scanner.scan(text);

    const secretTypes =
      new Set<string>();

    for (const match of matches) {
      secretTypes.add(match.type);

      output = output
        .split(match.value)
        .join(`[REDACTED:${match.type}]`);
    }

    return {
      text: output,
      redacted: matches.length,
      secretTypes:
        [...secretTypes],
    };
  }

  sanitizeValue(
    value: unknown,
  ): unknown {
    if (
      typeof value === "string"
    ) {
      return this.sanitize(
        value,
      ).text;
    }

    if (
      Array.isArray(value)
    ) {
      return value.map(
        (item) =>
          this.sanitizeValue(
            item,
          ),
      );
    }

    if (
      value &&
      typeof value === "object"
    ) {
      const output:
        Record<string, unknown> = {};

      for (
        const [key, item]
        of Object.entries(
          value as Record<
            string,
            unknown
          >,
        )
      ) {
        const normalized =
          key.toLowerCase();

        if (
          normalized.includes("password") ||
          normalized.includes("secret") ||
          normalized.includes("token") ||
          normalized.includes("cookie") ||
          normalized.includes("authorization")
        ) {
          output[key] =
            "[REDACTED]";
        } else {
          output[key] =
            this.sanitizeValue(
              item,
            );
        }
      }

      return output;
    }

    return value;
  }
}
