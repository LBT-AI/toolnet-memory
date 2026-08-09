import { ActivityCapture } from './activity-capture.js';

export class CommandCapture {
  constructor(private readonly capture: ActivityCapture) {}

  record(projectId: string, command: string, exitCode?: number) {
    return this.capture.capture(projectId, 'command', {
      command,
      exitCode,
    });
  }
}
