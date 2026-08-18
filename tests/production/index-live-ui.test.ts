import { afterEach, describe, expect, it, vi } from 'vitest';

import { IndexLiveUI } from '../../src/production/index-live-ui.js';

class FakeStream {
  isTTY = false;

  columns = 80;

  output = '';

  write(chunk: string): boolean {
    this.output += chunk;

    return true;
  }
}

class InteractiveStream extends FakeStream {
  override isTTY = true;
}

function occurrences(input: string, pattern: string): number {
  return input.split(pattern).length - 1;
}

function stripAnsi(input: string): string {
  return input.replace(
    // eslint-disable-next-line no-control-regex
    /\x1b\[[0-9;]*[A-Za-z]/g,
    ''
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe('CodeGraph-style index UI', () => {
  it('renders deterministic scan and parse progress in non-TTY mode', () => {
    const stream = new FakeStream();

    const ui = new IndexLiveUI({
      rootPath: '/tmp/project',

      stream,

      interactive: false,

      stages: [
        {
          id: 'source-index',

          title: 'Source Index',
        },

        {
          id: 'type-resolution',

          title: 'Resolving refs',
        },
      ],
    });

    ui.start();

    ui.scanningComplete(3251);

    ui.parsingProgress(813, 3251);

    ui.parsingProgress(3251, 3251);

    ui.completeStage('source-index', 'Source Index', 1000);

    ui.startStage('type-resolution', 'Resolving refs');

    ui.completeStage('type-resolution', 'Resolving refs', 2000);

    ui.finish({
      files: 3251,

      symbols: 119675,

      edges: 116424,

      durationMs: 33200,

      storage: 'huggingface',
    });

    expect(stream.output).toContain('Initialized in /tmp/project');

    expect(stream.output).toContain('Scanning files — 3,251 found');

    expect(stream.output).toContain('Parsing code');

    expect(stream.output).toContain('Resolving refs');

    expect(stream.output).toContain('Indexed 3,251 files');

    expect(stream.output).toContain('119,675 symbols');

    expect(stream.output).toContain('116,424 edges');

    expect(stream.output).toContain('Done');
  });

  it('rewrites only the active line instead of redrawing the whole tree', () => {
    vi.useFakeTimers();

    const stream = new InteractiveStream();

    const ui = new IndexLiveUI({
      rootPath: '/root/zalo_app/zalo_app',

      stream,

      interactive: true,

      intervalMs: 180,

      stages: [
        {
          id: 'source-index',

          title: 'Source Index',
        },

        {
          id: 'type-resolution',

          title: 'Resolving refs',
        },
      ],
    });

    ui.start();

    ui.scanningComplete(100);

    for (let current = 1; current <= 100; current += 1) {
      ui.parsingProgress(current, 100);
    }

    ui.completeStage('source-index', 'Source Index', 800);

    ui.startStage('type-resolution', 'Resolving refs');

    vi.advanceTimersByTime(900);

    ui.completeStage('type-resolution', 'Resolving refs', 900);

    ui.finish({
      files: 100,

      symbols: 381,

      edges: 991,

      durationMs: 1800,

      storage: 'huggingface',
    });

    /*
     * Header/project is printed once.
     */
    expect(occurrences(stream.output, 'Initialized in')).toBe(1);

    /*
     * The old UI depended on full-frame cursor restoration.
     * Those sequences caused duplicated blocks on mobile SSH.
     */
    expect(stream.output).not.toContain('\x1b[s');

    expect(stream.output).not.toContain('\x1b[u');

    expect(stream.output).not.toContain('\x1b[J');

    /*
     * New renderer clears and rewrites only the current line.
     */
    expect(stream.output).toContain('\r\x1b[2K');

    /*
     * 100 parsing updates must not create 100 physical lines.
     */
    const newlineCount = occurrences(stream.output, '\n');

    expect(newlineCount).toBeLessThan(20);

    expect(stream.output).toContain('Indexed 100 files');

    expect(stream.output).toContain('Storage: huggingface');
  });

  it('keeps narrow mobile terminals compact', () => {
    vi.useFakeTimers();

    const stream = new InteractiveStream();

    stream.columns = 44;

    const ui = new IndexLiveUI({
      rootPath: '/root/a/very/very/long/project/path/zalo_app',

      stream,

      interactive: true,

      stages: [
        {
          id: 'source-index',

          title: 'Source Index',
        },

        {
          id: 'architecture',

          title: 'Architecture Intelligence With Very Long Name',
        },
      ],
    });

    ui.start();

    ui.scanningComplete(39);

    ui.parsingProgress(27, 39);

    ui.completeStage('source-index', 'Source Index', 500);

    ui.startStage('architecture', 'Architecture Intelligence With Very Long Name');

    vi.advanceTimersByTime(400);

    ui.completeStage('architecture', 'Architecture Intelligence', 400);

    ui.finish({
      files: 39,

      symbols: 381,

      edges: 991,

      durationMs: 900,

      storage: 'huggingface',
    });

    const plain = stripAnsi(stream.output);

    expect(plain).toContain('Parsing code');

    expect(plain).toContain('Architecture');

    expect(plain).toContain('Done');

    expect(occurrences(plain, 'Initialized in')).toBe(1);
  });

  it('can be disabled completely for JSON output', () => {
    const stream = new InteractiveStream();

    const ui = new IndexLiveUI({
      rootPath: '/tmp/project',

      stream,

      enabled: false,

      stages: [],
    });

    ui.start();

    ui.scanningComplete(10);

    ui.parsingProgress(10, 10);

    ui.finish({
      files: 10,

      symbols: 20,

      edges: 30,

      durationMs: 100,

      storage: 'local',
    });

    expect(stream.output).toBe('');
  });
});
