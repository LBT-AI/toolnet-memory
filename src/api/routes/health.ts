import type { ProjectManifest } from '../../core/types.js';

export interface ApiHealthResponse {
  ok: true;
  service: 'toolnet-memory';
  schema: 'toolnet.api-health.v1';
  project: {
    id: string;
    name: string;
    remote: string;
  };
}

export function apiHealth(project: ProjectManifest): ApiHealthResponse {
  return {
    ok: true,
    service: 'toolnet-memory',
    schema: 'toolnet.api-health.v1',
    project: {
      id: project.id,
      name: project.name,
      remote: project.remote ?? project.name,
    },
  };
}
