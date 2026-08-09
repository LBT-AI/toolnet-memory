import { ActivityCapture } from './activity-capture.js';

export class ErrorCapture {
  constructor(private readonly capture: ActivityCapture) {}

  record(projectId: string, error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    return this.capture.capture(projectId, 'error', {
      message,
    });
  }
}
