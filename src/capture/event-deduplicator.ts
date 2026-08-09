import { createHash } from 'node:crypto';
import type { ActivityEvent } from '../core/types.js';

export class EventDeduplicator {
  private readonly seen = new Set<string>();

  private fingerprint(event: ActivityEvent): string {
    return createHash('sha256')
      .update(
        JSON.stringify({
          projectId: event.projectId,
          type: event.type,
          data: event.data,
        })
      )
      .digest('hex');
  }

  filter(events: ActivityEvent[]): ActivityEvent[] {
    const result: ActivityEvent[] = [];

    for (const event of events) {
      const hash = this.fingerprint(event);

      if (this.seen.has(hash)) {
        continue;
      }

      this.seen.add(hash);
      result.push(event);
    }

    return result;
  }

  clear(): void {
    this.seen.clear();
  }
}
