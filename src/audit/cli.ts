import { ProjectManager } from '../core/project-manager.js';
import { auditLogPath, readAuditEvents, verifyAuditLog } from './log.js';

function limitFromArgs(args: string[]): number {
  const inline = args.find((arg) => arg.startsWith('--limit='));
  const raw = inline ? inline.slice('--limit='.length) : args[args.indexOf('--limit') + 1];
  if (!raw) {
    return 50;
  }
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`Invalid --limit: ${raw}`);
  }
  return Math.min(parsed, 1_000);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] ?? 'list';
  const project = new ProjectManager().requireExisting(process.cwd());

  if (command === 'verify') {
    const result = verifyAuditLog(project);
    console.log(
      JSON.stringify(
        {
          file: auditLogPath(project),
          ...result,
        },
        null,
        2
      )
    );
    if (!result.valid) {
      process.exitCode = 1;
    }
    return;
  }

  const limit = limitFromArgs(args);
  const events = readAuditEvents(project, limit);

  if (args.includes('--json')) {
    console.log(JSON.stringify(events, null, 2));
    return;
  }

  console.log(`Audit: ${auditLogPath(project)}`);
  console.log(`Events: ${events.length}`);
  for (const event of events) {
    console.log(
      [event.at, event.action, event.outcome, event.actor.kind, event.actor.id ?? '']
        .filter(Boolean)
        .join(' | ')
    );
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
