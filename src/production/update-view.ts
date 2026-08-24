import { ansiColorsEnabled } from './ui/color.js';

export interface UpdateViewStream {
  isTTY?: boolean;
  columns?: number;
  write(chunk: string): unknown;
}

export interface UpdateFrameState {
  current: string;
  latest: string;
  status: string;
  step: number;
  totalSteps: number;
  label: string;
  percent: number;
  elapsedMs: number;
  etaMs: number;
  completed?: boolean;
  failed?: boolean;
}

export interface StartUpdateStepOptions {
  step: number;
  label: string;
  fromPercent: number;
  toPercent: number;
  estimatedMs: number;
  status?: string;
}

export interface RenderUpdateFrameOptions {
  color?: boolean;
}

const ANSI = {
  reset: '\x1b[0m',
  amber: '\x1b[38;5;214m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

const MIN_WIDTH = 50;
const MAX_WIDTH = 68;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatDuration(ms: number): string {
  const safe = Math.max(0, ms);

  if (safe < 10_000) {
    return `${(safe / 1000).toFixed(1)}s`;
  }

  return `${Math.round(safe / 1000)}s`;
}

function visibleLength(value: string): number {
  return value.replace(/\x1b\[[0-9;]*m/g, '').length;
}

function truncateVisible(value: string, width: number): string {
  if (visibleLength(value) <= width) {
    return value;
  }

  // Colored/truncated strings are only used for simple one-line labels.
  const plain = value.replace(/\x1b\[[0-9;]*m/g, '');

  if (width <= 1) {
    return plain.slice(0, width);
  }

  return `${plain.slice(0, Math.max(0, width - 1))}…`;
}

function padVisible(value: string, width: number): string {
  const rendered = truncateVisible(value, width);
  const padding = Math.max(0, width - visibleLength(rendered));

  return `${rendered}${' '.repeat(padding)}`;
}

function paint(value: string, code: string, enabled: boolean): string {
  return enabled ? `${code}${value}${ANSI.reset}` : value;
}

function contentLine(value: string, width: number): string {
  const contentWidth = width - 4;

  return `│ ${padVisible(value, contentWidth)} │`;
}

function divider(width: number): string {
  return `├${'─'.repeat(width - 2)}┤`;
}

function titleLine(width: number, color: boolean): string {
  const rawTitle = ' ToolNet Memory Update ';
  const decoratedTitle = paint(rawTitle, `${ANSI.bold}${ANSI.amber}`, color);
  const remaining = Math.max(0, width - rawTitle.length - 2);

  return `┌${decoratedTitle}${'─'.repeat(remaining)}┐`;
}

function bottomLine(width: number): string {
  return `└${'─'.repeat(width - 2)}┘`;
}

function statusText(state: UpdateFrameState, color: boolean): string {
  if (state.failed) {
    return paint(state.status, ANSI.red, color);
  }

  if (state.completed) {
    return paint(state.status, ANSI.green, color);
  }

  return paint(state.status, ANSI.amber, color);
}

function progressLine(state: UpdateFrameState, width: number, color: boolean): string {
  const contentWidth = width - 4;
  const percent = clamp(Math.round(state.percent), 0, 100);

  const elapsedPlain = formatDuration(state.elapsedMs);
  const percentPlain = `${percent}%`;
  const suffixVisibleLength = 1 + percentPlain.length + 2 + elapsedPlain.length;

  /*
   * Keep the box width stable even with ANSI colors.
   *
   * [BAR] + space + NN% + 2 spaces + elapsed
   */
  const barWidth = Math.max(12, contentWidth - suffixVisibleLength - 2);

  const filled = clamp(Math.round((barWidth * percent) / 100), 0, barWidth);

  const filledBar = '█'.repeat(filled);
  const emptyBar = '░'.repeat(barWidth - filled);

  const renderedFilled = state.completed
    ? paint(filledBar, ANSI.green, color)
    : paint(filledBar, ANSI.amber, color);

  const renderedEmpty = paint(emptyBar, ANSI.dim, color);

  const renderedPercent = state.completed
    ? paint(percentPlain, ANSI.green, color)
    : paint(percentPlain, ANSI.amber, color);

  const renderedElapsed = paint(elapsedPlain, ANSI.dim, color);

  return contentLine(
    `[${renderedFilled}${renderedEmpty}] ${renderedPercent}  ${renderedElapsed}`,
    width
  );
}

export function renderUpdateFrame(
  state: UpdateFrameState,
  terminalColumns = 80,
  options: RenderUpdateFrameOptions = {}
): string {
  const width = clamp(terminalColumns - 2, MIN_WIDTH, MAX_WIDTH);
  const color = options.color ?? false;

  const latestText = state.latest === 'checking…' ? state.latest : `v${state.latest}`;

  const stepText = `Step ${state.step}/${state.totalSteps}  ${state.label}`;

  const renderedStep = state.completed
    ? paint(stepText, ANSI.green, color)
    : paint(stepText, ANSI.amber, color);

  const eta = paint(`ETA: ${formatDuration(state.etaMs)}`, ANSI.dim, color);

  return [
    titleLine(width, color),
    contentLine(`Current : v${state.current}`, width),
    contentLine(`Latest  : ${latestText}`, width),
    contentLine(`Status  : ${statusText(state, color)}`, width),
    divider(width),
    contentLine(renderedStep, width),
    progressLine(state, width, color),
    contentLine(eta, width),
    bottomLine(width),
  ].join('\n');
}

export class UpdateView {
  private readonly stream: UpdateViewStream;
  private readonly interactive: boolean;
  private readonly color: boolean;
  private readonly totalSteps = 4;

  private current: string;
  private latest = 'checking…';
  private status = 'Preparing...';
  private step = 1;
  private label = 'Checking registry';
  private percent = 0;
  private etaMs = 0;
  private completed = false;
  private failed = false;

  private readonly operationStartedAt = Date.now();
  private stepStartedAt = Date.now();
  private fromPercent = 0;
  private toPercent = 0;
  private estimatedMs = 1;
  private timer?: NodeJS.Timeout;
  private renderedLines = 0;

  constructor(
    current: string,
    options: {
      stream?: UpdateViewStream;
      interactive?: boolean;
      color?: boolean;
    } = {}
  ) {
    this.current = current;
    this.stream = options.stream ?? process.stdout;
    this.interactive = options.interactive ?? this.stream.isTTY === true;

    this.color = options.color ?? (this.interactive && ansiColorsEnabled());
  }

  setLatest(latest: string): void {
    this.latest = latest;
    this.draw();
  }

  startStep(options: StartUpdateStepOptions): void {
    this.stopTimer();

    this.step = options.step;
    this.label = options.label;
    this.status = options.status ?? 'Updating...';
    this.fromPercent = clamp(options.fromPercent, 0, 100);
    this.toPercent = clamp(options.toPercent, this.fromPercent, 100);
    this.percent = this.fromPercent;
    this.estimatedMs = Math.max(250, options.estimatedMs);
    this.stepStartedAt = Date.now();
    this.etaMs = this.estimatedMs;
    this.completed = false;
    this.failed = false;

    this.draw();

    if (!this.interactive || this.fromPercent >= this.toPercent) {
      return;
    }

    this.timer = setInterval(() => {
      this.tick();
    }, 100);

    this.timer.unref?.();
  }

  completeStep(percent: number): void {
    this.stopTimer();

    this.percent = clamp(percent, 0, 100);
    this.etaMs = 0;

    this.draw();
  }

  succeed(latest: string): void {
    this.stopTimer();

    this.latest = latest;
    this.status = 'Updated successfully';
    this.step = 4;
    this.label = 'Complete';
    this.percent = 100;
    this.etaMs = 0;
    this.completed = true;
    this.failed = false;

    this.draw(true);
  }

  alreadyUpToDate(): void {
    this.stopTimer();

    this.status = 'Already up to date';
    this.step = 4;
    this.label = 'Complete';
    this.percent = 100;
    this.etaMs = 0;
    this.completed = true;
    this.failed = false;

    this.draw(true);
  }

  fail(message: string): void {
    this.stopTimer();

    this.status = `Failed: ${message}`;
    this.etaMs = 0;
    this.completed = false;
    this.failed = true;

    this.draw(true);
  }

  private tick(): void {
    const elapsed = Date.now() - this.stepStartedAt;

    /*
     * npm does not expose reliable byte-level progress through this path.
     * This percentage is UI-only and intentionally asymptotic:
     * it never reaches the step cap before the real command succeeds.
     */
    const ratio = 1 - Math.exp(-elapsed / (this.estimatedMs * 0.45));
    const boundedRatio = Math.min(0.96, ratio);

    this.percent = this.fromPercent + (this.toPercent - this.fromPercent) * boundedRatio;

    const estimatedTotal = ratio > 0.02 ? elapsed / ratio : this.estimatedMs;

    this.etaMs = Math.max(250, estimatedTotal - elapsed);

    this.draw();
  }

  private draw(final = false): void {
    const frame = renderUpdateFrame(
      {
        current: this.current,
        latest: this.latest,
        status: this.status,
        step: this.step,
        totalSteps: this.totalSteps,
        label: this.label,
        percent: this.percent,
        elapsedMs: Date.now() - this.operationStartedAt,
        etaMs: this.etaMs,
        completed: this.completed,
        failed: this.failed,
      },
      this.stream.columns ?? 80,
      {
        color: this.color,
      }
    );

    const lines = frame.split('\n');

    if (!this.interactive) {
      if (final || this.renderedLines === 0) {
        this.stream.write(`${frame}\n`);
      }

      this.renderedLines = lines.length;
      return;
    }

    if (this.renderedLines > 0) {
      this.stream.write(`\x1b[${this.renderedLines}A`);
    }

    for (const line of lines) {
      this.stream.write(`\x1b[2K${line}\n`);
    }

    this.renderedLines = lines.length;
  }

  private stopTimer(): void {
    if (!this.timer) {
      return;
    }

    clearInterval(this.timer);
    this.timer = undefined;
  }
}
