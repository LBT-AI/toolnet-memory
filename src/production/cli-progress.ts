export interface CliProgressStream {
  isTTY?: boolean;

  write(chunk: string): unknown;
}

export interface CliProgressOptions {
  stream?: CliProgressStream;

  enabled?: boolean;

  interactive?: boolean;

  color?: boolean;

  intervalMs?: number;
}

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

const ANSI = {
  clear: '\r\x1b[2K',

  cyan: '\x1b[36m',

  green: '\x1b[32m',

  red: '\x1b[31m',

  yellow: '\x1b[33m',

  dim: '\x1b[2m',

  reset: '\x1b[0m',
};

function elapsedText(startedAt: number): string {
  const elapsed = Date.now() - startedAt;

  if (elapsed < 1000) {
    return `${elapsed}ms`;
  }

  if (elapsed < 10000) {
    return `${(elapsed / 1000).toFixed(1)}s`;
  }

  return `${Math.round(elapsed / 1000)}s`;
}

export class CliProgress {
  private readonly stream: CliProgressStream;

  private readonly enabled: boolean;

  private readonly interactive: boolean;

  private readonly color: boolean;

  private readonly intervalMs: number;

  private label: string;

  private frame = 0;

  private startedAt = 0;

  private timer?: NodeJS.Timeout;

  private active = false;

  constructor(
    label: string,

    options: CliProgressOptions = {}
  ) {
    this.label = label;

    this.stream = options.stream ?? process.stderr;

    this.enabled = options.enabled ?? true;

    this.interactive = options.interactive ?? this.stream.isTTY === true;

    this.color = options.color ?? (this.interactive && process.env.NO_COLOR === undefined);

    this.intervalMs = Math.max(40, options.intervalMs ?? 80);
  }

  start(): this {
    if (!this.enabled || this.active) {
      return this;
    }

    this.active = true;

    this.startedAt = Date.now();

    if (!this.interactive) {
      this.stream.write(`→ ${this.label}\n`);

      return this;
    }

    this.render();

    this.timer = setInterval(() => {
      this.frame = (this.frame + 1) % FRAMES.length;

      this.render();
    }, this.intervalMs);

    this.timer.unref?.();

    return this;
  }

  update(label: string): this {
    this.label = label;

    if (this.enabled && this.active && this.interactive) {
      this.render();
    }

    return this;
  }

  succeed(label?: string): void {
    this.finish('✓', label ?? this.label, ANSI.green);
  }

  fail(label?: string): void {
    this.finish('✗', label ?? this.label, ANSI.red);
  }

  warn(label?: string): void {
    this.finish('!', label ?? this.label, ANSI.yellow);
  }

  stop(): void {
    if (!this.active) {
      return;
    }

    if (this.timer) {
      clearInterval(this.timer);

      this.timer = undefined;
    }

    if (this.enabled && this.interactive) {
      this.stream.write(ANSI.clear);
    }

    this.active = false;
  }

  private render(): void {
    if (!this.enabled || !this.active || !this.interactive) {
      return;
    }

    const frame = FRAMES[this.frame];

    const spinner = this.color ? `${ANSI.cyan}${frame}${ANSI.reset}` : frame;

    const elapsed = elapsedText(this.startedAt);

    const duration = this.color ? `${ANSI.dim}${elapsed}${ANSI.reset}` : elapsed;

    this.stream.write(`${ANSI.clear}${spinner} ${this.label} ${duration}`);
  }

  private finish(
    symbol: string,

    label: string,

    color: string
  ): void {
    if (!this.enabled) {
      this.active = false;

      return;
    }

    if (!this.startedAt) {
      this.startedAt = Date.now();
    }

    if (this.timer) {
      clearInterval(this.timer);

      this.timer = undefined;
    }

    const elapsed = elapsedText(this.startedAt);

    const renderedSymbol = this.color ? `${color}${symbol}${ANSI.reset}` : symbol;

    const duration = this.color ? `${ANSI.dim}${elapsed}${ANSI.reset}` : elapsed;

    if (this.interactive) {
      this.stream.write(`${ANSI.clear}${renderedSymbol} ${label} ${duration}\n`);
    } else {
      this.stream.write(`${renderedSymbol} ${label} (${elapsed})\n`);
    }

    this.active = false;
  }
}

export async function withProgress<T>(
  label: string,

  action: () => Promise<T> | T,

  options: CliProgressOptions = {}
): Promise<T> {
  const progress = new CliProgress(label, options).start();

  try {
    const result = await action();

    progress.succeed();

    return result;
  } catch (error) {
    progress.fail();

    throw error;
  }
}
