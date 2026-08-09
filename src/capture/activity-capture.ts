import { randomUUID } from 'node:crypto';

import type { ActivityEvent } from '../core/types.js';

import { EventQueue } from './event-queue.js';

import { Sanitizer } from '../security/sanitizer.js';

export class ActivityCapture {
  private readonly sanitizer = new Sanitizer();

  constructor(private readonly queue: EventQueue) {}

  capture(
    projectId: string,
    type: ActivityEvent['type'],
    data: Record<string, unknown> = {}
  ): ActivityEvent {
    const event: ActivityEvent = {
      id: randomUUID(),
      projectId,
      type,
      timestamp: new Date().toISOString(),
      data: this.sanitizer.sanitizeValue(data) as Record<string, unknown>,
    };

    this.queue.push(event);

    return event;
  }
}
