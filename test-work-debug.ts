import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ProjectManifest } from './src/core/types.js';
import type { StorageObject, StorageProvider } from './src/storage/types.js';
import { SessionCore } from './src/session/core.js';
import { loadWorkState, reconcileWorkState } from './src/work-continuity/index.js';

class MemoryStorage implements StorageProvider {
  readonly name = 'memory';
  readonly objects = new Map<string, Uint8Array>();

  async put(key: string, data: string | Uint8Array) {
    this.objects.set(key, typeof data === 'string' ? Buffer.from(data) : data);
    console.log(`[MemoryStorage.put] key: ${key}, size: ${typeof data === 'string' ? Buffer.from(data).length : data.byteLength}`);
  }

  async get(key: string) {
    return this.objects.get(key) ?? null;
  }

  async getText(key: string) {
    const value = await this.get(key);
    return value ? Buffer.from(value).toString('utf8') : null;
  }

  async exists(key: string) {
    return this.objects.has(key);
  }

  async delete(key: string) {
    this.objects.delete(key);
  }

  async list(prefix = ''): Promise<StorageObject[]> {
    return Array.from(this.objects.entries())
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => ({
        key,
        size: value.byteLength,
      }));
  }
}

function project(): ProjectManifest {
  const root = mkdtempSync(join(tmpdir(), 'toolnet-work-'));
  const now = new Date().toISOString();
  return {
    id: 'project-work-test',
    name: 'ProjectA',
    remote: 'ProjectA',
    rootPath: root,
    createdAt: now,
    updatedAt: now,
    graphVersion: 0,
    memoryVersion: 0,
  };
}

async function main() {
  const p = project();
  const storage = new MemoryStorage();

  const opencode = new SessionCore({
    project: p,
    storage,
    agent: 'opencode',
    nativeSessionId: 'ses_plan',
  });

  console.log('Recording first message...');
  opencode.record({
    type: 'assistant_message',
    role: 'assistant',
    data: {
      content: `Mục tiêu: Hoàn thiện hệ thống memory mới
Kế hoạch: triển khai theo 4 phase
Phase 1 - Session Core
Phase 2 - Work Continuity
Phase 3 - Context Injection
Phase 4 - Guardrails
TODO 1: Hoàn thiện schema
TODO 2: Viết adapter
TODO 3: Chạy E2E`,
    },
  });

  console.log('Recording second message...');
  opencode.record({
    type: 'assistant_message',
    role: 'assistant',
    data: {
      content: `Phase 1 hoàn thành
Phase 2 đang làm
TODO 1 hoàn thành
TODO 2 đang làm`,
    },
  });

  console.log('Flushing...');
  await opencode.flush();

  console.log('Storage contents:');
  for (const [key, value] of storage.objects) {
    console.log(`  ${key}: ${value.byteLength} bytes`);
    if (key.includes('observation')) {
      console.log(`  Content: ${Buffer.from(value).toString('utf8')}`);
    }
  }

  console.log('Loading work state...');
  const state = await loadWorkState(p, storage);
  console.log('State:', JSON.stringify(state, null, 2));

  rmSync(p.rootPath, { recursive: true, force: true });
}

main().catch(console.error);
