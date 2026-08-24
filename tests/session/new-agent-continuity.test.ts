import { mkdtempSync, readFileSync, rmSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  buildContinuityPreToolGuard,
  buildResumeContinuityContext,
  isResumePrompt,
} from '../../src/session/hook-capture/continuity.js';

import {
  buildCursorPreToolGuard,
  buildCursorSessionStartOutput,
  cursorDeniedOutput,
} from '../../src/session/cursor/continuity.js';

import {
  buildCopilotPreToolGuard,
  buildCopilotTransformedPromptOutput,
  copilotDeniedOutput,
} from '../../src/session/copilot/continuity.js';

import { buildGrokPreToolGuard, grokDeniedOutput } from '../../src/session/grok/continuity.js';

import { installGrokContinuitySkill } from '../../src/session/grok/continuity-skill-installer.js';

describe('Phase 04 new-agent continuity', () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });

  it('detects English and Vietnamese resume prompts', () => {
    expect(isResumePrompt('continue')).toBe(true);
    expect(isResumePrompt('Resume the previous work')).toBe(true);
    expect(isResumePrompt('làm tiếp đi')).toBe(true);
    expect(isResumePrompt('tiếp tục phần trước')).toBe(true);
    expect(isResumePrompt('Làm nốt phần đang dở')).toBe(true);
    expect(isResumePrompt('dừng ở đâu rồi?')).toBe(true);
    expect(isResumePrompt('đang làm đến đâu rồi')).toBe(true);
    expect(isResumePrompt('create a new auth module')).toBe(false);
  });

  it('builds a resume directive even when fast context is unavailable', () => {
    const context = buildResumeContinuityContext(
      'tiếp tục',
      '/definitely/missing/project',
      'Test Agent'
    );

    expect(context).toContain('[TOOLNET RESUME REQUEST]');
    expect(context).toContain('memory_agent_ask');
    expect(context).toContain('Do not reconstruct continuity from raw session files');
  });

  it('blocks ToolNet raw history but allows normal repository files', () => {
    expect(
      buildContinuityPreToolGuard({
        path: '/repo/.toolnet/sessions/cursor/abc/events.jsonl',
      }).blocked
    ).toBe(true);

    expect(
      buildContinuityPreToolGuard({
        path: '/repo/.gemini/antigravity-cli/brain/abc/transcript.jsonl',
      }).blocked
    ).toBe(true);

    expect(
      buildContinuityPreToolGuard({
        path: '/repo/src/state.json',
      }).blocked
    ).toBe(false);

    expect(
      buildContinuityPreToolGuard({
        path: '/repo/.toolnet/current.md',
      }).blocked
    ).toBe(false);
  });

  it('returns Cursor native sessionStart context and deny schema', () => {
    const output = buildCursorSessionStartOutput(
      {
        session_id: 'cursor-123',
      },
      {
        CURSOR_PROJECT_DIR: '/definitely/missing/project',
      }
    );

    expect(output.env).toEqual({
      TOOLNET_CURSOR_SESSION_ID: 'cursor-123',
    });

    expect(String(output.additional_context)).toContain('[TOOLNET CONTINUITY]');

    expect(
      buildCursorPreToolGuard({
        tool_input: {
          path: '/repo/.toolnet/sessions/a/events.jsonl',
        },
      }).blocked
    ).toBe(true);

    expect(cursorDeniedOutput('blocked')).toEqual({
      permission: 'deny',
      user_message: 'blocked',
      agent_message: 'blocked',
    });
  });

  it('injects Copilot resume context via userPromptTransformed without changing the displayed prompt', () => {
    const output = buildCopilotTransformedPromptOutput({
      sessionId: 'copilot-1',
      cwd: '/definitely/missing/project',
      prompt: 'continue',
      transformedPrompt: 'continue',
    });

    expect(String(output.modifiedTransformedPrompt)).toContain('continue');

    expect(String(output.modifiedTransformedPrompt)).toContain('[TOOLNET RESUME REQUEST]');

    expect(
      buildCopilotPreToolGuard({
        toolArgs: {
          file_path: '/repo/.toolnet/sessions/a/state.json',
        },
      }).blocked
    ).toBe(true);

    expect(copilotDeniedOutput('blocked')).toEqual({
      permissionDecision: 'deny',
      permissionDecisionReason: 'blocked',
    });
  });

  it('uses Grok native deny schema', () => {
    expect(
      buildGrokPreToolGuard({
        toolInput: {
          path: '/repo/.toolnet/sessions/grok/a/events.jsonl',
        },
      }).blocked
    ).toBe(true);

    expect(grokDeniedOutput('blocked')).toEqual({
      decision: 'deny',
      reason: 'blocked',
    });
  });

  it('installs the Grok continuity skill idempotently', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-grok-continuity-'));

    roots.push(root);

    const skillFile = join(root, '.grok', 'skills', 'toolnet-continuity', 'SKILL.md');

    const first = installGrokContinuitySkill({
      skillFile,
    });

    const second = installGrokContinuitySkill({
      skillFile,
    });

    expect(first.changed).toBe(true);
    expect(second.changed).toBe(false);

    const content = readFileSync(skillFile, 'utf8');

    expect(content).toContain('memory_agent_ask');

    expect(content).toContain('when-to-use: continue, resume');
  });
});
