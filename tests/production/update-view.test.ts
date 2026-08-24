import { describe, expect, it } from 'vitest';

import { renderUpdateFrame } from '../../src/production/update-view.js';

const AMBER = '\x1b[38;5;214m';
const GREEN = '\x1b[32m';
const DIM = '\x1b[2m';

describe('ToolNet update view', () => {
  it('renders the requested boxed layout', () => {
    const output = renderUpdateFrame(
      {
        current: '0.3.6',
        latest: '0.3.8',
        status: 'Updating...',
        step: 2,
        totalSteps: 4,
        label: 'Downloading package',
        percent: 46,
        elapsedMs: 2100,
        etaMs: 3000,
      },
      62
    );

    expect(output).toContain('┌ ToolNet Memory Update');
    expect(output).toContain('Current : v0.3.6');
    expect(output).toContain('Latest  : v0.3.8');
    expect(output).toContain('Status  : Updating...');
    expect(output).toContain('Step 2/4  Downloading package');
    expect(output).toContain('46%');
    expect(output).toContain('2.1s');
    expect(output).toContain('ETA: 3.0s');
    expect(output).toContain('█');
    expect(output).toContain('░');
  });

  it('uses ToolNet amber for active progress and percent', () => {
    const output = renderUpdateFrame(
      {
        current: '0.3.9',
        latest: '0.3.10',
        status: 'Updating...',
        step: 2,
        totalSteps: 4,
        label: 'Downloading & installing package',
        percent: 46,
        elapsedMs: 2100,
        etaMs: 3000,
      },
      68,
      {
        color: true,
      }
    );

    expect(output).toContain(`${AMBER}█`);
    expect(output).toContain(`${AMBER}46%`);
    expect(output).toContain(`${DIM}░`);
    expect(output).toContain(`${DIM}2.1s`);
    expect(output).toContain(`${DIM}ETA: 3.0s`);
  });

  it('switches active progress to green only after completion', () => {
    const output = renderUpdateFrame(
      {
        current: '0.3.9',
        latest: '0.3.10',
        status: 'Updated successfully',
        step: 4,
        totalSteps: 4,
        label: 'Complete',
        percent: 100,
        elapsedMs: 5400,
        etaMs: 0,
        completed: true,
      },
      68,
      {
        color: true,
      }
    );

    expect(output).toContain(`${GREEN}█`);
    expect(output).toContain(`${GREEN}100%`);
    expect(output).toContain(`${GREEN}Updated successfully`);
  });

  it('keeps the frame bounded on narrow terminals without ANSI width drift', () => {
    const output = renderUpdateFrame(
      {
        current: '0.3.9',
        latest: '0.3.10',
        status: 'Updating...',
        step: 2,
        totalSteps: 4,
        label: 'Downloading & installing package',
        percent: 73,
        elapsedMs: 12_000,
        etaMs: 4300,
      },
      52,
      {
        color: true,
      }
    );

    const strip = (value: string) => value.replace(/\x1b\[[0-9;]*m/g, '');

    const lines = output.split('\n').map(strip);

    expect(lines).toHaveLength(9);
    expect(Math.max(...lines.map((line) => line.length))).toBeLessThanOrEqual(50);
  });

  it('renders checking state without a fake version prefix', () => {
    const output = renderUpdateFrame(
      {
        current: '0.3.9',
        latest: 'checking…',
        status: 'Checking for updates...',
        step: 1,
        totalSteps: 4,
        label: 'Checking registry',
        percent: 8,
        elapsedMs: 400,
        etaMs: 1900,
      },
      80
    );

    expect(output).toContain('Latest  : checking…');
    expect(output).not.toContain('vchecking');
  });
});
