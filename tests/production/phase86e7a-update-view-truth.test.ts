/*
 * Phase 86E.7A P0-A — update progress truth.
 *
 * The updater UI must not hide post-verify work behind 99% "Verifying
 * installation", and must never show a fake `ETA: 0.0s` while it may still
 * wait tens of seconds on the daemon restart.
 */

import { describe, expect, it } from 'vitest';

import { renderUpdateFrame, upgradePhaseStatusLabel } from '../../src/production/update-view.js';

describe('Phase 86E.7A — update progress truth', () => {
  it('U12: Step 4/4 Applying local upgrade renders past the verify step', () => {
    const output = renderUpdateFrame(
      {
        current: '0.6.1',
        latest: '0.6.2',
        status: 'Inspecting local state...',
        step: 4,
        totalSteps: 4,
        label: 'Applying local upgrade',
        percent: 99,
        elapsedMs: 1500,
        etaMs: null,
      },
      80
    );

    expect(output).toContain('Step 4/4  Applying local upgrade');
    expect(output).toContain('99%');
  });

  it('U13: the daemon restart phase is visible in the status line', () => {
    expect(upgradePhaseStatusLabel('restart_daemon')).toBe('Restarting ToolNet daemon...');
    expect(upgradePhaseStatusLabel('verify_upgrade')).toBe('Verifying upgraded runtime...');
    expect(upgradePhaseStatusLabel('inspect')).toBe('Inspecting local state...');

    const output = renderUpdateFrame(
      {
        current: '0.6.1',
        latest: '0.6.2',
        status: upgradePhaseStatusLabel('restart_daemon'),
        step: 4,
        totalSteps: 4,
        label: 'Applying local upgrade',
        percent: 99,
        elapsedMs: 12_000,
        etaMs: null,
      },
      80
    );

    expect(output).toContain('Restarting ToolNet daemon...');
  });

  it('U14: no misleading ETA=0 during a pending operation', () => {
    const output = renderUpdateFrame(
      {
        current: '0.6.1',
        latest: '0.6.2',
        status: 'Restarting ToolNet daemon...',
        step: 4,
        totalSteps: 4,
        label: 'Applying local upgrade',
        percent: 99,
        elapsedMs: 12_000,
        etaMs: null,
      },
      80
    );

    expect(output).not.toContain('ETA: 0.0s');
    expect(output).toContain('working…');
  });

  it('keeps numeric ETA rendering for estimable phases', () => {
    const output = renderUpdateFrame(
      {
        current: '0.6.1',
        latest: '0.6.2',
        status: 'Updating...',
        step: 2,
        totalSteps: 4,
        label: 'Downloading & installing package',
        percent: 46,
        elapsedMs: 2100,
        etaMs: 3000,
      },
      80
    );

    expect(output).toContain('ETA: 3.0s');
  });
});
