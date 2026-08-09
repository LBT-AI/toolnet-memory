import { join } from 'node:path';

import { scanRepository } from '../indexer/repository-scanner.js';
import { hashFile } from './file-hash.js';

import type { CodeManifest } from './manifest.js';

export async function buildManifest(projectId: string, rootPath: string): Promise<CodeManifest> {
  const paths = await scanRepository(rootPath);

  const files: CodeManifest['files'] = {};

  for (const path of paths) {
    files[path] = {
      path,
      hash: await hashFile(join(rootPath, path)),
    };
  }

  return {
    version: 1,
    projectId,
    updatedAt: new Date().toISOString(),
    files,
  };
}
