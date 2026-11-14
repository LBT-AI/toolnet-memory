import { existsSync, readFileSync } from 'node:fs';

export interface ContinueTranscriptMessage {
  role: 'user' | 'assistant';

  text: string;

  timestamp?: string;
}

export interface ContinueSessionFile {
  sessionId?: string;

  title?: string;

  workspaceDirectory?: string;

  messages: ContinueTranscriptMessage[];
}

interface ContinueRawItem {
  message?: unknown;

  role?: unknown;

  content?: unknown;

  timestamp?: unknown;
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

function roleOf(value: unknown): 'user' | 'assistant' | undefined {
  if (value === 'user') {
    return 'user';
  }

  if (value === 'assistant' || value === 'model') {
    return 'assistant';
  }

  return undefined;
}

function messageOf(item: ContinueRawItem): ContinueRawItem {
  return item.message && typeof item.message === 'object'
    ? (item.message as ContinueRawItem)
    : item;
}

/**
 * Read a Continue CLI session file (~/.continue/sessions/<id>.json).
 *
 * Continue stores `history[].message` with `role` and `content` (string or
 * text parts). Files that do not match this shape yield no messages.
 */
export function readContinueSession(path: string): ContinueSessionFile {
  if (!existsSync(path)) {
    return { messages: [] };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return { messages: [] };
  }

  const root = parsed as {
    sessionId?: unknown;
    title?: unknown;
    workspaceDirectory?: unknown;
    history?: unknown;
  };

  const history = Array.isArray(root.history) ? root.history : [];

  const messages: ContinueTranscriptMessage[] = [];

  for (const raw of history) {
    if (!raw || typeof raw !== 'object') {
      continue;
    }

    const item = messageOf(raw as ContinueRawItem);
    const role = roleOf(item.role);

    if (!role) {
      continue;
    }

    const text = textFromContent(item.content);

    if (!text) {
      continue;
    }

    messages.push({
      role,
      text,
      ...(typeof item.timestamp === 'string' ? { timestamp: item.timestamp } : {}),
    });
  }

  return {
    ...(typeof root.sessionId === 'string' ? { sessionId: root.sessionId } : {}),
    ...(typeof root.title === 'string' ? { title: root.title } : {}),
    ...(typeof root.workspaceDirectory === 'string'
      ? { workspaceDirectory: root.workspaceDirectory }
      : {}),
    messages,
  };
}
