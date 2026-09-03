import 'dotenv/config';

import { loadConfig, ProjectManager } from '../core/index.js';

import {
  createStorageProvider,
  withStorageRetry,
  ProjectScopedStorageProvider,
} from '../storage/index.js';

import { SnapshotManager } from '../snapshot/index.js';

import { restoreLatestSnapshot } from './recovery.js';
import { safeAppendAuditEvent } from '../audit/log.js';

async function main() {
  const command = process.argv[2];

  const config = loadConfig();

  const project = new ProjectManager().detect();

  const rawStorage = withStorageRetry(
    createStorageProvider({
      provider: config.storage.provider,

      huggingface: config.storage.huggingface,

      localRoot: config.storage.localRoot,
    }),
    {
      attempts: 3,
    }
  );

  const storage = new ProjectScopedStorageProvider(
    rawStorage,
    project.id,
    project.name,
    project.remote ?? project.name
  );

  const manager = new SnapshotManager(storage);

  if (command === 'list') {
    const list = await manager.list(project.id);

    console.log(
      list.map((snapshot) => ({
        id: snapshot.id,

        createdAt: snapshot.createdAt,

        reason: snapshot.reason,
      }))
    );

    return;
  }

  if (command === 'create') {
    const reason = process.argv.slice(3).join(' ') || 'manual-cli';

    const created = await manager.create(project.id, reason);

    if (!created) {
      console.log('No data to snapshot.');
      return;
    }

    await safeAppendAuditEvent(project, {
      action: 'snapshot.create',
      outcome: 'success',
      actor: {
        kind: 'user',
        id: process.env.TOOLNET_AGENT_ID?.trim() || 'cli',
      },
      details: {
        snapshotId: created.id,
        reason,
      },
    });

    console.log(created);

    return;
  }

  if (command === 'restore') {
    const id = process.argv[3];

    if (!id) {
      throw new Error('snapshot id required');
    }

    const backup = await manager.create(project.id, 'before-cli-restore');

    try {
      const restored = await manager.restore(project.id, id);

      await safeAppendAuditEvent(project, {
        action: 'snapshot.restore',
        outcome: 'success',
        actor: {
          kind: 'user',
          id: process.env.TOOLNET_AGENT_ID?.trim() || 'cli',
        },
        target: id,
        details: {
          ...(backup ? { backupSnapshotId: backup.id } : {}),
        },
      });

      console.log(restored);
    } catch (error) {
      await safeAppendAuditEvent(project, {
        action: 'snapshot.restore',
        outcome: 'failed',
        actor: {
          kind: 'user',
          id: process.env.TOOLNET_AGENT_ID?.trim() || 'cli',
        },
        target: id,
        details: {
          ...(backup ? { backupSnapshotId: backup.id } : {}),
          error: error instanceof Error ? error.message : String(error),
        },
      });
      throw error;
    }

    return;
  }

  if (command === 'recover-latest') {
    try {
      const result = await restoreLatestSnapshot(storage, project.id);

      await safeAppendAuditEvent(project, {
        action: 'snapshot.recover',
        outcome: 'success',
        actor: {
          kind: 'user',
          id: process.env.TOOLNET_AGENT_ID?.trim() || 'cli',
        },
      });

      console.log(result);
    } catch (error) {
      await safeAppendAuditEvent(project, {
        action: 'snapshot.recover',
        outcome: 'failed',
        actor: {
          kind: 'user',
          id: process.env.TOOLNET_AGENT_ID?.trim() || 'cli',
        },
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
      throw error;
    }

    return;
  }

  throw new Error('Usage: snapshot-cli list|create|restore|recover-latest');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);

  process.exit(1);
});
