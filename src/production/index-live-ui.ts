export interface IndexUiStream {
  isTTY?: boolean;

  write(chunk: string): unknown;
}

export interface IndexUiStage {
  id: string;

  title: string;
}

export interface IndexLiveUiOptions {
  rootPath: string;

  stages: IndexUiStage[];

  stream?: IndexUiStream;

  enabled?: boolean;

  interactive?: boolean;
}

interface StageState extends IndexUiStage {
  state: 'pending' | 'active' | 'done';

  durationMs?: number;
}

const SPINNERS = ['◆', '◇'];

const ANSI = {
  save: '\x1b[s',

  restore: '\x1b[u',

  clearDown: '\x1b[J',

  hideCursor: '\x1b[?25l',

  showCursor: '\x1b[?25h',

  reset: '\x1b[0m',

  green: '\x1b[32m',

  gray: '\x1b[90m',

  white: '\x1b[97m',

  amber: '\x1b[38;5;214m',

  cyan: '\x1b[36m',
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function durationText(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  return `${(ms / 1000).toFixed(1)}s`;
}

function progressBar(current: number, total: number, width = 24): string {
  const ratio = total > 0 ? Math.min(1, Math.max(0, current / total)) : 0;

  const filled = Math.round(ratio * width);

  return '━'.repeat(filled) + '─'.repeat(Math.max(0, width - filled));
}

export class IndexLiveUI {
  private readonly stream: IndexUiStream;

  private readonly interactive: boolean;

  private readonly enabled: boolean;

  private readonly rootPath: string;

  private readonly stages: StageState[];

  private timer?: NodeJS.Timeout;

  private spinnerFrame = 0;

  private scanTotal?: number;

  private parseCurrent = 0;

  private parseTotal = 0;

  private startedAt = Date.now();

  private lastPlainParseBucket = -1;

  constructor(options: IndexLiveUiOptions) {
    this.stream = options.stream ?? process.stdout;

    this.enabled = options.enabled ?? true;

    this.interactive = options.interactive ?? this.stream.isTTY === true;

    this.rootPath = options.rootPath;

    this.stages = options.stages.map((stage) => ({
      ...stage,

      state: 'pending',
    }));
  }

  start(): void {
    if (!this.enabled) {
      return;
    }

    this.startedAt = Date.now();

    if (!this.interactive) {
      this.stream.write('◇ Initializing ToolNet Index\n');

      this.stream.write(`◇ Initialized in ${this.rootPath}\n`);

      return;
    }

    this.stream.write(`${ANSI.hideCursor}${ANSI.save}`);

    this.render();

    this.timer = setInterval(() => {
      this.spinnerFrame = (this.spinnerFrame + 1) % SPINNERS.length;

      this.render();
    }, 160);

    this.timer.unref?.();
  }

  scanningComplete(filesFound: number): void {
    this.scanTotal = filesFound;

    this.parseTotal = filesFound;

    if (!this.enabled) {
      return;
    }

    if (!this.interactive) {
      this.stream.write(`◆ Scanning files — ${formatNumber(filesFound)} found\n`);

      return;
    }

    this.render();
  }

  parsingProgress(current: number, total: number): void {
    this.parseCurrent = current;

    this.parseTotal = total;

    if (!this.enabled) {
      return;
    }

    if (!this.interactive) {
      const percent = total > 0 ? Math.floor((current / total) * 100) : 100;

      const bucket = percent >= 100 ? 100 : Math.floor(percent / 25) * 25;

      if (bucket !== this.lastPlainParseBucket) {
        this.lastPlainParseBucket = bucket;

        this.stream.write(`→ Parsing code — ${percent}%\n`);
      }

      return;
    }

    this.render();
  }

  startStage(id: string, title: string): void {
    const stage = this.stages.find((item) => item.id === id);

    if (stage) {
      stage.state = 'active';
      stage.title = title;
    }

    if (!this.enabled) {
      return;
    }

    if (!this.interactive) {
      /*
       * Source Index already has its own scanning/parsing UI.
       */
      if (id !== 'source-index') {
        this.stream.write(`→ ${title}\n`);
      }

      return;
    }

    this.render();
  }

  completeStage(id: string, title: string, durationMs = 0): void {
    const stage = this.stages.find((item) => item.id === id);

    if (stage) {
      stage.state = 'done';
      stage.title = title;
      stage.durationMs = durationMs;
    }

    if (!this.enabled) {
      return;
    }

    if (!this.interactive) {
      if (id === 'source-index') {
        this.stream.write('✓ Parsing code — done\n');
      } else {
        this.stream.write(`✓ ${title} (${durationText(durationMs)})\n`);
      }

      return;
    }

    this.render();
  }

  finish(result: {
    files: number;

    symbols: number;

    edges: number;

    durationMs: number;

    storage: string;
  }): void {
    this.stopTimer();

    if (!this.enabled) {
      return;
    }

    if (this.interactive) {
      this.render(true);

      this.stream.write(ANSI.showCursor);
    }

    const lines = [
      '',
      `◆ Indexed ${formatNumber(result.files)} files`,
      '',
      `◇ ${formatNumber(result.symbols)} symbols, ${formatNumber(result.edges)} edges in ${durationText(result.durationMs)}`,
      `◇ Storage: ${result.storage}`,
      '',
      'Done',
      '',
    ];

    this.stream.write(lines.join('\n'));
  }

  fail(message: string): void {
    this.stopTimer();

    if (!this.enabled) {
      return;
    }

    if (this.interactive) {
      this.stream.write(`${ANSI.restore}${ANSI.clearDown}${ANSI.showCursor}`);
    }

    this.stream.write(`✗ ${message}\n`);
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);

      this.timer = undefined;
    }
  }

  private color(value: string, code: string): string {
    if (!this.interactive || process.env.NO_COLOR !== undefined) {
      return value;
    }

    return `${code}${value}${ANSI.reset}`;
  }

  private frame(final = false): string {
    const lines: string[] = [];

    lines.push(this.color('◇ Initializing ToolNet Index', ANSI.white));

    lines.push('');

    lines.push(`${this.color('◆', ANSI.green)} Initialized in ${this.rootPath}`);

    lines.push(this.color('│', ANSI.gray));

    if (this.scanTotal !== undefined) {
      lines.push(
        `${this.color('├', ANSI.gray)} ${this.color('◆', ANSI.green)} Scanning files — ${formatNumber(this.scanTotal)} found`
      );
    } else {
      lines.push(
        `${this.color('├', ANSI.gray)} ${this.color(
          SPINNERS[this.spinnerFrame],
          ANSI.amber
        )} Scanning files`
      );
    }

    const parseDone = this.parseTotal > 0 && this.parseCurrent >= this.parseTotal;

    if (this.scanTotal !== undefined) {
      if (parseDone) {
        lines.push(
          `${this.color('├', ANSI.gray)} ${this.color('◆', ANSI.green)} Parsing code — done`
        );
      } else {
        const percent =
          this.parseTotal > 0 ? Math.floor((this.parseCurrent / this.parseTotal) * 100) : 0;

        const bar = progressBar(this.parseCurrent, this.parseTotal);

        lines.push(
          `${this.color('├', ANSI.gray)} ${this.color(
            SPINNERS[this.spinnerFrame],
            ANSI.amber
          )} Parsing code  ${this.color(bar, ANSI.amber)} ${String(percent).padStart(3)}%`
        );
      }
    }

    for (const stage of this.stages) {
      if (stage.id === 'source-index') {
        continue;
      }

      if (stage.state === 'pending' && !final) {
        continue;
      }

      if (stage.state === 'active') {
        lines.push(
          `${this.color('├', ANSI.gray)} ${this.color(
            SPINNERS[this.spinnerFrame],
            ANSI.amber
          )} ${stage.title}`
        );

        continue;
      }

      if (stage.state === 'done') {
        lines.push(
          `${this.color('├', ANSI.gray)} ${this.color('◆', ANSI.green)} ${stage.title} — done`
        );
      }
    }

    lines.push(this.color('│', ANSI.gray));

    lines.push(`${this.color('◇', ANSI.cyan)} ${durationText(Date.now() - this.startedAt)}`);

    return lines.join('\n');
  }

  private render(final = false): void {
    if (!this.enabled || !this.interactive) {
      return;
    }

    this.stream.write(`${ANSI.restore}${ANSI.clearDown}${this.frame(final)}`);
  }
}
