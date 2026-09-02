export interface SecretMatch {
  type: string;
  value: string;
  start: number;
  end: number;
  confidence: 'exact' | 'high' | 'heuristic';
}

export interface SecretScannerOptions {
  allowValues?: Iterable<string>;
  enableEntropyHeuristic?: boolean;
}

interface SecretPattern {
  type: string;
  regex: RegExp;
  confidence: SecretMatch['confidence'];
}

const PATTERNS: readonly SecretPattern[] = [
  {
    type: 'openai_key',
    regex: /\bsk-[A-Za-z0-9_-]{20,}\b/g,
    confidence: 'exact',
  },
  {
    type: 'huggingface_token',
    regex: /\bhf_[A-Za-z0-9]{20,}\b/g,
    confidence: 'exact',
  },
  {
    type: 'hf_s3_access_key',
    regex: /\bHFAK[A-Za-z0-9]{8,}\b/g,
    confidence: 'exact',
  },
  {
    type: 'aws_access_key',
    regex: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,
    confidence: 'exact',
  },
  {
    type: 'github_token',
    regex: /\b(?:gh[pousr]_[A-Za-z0-9]{30,255}|github_pat_[A-Za-z0-9_]{40,255})\b/g,
    confidence: 'exact',
  },
  {
    type: 'stripe_secret_key',
    regex: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/g,
    confidence: 'exact',
  },
  {
    type: 'google_api_key',
    regex: /\bAIza[A-Za-z0-9_-]{30,}\b/g,
    confidence: 'exact',
  },
  {
    type: 'slack_token',
    regex: /\bxox[baprs]-[A-Za-z0-9-]{16,}\b/g,
    confidence: 'exact',
  },
  {
    type: 'npm_token',
    regex: /\bnpm_[A-Za-z0-9]{20,}\b/g,
    confidence: 'exact',
  },
  {
    type: 'bearer_token',
    regex: /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}\b/gi,
    confidence: 'high',
  },
  {
    type: 'jwt',
    regex: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
    confidence: 'exact',
  },
  {
    type: 'private_key',
    regex:
      /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
    confidence: 'exact',
  },
  {
    type: 'password_assignment',
    regex: /\b(?:password|passwd|pwd)\s*[:=]\s*["']?[^"' \t\r\n]{6,}["']?/gi,
    confidence: 'high',
  },
  {
    type: 'secret_assignment',
    regex:
      /\b(?:secret|api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|private[_-]?key)\s*[:=]\s*["']?[^"' \t\r\n]{8,}["']?/gi,
    confidence: 'high',
  },
  {
    type: 'cookie',
    regex: /\b(?:cookie|set-cookie)\s*[:=]\s*[^;\n]{8,}/gi,
    confidence: 'high',
  },
  {
    type: 'url_credentials',
    regex: /\bhttps?:\/\/[^:/@\s]+:[^/@\s]{4,}@[^/\s]+/gi,
    confidence: 'high',
  },
];

const PLACEHOLDERS = new Set([
  'example',
  'example-key',
  'example-token',
  'changeme',
  'change-me',
  'password',
  'secret',
  'your-api-key',
  'your-token',
  '<token>',
  '<secret>',
  '<password>',
  '[redacted]',
]);

function normalizedValue(value: string): string {
  return value.normalize('NFKC').trim().toLowerCase();
}

function entropy(value: string): number {
  if (value.length === 0) {
    return 0;
  }

  const frequencies = new Map<string, number>();

  for (const character of value) {
    frequencies.set(character, (frequencies.get(character) ?? 0) + 1);
  }

  let result = 0;

  for (const count of frequencies.values()) {
    const probability = count / value.length;
    result -= probability * Math.log2(probability);
  }

  return result;
}

function looksLikeHash(value: string): boolean {
  return (
    /^[a-f0-9]{32}$/iu.test(value) ||
    /^[a-f0-9]{40}$/iu.test(value) ||
    /^[a-f0-9]{64}$/iu.test(value)
  );
}

function secretContext(text: string, start: number, end: number): boolean {
  const before = text.slice(Math.max(0, start - 48), start);

  const after = text.slice(end, Math.min(text.length, end + 16));

  return /\b(?:token|secret|key|credential|authorization|password|passwd|apikey|api_key|access[_-]?key)\b/iu.test(
    `${before} ${after}`
  );
}

function overlap(left: SecretMatch, right: SecretMatch): boolean {
  return left.start < right.end && right.start < left.end;
}

function sortMatches(matches: SecretMatch[]): SecretMatch[] {
  return matches.sort((left, right) => {
    if (left.start !== right.start) {
      return left.start - right.start;
    }

    return right.end - right.start - (left.end - left.start);
  });
}

export class SecretScanner {
  private readonly allowValues = new Set<string>();

  private readonly enableEntropyHeuristic: boolean;

  constructor(options: SecretScannerOptions = {}) {
    for (const value of options.allowValues ?? []) {
      const normalized = normalizedValue(value);

      if (normalized) {
        this.allowValues.add(normalized);
      }
    }

    this.enableEntropyHeuristic = options.enableEntropyHeuristic ?? true;
  }

  scan(text: string): SecretMatch[] {
    const matches: SecretMatch[] = [];

    for (const pattern of PATTERNS) {
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);

      for (const match of text.matchAll(regex)) {
        if (match.index === undefined || !match[0]) {
          continue;
        }

        if (this.allowed(match[0])) {
          continue;
        }

        matches.push({
          type: pattern.type,
          value: match[0],
          start: match.index,
          end: match.index + match[0].length,
          confidence: pattern.confidence,
        });
      }
    }

    if (this.enableEntropyHeuristic) {
      matches.push(...this.entropyMatches(text));
    }

    /*
     * Exact/high-confidence pattern wins over any
     * overlapping heuristic detection.
     */
    const ordered = sortMatches(matches);

    const accepted: SecretMatch[] = [];

    for (const candidate of ordered) {
      if (accepted.some((existing) => overlap(existing, candidate))) {
        continue;
      }

      accepted.push(candidate);
    }

    return sortMatches(accepted);
  }

  hasSecrets(text: string): boolean {
    return this.scan(text).length > 0;
  }

  private allowed(value: string): boolean {
    const normalized = normalizedValue(value);

    if (PLACEHOLDERS.has(normalized)) {
      return true;
    }

    return this.allowValues.has(normalized);
  }

  private entropyMatches(text: string): SecretMatch[] {
    const output: SecretMatch[] = [];

    const tokenPattern = /[A-Za-z0-9_+/=-]{32,160}/g;

    for (const match of text.matchAll(tokenPattern)) {
      if (match.index === undefined || !match[0]) {
        continue;
      }

      const value = match[0];

      if (this.allowed(value) || looksLikeHash(value)) {
        continue;
      }

      if (!/[A-Za-z]/u.test(value) || !/[0-9]/u.test(value)) {
        continue;
      }

      if (!secretContext(text, match.index, match.index + value.length)) {
        continue;
      }

      if (entropy(value) < 3.7) {
        continue;
      }

      output.push({
        type: 'high_entropy_secret',
        value,
        start: match.index,
        end: match.index + value.length,
        confidence: 'heuristic',
      });
    }

    return output;
  }
}
