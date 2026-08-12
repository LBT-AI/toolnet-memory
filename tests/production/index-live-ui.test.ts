import { describe, expect, it } from 'vitest';

import { IndexLiveUI } from '../../src/production/index-live-ui.js';

class FakeStream {
  isTTY = false;

  output = '';

  write(chunk: string): boolean {
    this.output += chunk;

    return true;
  }
}

describe('CodeGraph-style index UI', () => {
  it('renders real scan and parse progress in non-TTY mode', () => {
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
});
