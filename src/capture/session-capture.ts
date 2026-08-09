import { randomUUID } from 'node:crypto';

import { ActivityCapture } from './activity-capture.js';

export class SessionCapture {
  readonly sessionId = randomUUID();

  constructor(private readonly capture: ActivityCapture) {}

  start(projectId: string) {
    return this.capture.capture(projectId, 'session_start', {
      sessionId: this.sessionId,
    });
  }

  end(projectId: string) {
    return this.capture.capture(projectId, 'session_end', {
      sessionId: this.sessionId,
    });
  }
}
