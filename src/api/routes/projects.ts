import type { ProjectManifest } from '../../core/types.js';

export interface ApiProjectResponse {
  schema: 'toolnet.api-project.v1';
  project: {
    id: string;
    name: string;
    remote: string;
    graphVersion: number;
    memoryVersion: number;
    createdAt: string;
    updatedAt: string;
  };
}

export function apiProject(project: ProjectManifest): ApiProjectResponse {
  return {
    schema: 'toolnet.api-project.v1',
    project: {
      id: project.id,
      name: project.name,
      remote: project.remote ?? project.name,
      graphVersion: project.graphVersion,
      memoryVersion: project.memoryVersion,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    },
  };
}
