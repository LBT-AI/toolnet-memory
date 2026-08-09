import { ActivityCapture } from './activity-capture.js';

import { isSensitiveFile } from '../security/file-filter.js';

export class FileCapture {
  constructor(private readonly capture: ActivityCapture) {}

  read(projectId: string, filePath: string) {
    if (isSensitiveFile(filePath)) {
      return null;
    }

    return this.capture.capture(projectId, 'file_read', {
      filePath,
    });
  }

  write(projectId: string, filePath: string) {
    if (isSensitiveFile(filePath)) {
      return null;
    }

    return this.capture.capture(projectId, 'file_write', {
      filePath,
    });
  }
}
