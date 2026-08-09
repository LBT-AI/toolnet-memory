import { join } from 'node:path';

import { ProjectManager } from '../core/index.js';

import { sanitizeProjectFolder } from '../storage/project/folder.js';

const project = new ProjectManager().detect();

const remote = sanitizeProjectFolder(project.remote ?? project.name);

console.log(
  JSON.stringify(
    {
      id: project.id,

      name: project.name,

      remote,

      rootPath: project.rootPath,

      localManifest: join(project.rootPath, '.toolnet', 'project.json'),

      remoteNamespace: `projects/${remote}/`,

      isolation: '1 folder = 1 project = 1 remote namespace',
    },
    null,
    2
  )
);
