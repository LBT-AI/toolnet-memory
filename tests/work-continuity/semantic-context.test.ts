import { mkdtempSync, rmSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import type { StorageObject, StorageProvider } from '../../src/storage/types.js';

import { SessionCore } from '../../src/session/core.js';

import { buildStartupBrief, loadSemanticWorkState } from '../../src/work-continuity/index.js';

class MemoryStorage implements StorageProvider {
  readonly name = 'memory';

  readonly objects = new Map<string, Uint8Array>();

  async put(key: string, data: string | Uint8Array) {
    this.objects.set(key, typeof data === 'string' ? Buffer.from(data) : data);
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

const roots: string[] = [];

function project(): ProjectManifest {
  const root = mkdtempSync(join(tmpdir(), 'toolnet-semantic-'));

  roots.push(root);

  const now = new Date().toISOString();

  return {
    id: 'semantic-project',

    name: 'ProjectA',

    remote: 'ProjectA',

    rootPath: root,

    createdAt: now,

    updatedAt: now,

    graphVersion: 0,

    memoryVersion: 0,
  };
}

afterEach(() => {
  while (roots.length) {
    rmSync(roots.pop()!, {
      recursive: true,

      force: true,
    });
  }
});

describe('Semantic Work Context', () => {
  it('captures mission, objective, rationale and phase meaning', async () => {
    const p = project();

    const storage = new MemoryStorage();

    const core = new SessionCore({
      project: p,

      storage,

      agent: 'opencode',

      nativeSessionId: 'ses-semantic',
    });

    core.record({
      type: 'assistant_message',

      role: 'assistant',

      data: {
        content: `Mission: Cho phép nhiều coding agent tiếp tục cùng một project mà không mất mạch công việc.
Mục tiêu hiện tại: Xây continuity layer dùng chung cho OpenCode, Agy và Codex.
Tại sao chọn hướng này: Session history thô quá dài nên cần trạng thái project có cấu trúc.
Kết quả mong muốn: Agent mới hiểu mục tiêu, tiến độ và lý do của công việc trước khi sửa code.

Phase 1 - Session Capture
Mục đích: Thu thập session thật từ ba agent.
Vì sao: Không có nguồn session thì không thể xây continuity đáng tin cậy.
Deliverable: Session WAL có native session identity.
Done khi:
- OpenCode session được capture.
- Agy conversation được capture.
- Codex thread được capture.

Phase 2 - Semantic Continuity
Mục đích: Giữ lại ý nghĩa và lý do của kế hoạch.
Vì sao: Agent mới không được tiếp tục phase trong sự mù loà.
Deliverable: Semantic work state nhẹ và có provenance.
Phụ thuộc: Phase 1.
Tiêu chí hoàn thành:
- Mission được giữ qua agent khác.
- Current phase có objective và why.
- Thiếu rationale thì không được tự bịa.

Phase 1 hoàn thành
Phase 2 đang làm`,
      },
    });

    await core.flush();

    const semantic = await loadSemanticWorkState(p, storage);

    expect(semantic?.mission?.value).toContain('không mất mạch');

    expect(semantic?.activeObjective?.value).toContain('continuity layer');

    expect(semantic?.planRationale?.value).toContain('Session history');

    const phase2 = semantic?.phases.find((item) => item.order === 2);

    expect(phase2?.objective?.value).toContain('ý nghĩa');

    expect(phase2?.why?.value).toContain('mù loà');

    expect(phase2?.deliverable?.value).toContain('Semantic work state');

    expect(phase2?.acceptanceCriteria.length).toBeGreaterThanOrEqual(3);

    expect(phase2?.dependencies[0]?.value).toContain('Phase 1');
  });

  it('preserves semantic project intent across agents', async () => {
    const p = project();

    const storage = new MemoryStorage();

    const opencode = new SessionCore({
      project: p,

      storage,

      agent: 'opencode',

      nativeSessionId: 'ses-A',
    });

    opencode.record({
      type: 'assistant_message',

      role: 'assistant',

      data: {
        content: `Mission: Xây project continuity layer cho mọi coding agent.
Mục tiêu hiện tại: Hoàn thiện kiến trúc handoff.
Phase 1 - Capture
Mục đích: Lưu session.
Vì sao: Cần nguồn dữ liệu chung.
Phase 1 hoàn thành
Phase 2 - Handoff
Mục đích: Chuyển trạng thái giữa agent.
Phase 2 đang làm`,
      },
    });

    await opencode.flush();

    const agy = new SessionCore({
      project: p,

      storage,

      agent: 'agy',

      nativeSessionId: 'agy-B',
    });

    agy.record({
      type: 'assistant_message',

      role: 'assistant',

      data: {
        content: `Phase 2 - Handoff
Deliverable: Startup brief và handoff state có cấu trúc.
Done khi:
- Agent mới hiểu được việc đang làm.
- Agent mới biết việc tiếp theo.`,
      },
    });

    await agy.flush();

    const semantic = await loadSemanticWorkState(p, storage);

    expect(semantic?.mission?.value).toContain('mọi coding agent');

    const phase2 = semantic?.phases.find((item) => item.order === 2);

    expect(phase2?.deliverable?.value).toContain('Startup brief');

    expect(phase2?.objective?.value).toContain('Chuyển trạng thái');
  });

  it('does not invent rationale when previous session never recorded it', async () => {
    const p = project();

    const storage = new MemoryStorage();

    const core = new SessionCore({
      project: p,

      storage,

      agent: 'codex',

      nativeSessionId: 'thread-no-why',
    });

    core.record({
      type: 'assistant_message',

      role: 'assistant',

      data: {
        content: `Mission: Hoàn thiện project.
Phase 1 - Refactor
Mục đích: Tách runtime thành module riêng.
Phase 1 đang làm`,
      },
    });

    await core.flush();

    const semantic = await loadSemanticWorkState(p, storage);

    const phase1 = semantic?.phases.find((item) => item.order === 1);

    expect(phase1?.objective?.value).toContain('Tách runtime');

    expect(phase1?.why).toBeUndefined();
  });

  it('places meaning before blind next-step execution in startup brief', async () => {
    const p = project();

    const storage = new MemoryStorage();

    const core = new SessionCore({
      project: p,

      storage,

      agent: 'opencode',

      nativeSessionId: 'ses-old',
    });

    core.record({
      type: 'assistant_message',

      role: 'assistant',

      data: {
        content: `Mission: Xây một thư ký kỹ thuật giúp coding agent tiếp tục công việc xuyên phiên.
Mục tiêu hiện tại: Hoàn thiện semantic continuity.
Tại sao: Agent mới phải hiểu ý nghĩa công việc chứ không chỉ số phase.

Phase 1 - Capture
Mục đích: Thu session.
Phase 1 hoàn thành

Phase 2 - Semantic Context
Mục đích: Giữ objective và rationale của phase.
Vì sao: Tránh agent làm tiếp trong sự mù loà.
Deliverable: Semantic state có provenance.
Done khi:
- Startup brief nói rõ mission.
- Startup brief nói rõ mục tiêu phase.
- Startup brief nói rõ why.
Phase 2 đang làm
Bước tiếp theo: hoàn thiện Semantic Context`,
      },
    });

    await core.idle();

    const brief = await buildStartupBrief({
      project: p,

      storage,

      maxTokens: 1000,
    });

    expect(brief.text).toContain('MISSION');

    expect(brief.text).toContain('CURRENT OBJECTIVE');

    expect(brief.text).toContain('WHY THIS WORK MATTERS');

    expect(brief.text).toContain('Phase objective:');

    expect(brief.text).toContain('Why this phase:');

    expect(brief.text).toContain('DEFINITION OF DONE');

    expect(brief.estimatedTokens).toBeLessThanOrEqual(1000);

    expect(brief.text.indexOf('MISSION')).toBeLessThan(brief.text.indexOf('NEXT ACTIONS'));
  });
});
