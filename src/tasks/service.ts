import { ProjectManager } from '../core/project-manager.js';
import type {
  TaskCreateInput,
  TaskListOptions,
  TaskMutationOptions,
  TaskPatch,
  TaskProjection,
  TaskRecord,
  TaskStatus,
} from './types.js';
import { TaskStore } from './store.js';
import { TaskStateEngine } from './state-engine.js';
import { TaskHandoffEngine } from './handoff-engine.js';
export class ProjectTaskService {
  readonly store: TaskStore;
  readonly state: TaskStateEngine;
  readonly handoff: TaskHandoffEngine;
  constructor(rootPath = process.cwd()) {
    const project = new ProjectManager().requireExisting(rootPath);
    this.store = new TaskStore(project);
    this.state = new TaskStateEngine(this.store);
    this.handoff = new TaskHandoffEngine(this.store);
  }
  create(input: TaskCreateInput): Promise<TaskRecord> {
    return this.store.createTask(input);
  }
  patch(taskId: string, patch: TaskPatch, options: TaskMutationOptions = {}): Promise<TaskRecord> {
    return this.store.patchTask(taskId, patch, options);
  }
  setStatus(
    taskId: string,
    status: TaskStatus,
    options: TaskMutationOptions = {}
  ): Promise<TaskRecord> {
    return this.store.setTaskStatus(taskId, status, options);
  }
  get(taskId: string): TaskRecord | undefined {
    return this.store.getTask(taskId);
  }
  list(options: TaskListOptions = {}): TaskRecord[] {
    return this.store.listTasks(options);
  }
  projection(): TaskProjection {
    return this.store.projection();
  }
}
