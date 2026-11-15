import { existsSync, readFileSync } from 'node:fs';

export interface GeminiTranscriptMessage {
  /** Normalized role: user prompts and model responses only. */
  role: 'user' | 'assistant';

  text: string;

  timestamp?: string;
}

interface GeminiRawMessage {
  type?: unknown;

  role?: unknown;

  timestamp?: unknown;

  content?: unknown;

  text?: unknown;
}

function textFromContent(content: unknown): string {
  if (typeof content === 'string') {
    return content.trim();
  }

  if (!Array.isArray(content)) {
    return '';
  }

  return content
    .map((part) => {
      if (typeof part === 'string') {
        return part;
      }

      if (
        part &&
        typeof part === 'object' &&
        typeof (part as { text?: unknown }).text === 'string'
      ) {
        return (part as { text: string }).text;
      }

      return '';
    })
    .filter(Boolean)
    .join('\n')
    .trim();
}

function roleFor(message: GeminiRawMessage): 'user' | 'assistant' | undefined {
  const raw = typeof message.role === 'string' ? message.role : message.type;

  if (raw === 'user') {
    return 'user';
  }

  if (raw === 'assistant' || raw === 'model' || raw === 'gemini') {
    return 'assistant';
  }

  return undefined;
}

/**
 * Read a Gemini CLI session transcript.
 *
 * Gemini CLI writes a JSON document with `messages[]`; each message carries
 * `type` (`user` / `gemini`) and `content` (string or text parts). Unknown
 * shapes are ignored rather than guessed so a malformed transcript can never
 * fabricate memory.
 */
export function readGeminiTranscript(path: string): GeminiTranscriptMessage[] {
  if (!existsSync(path)) {
    return [];
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return [];
  }

  const messages = (parsed as { messages?: unknown } | undefined)?.messages;

  if (!Array.isArray(messages)) {
    return [];
  }

  const result: GeminiTranscriptMessage[] = [];

  for (const item of messages) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const message = item as GeminiRawMessage;
    const role = roleFor(message);

    if (!role) {
      continue;
    }

    const text = textFromContent(message.content ?? message.text);

    if (!text) {
      continue;
    }

    result.push({
      role,
      text,
      ...(typeof message.timestamp === 'string' ? { timestamp: message.timestamp } : {}),
    });
  }

  return result;
}
