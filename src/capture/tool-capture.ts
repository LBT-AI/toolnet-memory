import { ActivityCapture } from './activity-capture.js';

export class ToolCapture {
  constructor(private readonly capture: ActivityCapture) {}

  record(projectId: string, tool: string, input?: unknown, output?: unknown) {
    return this.capture.capture(projectId, 'tool_call', {
      tool,
      input,
      output,
    });
  }
}
