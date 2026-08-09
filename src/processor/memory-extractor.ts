import type { ActivityEvent, MemoryType } from '../core/types.js';

export interface ExtractedMemory {
  type: MemoryType;
  content: string;
  tags: string[];
  source: string;
  metadata?: Record<string, unknown>;
}

export class MemoryExtractor {
  extract(event: ActivityEvent): ExtractedMemory | null {
    switch (event.type) {
      case 'decision':
        return {
          type: 'decision',
          content: String(event.data.content ?? 'Decision recorded'),
          tags: ['decision'],
          source: 'auto-extractor',
          metadata: event.data,
        };

      case 'todo':
        return {
          type: 'todo',
          content: String(event.data.content ?? 'TODO recorded'),
          tags: ['todo'],
          source: 'auto-extractor',
          metadata: event.data,
        };

      case 'error':
        return {
          type: 'activity',
          content: `Error: ${String(event.data.message ?? '')}`,
          tags: ['error'],
          source: 'auto-extractor',
          metadata: event.data,
        };

      case 'file_write':
        return {
          type: 'activity',
          content: `Modified file: ${String(event.data.filePath ?? '')}`,
          tags: ['file', 'write'],
          source: 'auto-extractor',
          metadata: event.data,
        };

      case 'command':
        return {
          type: 'activity',
          content: `Command: ${String(event.data.command ?? '')}`,
          tags: ['command'],
          source: 'auto-extractor',
          metadata: event.data,
        };

      case 'session_start':
      case 'session_end':
      case 'file_read':
      case 'tool_call':
      case 'user_prompt':
      case 'test':
      case 'commit':
      case 'deploy':
        return null;

      default:
        return null;
    }
  }
}
