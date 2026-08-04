import type { ActivityEvent } from "../core/types.js";

export class EventQueue {
  private readonly events: ActivityEvent[] = [];

  push(event: ActivityEvent): void {
    this.events.push(event);
  }

  drain(): ActivityEvent[] {
    const items = [...this.events];
    this.events.length = 0;
    return items;
  }

  list(): ActivityEvent[] {
    return [...this.events];
  }

  size(): number {
    return this.events.length;
  }

  shouldFlush(maxEvents: number): boolean {
    return this.events.length >= maxEvents;
  }
}
