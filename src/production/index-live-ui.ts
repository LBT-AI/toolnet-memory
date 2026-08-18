export interface IndexUiStream {
  isTTY?: boolean;

  columns?: number;

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

  intervalMs?: number;
}

interface StageState extends IndexUiStage {
  state: 'pending' | 'active' | 'done';

  durationMs?: number;

  startedAt?: number;
}

type ActiveLine =
  | {
      type: 'scan';
    }
  | {
      type: 'parse';
    }
  | {
      type: 'stage';

      id: string;
    };

const SPINNERS = ['◇', '◆'];

const ANSI = {
  clearLine: '\r\x1b[2K',

  reset: '\x1b[0m',

  green: '\x1b[32m',

  gray: '\x1b[90m',

  white: '\x1b[97m',

  amber: '\x1b[38;5;214m',

  cyan: '\x1b[36m',

  red: '\x1b[31m',
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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function truncate(value: string, width: number): string {
  if (width <= 0) {
    return '';
  }

  if (value.length <= width) {
    return value;
  }

  if (width <= 3) {
    return value.slice(0, width);
  }

  return `${value.slice(0, width - 1)}…`;
}

function progressBar(current: number, total: number, width: number): string {
  const ratio = total > 0 ? clamp(current / total, 0, 1) : 0;

  const filled = Math.round(ratio * width);

  return '━'.repeat(filled) + '─'.repeat(Math.max(0, width - filled));
}

function activityBar(frame: number, width: number): string {
  const safeWidth = Math.max(4, width);

  const pulseWidth = Math.min(4, safeWidth);

  const travel = Math.max(1, safeWidth - pulseWidth + 1);

  const position = frame % travel;

  return (
    '─'.repeat(position) +
    '━'.repeat(pulseWidth) +
    '─'.repeat(Math.max(0, safeWidth - position - pulseWidth))
  );
}

export class IndexLiveUI {
  private readonly stream: IndexUiStream;

  private readonly interactive: boolean;

  private readonly enabled: boolean;

  private readonly colorEnabled: boolean;

  private readonly rootPath: string;

  private readonly stages: StageState[];

  private readonly intervalMs: number;

  private timer?: NodeJS.Timeout;

  private spinnerFrame = 0;

  private startedAt = Date.now();

  private scanTotal?: number;

  private parseCurrent = 0;

  private parseTotal = 0;

  private active?: ActiveLine;

  private lastPlainParseBucket = -1;

  private lastInteractiveParsePercent = -1;

  private finished = false;

  constructor(options: IndexLiveUiOptions) {
    this.stream = options.stream ?? process.stdout;

    this.enabled = options.enabled ?? true;

    const requestedInteractive = options.interactive ?? this.stream.isTTY === true;

    this.interactive = requestedInteractive && process.env.TERM !== 'dumb';

    this.colorEnabled = this.interactive && process.env.NO_COLOR === undefined;

    this.rootPath = options.rootPath;

    this.intervalMs = clamp(options.intervalMs ?? 180, 80, 1000);

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

    this.writeStatic(this.color('◇ Initializing ToolNet Index', ANSI.white));

    this.stream.write('\n');

    const availablePathWidth = Math.max(16, this.terminalWidth() - 18);

    this.writeStatic(
      `${this.color('◆', ANSI.green)} Initialized in ${truncate(this.rootPath, availablePathWidth)}`
    );

    this.writeStatic(this.color('│', ANSI.gray));

    this.active = {
      type: 'scan',
    };

    this.renderActive();

    this.timer = setInterval(() => {
      this.spinnerFrame = (this.spinnerFrame + 1) % 10000;

      this.renderActive();
    }, this.intervalMs);

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

    this.commitActive(
      `${this.tree()} ${this.doneSymbol()} Scanning files — ${formatNumber(filesFound)} found`
    );

    this.active = {
      type: 'parse',
    };

    this.renderActive();
  }

  parsingProgress(current: number, total: number): void {
    this.parseCurrent = current;

    this.parseTotal = total;

    if (!this.enabled) {
      return;
    }

    const percent = total > 0 ? Math.floor((current / total) * 100) : 100;

    if (!this.interactive) {
      const bucket = percent >= 100 ? 100 : Math.floor(percent / 25) * 25;

      if (bucket !== this.lastPlainParseBucket) {
        this.lastPlainParseBucket = bucket;

        this.stream.write(`→ Parsing code — ${percent}%\n`);
      }

      return;
    }

    if (percent === this.lastInteractiveParsePercent && current < total) {
      return;
    }

    this.lastInteractiveParsePercent = percent;

    if (this.active?.type !== 'parse') {
      this.active = {
        type: 'parse',
      };
    }

    this.renderActive();
  }

  startStage(id: string, title: string): void {
    const stage = this.stages.find((item) => item.id === id);

    if (stage) {
      stage.state = 'active';

      stage.title = title;

      stage.startedAt = Date.now();
    }

    if (!this.enabled) {
      return;
    }

    /*
     * Source Index already owns scan + parse lines.
     */
    if (id === 'source-index') {
      return;
    }

    if (!this.interactive) {
      this.stream.write(`→ ${title}\n`);

      return;
    }

    this.active = {
      type: 'stage',

      id,
    };

    this.renderActive();
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

    if (id === 'source-index') {
      this.commitActive(`${this.tree()} ${this.doneSymbol()} Parsing code — done`);

      return;
    }

    this.commitActive(
      `${this.tree()} ${this.doneSymbol()} ${title} — done ${this.color(
        durationText(durationMs),
        ANSI.gray
      )}`
    );
  }

  finish(result: {
    files: number;

    symbols: number;

    edges: number;

    durationMs: number;

    storage: string;
  }): void {
    this.finished = true;

    this.stopTimer();

    if (!this.enabled) {
      return;
    }

    if (this.interactive && this.active) {
      this.clearActive();

      this.active = undefined;
    }

    if (this.interactive) {
      this.writeStatic(this.color('│', ANSI.gray));

      this.writeStatic(
        `${this.color('◆', ANSI.green)} Indexed ${formatNumber(result.files)} files`
      );

      this.writeStatic(this.color('│', ANSI.gray));

      this.writeStatic(
        `${this.color('◇', ANSI.cyan)} ${formatNumber(result.symbols)} symbols, ${formatNumber(
          result.edges
        )} edges in ${durationText(result.durationMs)}`
      );

      this.writeStatic(`${this.color('◇', ANSI.cyan)} Storage: ${result.storage}`);

      this.writeStatic(this.color('│', ANSI.gray));

      this.writeStatic(`${this.color('└', ANSI.gray)} ${this.color('◆', ANSI.green)} Done`);

      this.stream.write('\n');

      return;
    }

    const lines = [
      '',
      `◆ Indexed ${formatNumber(result.files)} files`,
      '',
      `◇ ${formatNumber(result.symbols)} symbols, ${formatNumber(
        result.edges
      )} edges in ${durationText(result.durationMs)}`,
      `◇ Storage: ${result.storage}`,
      '',
      'Done',
      '',
    ];

    this.stream.write(lines.join('\n'));
  }

  fail(message: string): void {
    this.finished = true;

    this.stopTimer();

    if (!this.enabled) {
      return;
    }

    if (this.interactive) {
      this.clearActive();

      this.active = undefined;

      this.stream.write(`${this.color('✗', ANSI.red)} ${message}\n`);

      return;
    }

    this.stream.write(`✗ ${message}\n`);
  }

  private terminalWidth(): number {
    const streamColumns = this.stream.columns;

    if (typeof streamColumns === 'number' && Number.isFinite(streamColumns)) {
      return clamp(Math.floor(streamColumns), 32, 240);
    }

    const stdoutColumns = process.stdout.columns;

    if (typeof stdoutColumns === 'number' && Number.isFinite(stdoutColumns)) {
      return clamp(Math.floor(stdoutColumns), 32, 240);
    }

    return 80;
  }

  private tree(): string {
    return this.color('├', ANSI.gray);
  }

  private doneSymbol(): string {
    return this.color('◆', ANSI.green);
  }

  private activeSymbol(): string {
    return this.color(SPINNERS[this.spinnerFrame % SPINNERS.length], ANSI.amber);
  }

  private color(value: string, code: string): string {
    if (!this.colorEnabled) {
      return value;
    }

    return `${code}${value}${ANSI.reset}`;
  }

  private activeLine(): string | undefined {
    if (!this.active) {
      return undefined;
    }

    if (this.active.type === 'scan') {
      return `${this.tree()} ${this.activeSymbol()} Scanning files`;
    }

    if (this.active.type === 'parse') {
      const percent =
        this.parseTotal > 0
          ? clamp(Math.floor((this.parseCurrent / this.parseTotal) * 100), 0, 100)
          : 0;

      const width = clamp(this.terminalWidth() - 34, 8, 24);

      const bar = progressBar(this.parseCurrent, this.parseTotal, width);

      return `${this.tree()} ${this.activeSymbol()} Parsing code  ${this.color(
        bar,
        ANSI.amber
      )} ${String(percent).padStart(3)}%`;
    }

    const active = this.active;

    if (active.type !== 'stage') {
      return undefined;
    }

    const stage = this.stages.find((item) => item.id === active.id);

    if (!stage) {
      return undefined;
    }

    const elapsed = durationText(Date.now() - (stage.startedAt ?? Date.now()));

    const width = clamp(this.terminalWidth() - 44, 6, 18);

    const bar = activityBar(this.spinnerFrame, width);

    const maxTitleWidth = clamp(this.terminalWidth() - width - 18, 10, 36);

    return `${this.tree()} ${this.activeSymbol()} ${truncate(
      stage.title,
      maxTitleWidth
    )}  ${this.color(bar, ANSI.amber)} ${this.color(elapsed, ANSI.gray)}`;
  }

  private renderActive(): void {
    if (!this.enabled || !this.interactive || this.finished) {
      return;
    }

    const line = this.activeLine();

    if (!line) {
      return;
    }

    /*
     * Mobile-safe renderer:
     *
     * Rewrite ONLY the current line.
     *
     * Do not save/restore cursor position.
     * Do not clear the screen below the cursor.
     * Do not rebuild the whole tree every animation frame.
     */
    this.stream.write(`${ANSI.clearLine}${line}`);
  }

  private clearActive(): void {
    if (!this.interactive) {
      return;
    }

    this.stream.write(ANSI.clearLine);
  }

  private commitActive(line: string): void {
    if (!this.interactive) {
      return;
    }

    this.stream.write(`${ANSI.clearLine}${line}\n`);

    this.active = undefined;
  }

  private writeStatic(line: string): void {
    this.stream.write(`${line}\n`);
  }

  private stopTimer(): void {
    if (!this.timer) {
      return;
    }

    clearInterval(this.timer);

    this.timer = undefined;
  }
}
