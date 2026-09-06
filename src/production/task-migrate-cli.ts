import { ProjectManager } from '../core/index.js';
import { migrateTaskProjection } from './task-migrate.js';

function main(): void {
  const project = new ProjectManager().detect();
  const result = migrateTaskProjection(project);
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log('');
  console.log('◇ Persistent Task Migration');
  console.log('');
  console.log(`Project     ${result.projectId}`);
  console.log(`Tasks       ${result.tasks}`);
  console.log(`Operations  ${result.operations}`);
  console.log(`Conflicts   ${result.conflicts}`);
  console.log('');
  console.log('✓ Task projection rebuilt from immutable operations');
  console.log('');
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
