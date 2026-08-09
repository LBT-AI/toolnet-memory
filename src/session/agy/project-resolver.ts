import { existsSync } from 'node:fs';

import { dirname, join, parse, resolve } from 'node:path';

import { ProjectManager } from '../../core/index.js';

export function findToolNetProject(workspacePaths: string[]) {
  for (const workspace of workspacePaths) {
    let current = resolve(workspace);

    const root = parse(current).root;

    while (true) {
      if (existsSync(join(current, '.toolnet', 'project.json'))) {
        return new ProjectManager().detect(current);
      }

      if (current === root) {
        break;
      }

      const parent = dirname(current);

      if (parent === current) {
        break;
      }

      current = parent;
    }
  }

  return null;
}
