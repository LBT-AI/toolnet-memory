import type { ActivityEvent } from '../core/types.js';

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function truncate(text: string, max = 120): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export class Summarizer {
  summarize(events: ActivityEvent[]): string | null {
    if (events.length === 0) {
      return null;
    }

    const files = unique(
      events
        .filter((event) => event.type === 'file_write')
        .map((event) => String(event.data.filePath ?? ''))
    );

    const commands = unique(
      events
        .filter((event) => event.type === 'command')
        .map((event) => truncate(String(event.data.command ?? '')))
    );

    const errors = unique(
      events
        .filter((event) => event.type === 'error')
        .map((event) => truncate(String(event.data.message ?? '')))
    );

    const decisions = unique(
      events
        .filter((event) => event.type === 'decision')
        .map((event) => truncate(String(event.data.content ?? '')))
    );

    const todos = unique(
      events
        .filter((event) => event.type === 'todo')
        .map((event) => truncate(String(event.data.content ?? '')))
    );

    if (
      files.length === 0 &&
      commands.length === 0 &&
      errors.length === 0 &&
      decisions.length === 0 &&
      todos.length === 0
    ) {
      return null;
    }

    const lines: string[] = ['Session summary:'];

    if (files.length) {
      lines.push(`- Files changed (${files.length}): ${files.slice(0, 10).join(', ')}`);
    }

    if (commands.length) {
      lines.push(`- Commands (${commands.length}): ${commands.slice(0, 5).join('; ')}`);
    }

    if (errors.length) {
      lines.push(`- Errors (${errors.length}): ${errors.slice(0, 5).join('; ')}`);
    }

    if (decisions.length) {
      lines.push(`- Decisions: ${decisions.slice(0, 5).join('; ')}`);
    }

    if (todos.length) {
      lines.push(`- TODO: ${todos.slice(0, 5).join('; ')}`);
    }

    return lines.join('\n');
  }
}
