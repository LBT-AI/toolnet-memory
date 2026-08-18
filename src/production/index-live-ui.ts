import { createShimmerProgress, type ShimmerProgress } from './ui/shimmer-progress.js';
import { getGlyphs } from './ui/glyphs.js';
import { ansiColorsEnabled } from './ui/color.js';

export interface IndexUiStream {
  isTTY?: boolean;
  columns?: number;
  write(chunk: string): unknown;
}

export interface IndexUiStage {
  id: string;
  title: string;
}

export interface StageProgressUpdate {
  stage: string;
  current: number;
  total: number;
  phase?: string;
  detail?: string;
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

const ANSI = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  gray: '\x1b[90m',
  white: '\x1b[97m',
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

export class IndexLiveUI {
  private readonly stream: IndexUiStream;
  private readonly interactive: boolean;
  private readonly enabled: boolean;
  private readonly colorEnabled: boolean;
  private readonly rootPath: string;
  private readonly stages: StageState[];

  private shimmerProgress?: ShimmerProgress;
  private startedAt = Date.now();
  private scanTotal?: number;
  private parseCurrent = 0;
  private parseTotal = 0;
  private finished = false;
  private lastPlainParseBucket = -1;

  constructor(options: IndexLiveUiOptions) {
    this.stream = options.stream ?? process.stdout;
    this.enabled = options.enabled ?? true;
    const requestedInteractive = options.interactive ?? this.stream.isTTY === true;
    this.interactive = requestedInteractive && process.env.TERM !== 'dumb';
    this.colorEnabled = this.interactive && ansiColorsEnabled();
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

    const G = getGlyphs();
    
    this.writeStatic(this.color('◇ Initializing ToolNet Index', ANSI.white));
    this.stream.write('\n');

    const availablePathWidth = Math.max(16, this.terminalWidth() - 18);
    this.writeStatic(
      `${this.color(G.phaseDone, ANSI.green)} Initialized in ${truncate(this.rootPath, availablePathWidth)}`
    );
    this.writeStatic(this.color(G.rail, ANSI.gray));

    // Initialize shimmer progress for interactive mode
    this.shimmerProgress = createShimmerProgress();
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

    // Report to shimmer progress
    if (this.shimmerProgress) {
      this.shimmerProgress.onProgress({
        stage: 'scan',
        current: filesFound,
        total: 0, // No total for scan, just count
      });
    }
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

    // Report to shimmer progress
    if (this.shimmerProgress) {
      this.shimmerProgress.onProgress({
        stage: 'parse',
        current,
        total,
      });
    }
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

    // Source Index already owns scan + parse lines
    if (id === 'source-index') {
      return;
    }

    if (!this.interactive) {
      this.stream.write(`→ ${title}\n`);
      return;
    }

    // Map stage IDs to shimmer progress stage names
    const stageMap: Record<string, string> = {
      'type-resolution': 'type-resolution',
      'rich-graph': 'rich-graph',
      'semantic-index': 'semantic-index',
      'architecture': 'architecture',
      'analysis': 'graph-analysis',
      'visualization': 'visualization',
    };

    const mappedStage = stageMap[id] || id;

    // Report to shimmer progress
    if (this.shimmerProgress) {
      this.shimmerProgress.onProgress({
        stage: mappedStage,
        current: 0,
        total: 0,
      });
    }
  }

  stageProgress(update: StageProgressUpdate): void {
    if (!this.enabled || !this.interactive || !this.shimmerProgress) {
      return;
    }

    this.shimmerProgress.onProgress({
      stage: update.stage,
      current: update.current,
      total: update.total,
    });
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

    // For interactive mode, the shimmer progress worker handles stage completion
    // when the next stage starts or when stop() is called
  }

  finish(result: {
    files: number;
    symbols: number;
    edges: number;
    durationMs: number;
    storage: string;
  }): void {
    this.finished = true;

    if (!this.enabled) {
      return;
    }

    // Stop shimmer progress and wait for cleanup
    if (this.shimmerProgress && this.interactive) {
      this.shimmerProgress.stop().then(() => {
        this.printFinishSummary(result);
      });
    } else {
      this.printFinishSummary(result);
    }
  }

  private printFinishSummary(result: {
    files: number;
    symbols: number;
    edges: number;
    durationMs: number;
    storage: string;
  }): void {
    const G = getGlyphs();

    if (this.interactive) {
      this.writeStatic(this.color(G.rail, ANSI.gray));
      this.writeStatic(
        `${this.color(G.phaseDone, ANSI.green)} Indexed ${formatNumber(result.files)} files`
      );
      this.writeStatic(this.color(G.rail, ANSI.gray));
      this.writeStatic(
        `${this.color(G.phaseActive, ANSI.cyan)} ${formatNumber(result.symbols)} symbols, ${formatNumber(
          result.edges
        )} edges in ${durationText(result.durationMs)}`
      );
      this.writeStatic(`${this.color(G.phaseActive, ANSI.cyan)} Storage: ${result.storage}`);
      this.writeStatic(this.color(G.rail, ANSI.gray));
      this.writeStatic(`${this.color(G.corner, ANSI.gray)} ${this.color(G.phaseDone, ANSI.green)} Done`);
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

    if (!this.enabled) {
      return;
    }

    // Stop shimmer progress if active
    if (this.shimmerProgress && this.interactive) {
      this.shimmerProgress.stop().then(() => {
        this.printFailMessage(message);
      });
    } else {
      this.printFailMessage(message);
    }
  }

  private printFailMessage(message: string): void {
    if (this.interactive) {
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

  private color(value: string, code: string): string {
    if (!this.colorEnabled) {
      return value;
    }
    return `${code}${value}${ANSI.reset}`;
  }

  private writeStatic(line: string): void {
    this.stream.write(`${line}\n`);
  }
}