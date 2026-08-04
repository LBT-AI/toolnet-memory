export interface SecretMatch {
  type: string;
  value: string;
}

const PATTERNS: {
  type: string;
  regex: RegExp;
}[] = [
  {
    type: "openai_key",
    regex: /\bsk-[A-Za-z0-9_\-]{20,}\b/g,
  },
  {
    type: "huggingface_token",
    regex: /\bhf_[A-Za-z0-9]{20,}\b/g,
  },
  {
    type: "hf_s3_access_key",
    regex: /\bHFAK[A-Za-z0-9]{8,}\b/g,
  },
  {
    type: "bearer_token",
    regex: /\bBearer\s+[A-Za-z0-9._\-]{16,}\b/gi,
  },
  {
    type: "jwt",
    regex: /\beyJ[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}\b/g,
  },
  {
    type: "private_key",
    regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  },
  {
    type: "password_assignment",
    regex: /\b(password|passwd|pwd)\s*[:=]\s*["']?[^"'\s]{6,}["']?/gi,
  },
  {
    type: "secret_assignment",
    regex: /\b(secret|api[_-]?key|access[_-]?token|refresh[_-]?token)\s*[:=]\s*["']?[^"'\s]{8,}["']?/gi,
  },
  {
    type: "cookie",
    regex: /\b(cookie|set-cookie)\s*[:=]\s*[^;\n]{8,}/gi,
  },
];

export class SecretScanner {
  scan(text: string): SecretMatch[] {
    const matches: SecretMatch[] = [];

    for (const pattern of PATTERNS) {
      const regex = new RegExp(
        pattern.regex.source,
        pattern.regex.flags,
      );

      for (const match of text.matchAll(regex)) {
        matches.push({
          type: pattern.type,
          value: match[0],
        });
      }
    }

    return matches;
  }

  hasSecrets(text: string): boolean {
    return this.scan(text).length > 0;
  }
}
