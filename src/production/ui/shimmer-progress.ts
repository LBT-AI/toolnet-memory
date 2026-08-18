import { Worker } from 'worker_threads';
import * as path from 'path';
import { fileURLToPath } from 'node:url';
import { ansiColorsEnabled } from './color.js';
import { getGlyphs } from './glyphs.js';

/**
 * ToolNet Memory indexing stages.
 * These must match the stages used in index-live-ui.ts
 */
const STAGE_NAMES: Record<string, string> = {
  'scan': 'Scanning files',
  'parse': 'Parsing code',
  'type-resolution': 'Type Resolution',
  'rich-graph': 'Rich Graph',
  'semantic-index': 'Semantic Code Index',
  'architecture': 'Architecture Intelligence',
  'graph-analysis': 'Graph Analysis',
  'visualization': '3D Visualization Dataset',
};

export interface IndexProgress {
  stage: string;
  current: number;
  total: number;
}

export interface ShimmerProgress {
  onProgress: (progress: IndexProgress) => void;
  stop: () => Promise<void>;
}

export function createShimmerProgress(): ShimmerProgress {
  // Piped/redirected stdout: `\r`-rewriting animation frames are garbage in a
  // log file — emit one plain line per stage instead.
  if (process.stdout.isTTY !== true) {
    return createPlainProgress();
  }

  const useColor = ansiColorsEnabled();
  const G = getGlyphs();
  const DM = useColor ? '\x1b[2m' : '';
  const GRN = useColor ? '\x1b[32m' : '';
  const RST = useColor ? '\x1b[0m' : '';

  let lastStage = '';
  let lastStageName = '';
  let lastPercent = -1;
  let lastCount = 0;

  // The persistent "stage done" lines — the ones that stay in scrollback —
  // are printed HERE, on the main thread, not by the worker. process.stdout
  // reaches a Windows console through the wide-char API, so these lines can
  // carry Unicode glyphs; the worker's raw fs.writeSync path can't (codepage
  // mojibake) and is now used only for the transient, self-erasing animation
  // frames. The main thread is guaranteed alive here: stage changes arrive
  // via its own progress callback.
  const printStageDone = (): void => {
    if (!lastStageName) return;
    let detail = '';
    if (lastPercent >= 0) detail = ` ${G.dash} done`;
    else if (lastCount > 0) detail = ` ${G.dash} ${lastCount.toLocaleString()} found`;
    // Leading \r + erase clears the worker's in-flight animation line; one
    // atomic write so a worker frame can't interleave mid-line.
    process.stdout.write(
      `\r\x1b[K${DM}${G.branch}${RST}  ${GRN}${G.phaseDone}${RST} ${lastStageName}${detail}\n`
    );
    lastStageName = '';
    lastPercent = -1;
    lastCount = 0;
  };

  // Resolve worker path: production uses .js, test/dev uses .ts
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const isBundle = currentDir.includes('/bundle/') || currentDir.includes('\\bundle\\');
  const workerPath = path.join(currentDir, isBundle ? 'shimmer-worker.js' : 'shimmer-worker.ts');

  const worker = new Worker(workerPath, {
    // colors:false keeps the animation (still an interactive TTY) but drops
    // the ANSI color codes, honoring NO_COLOR / --no-color.
    workerData: { startTime: Date.now(), colors: useColor },
  });

  return {
    onProgress(progress: IndexProgress) {
      const stageName = STAGE_NAMES[progress.stage] || progress.stage;

      if (progress.stage !== lastStage && lastStage) {
        printStageDone();
      }
      lastStage = progress.stage;
      lastStageName = stageName;

      let percent = -1;
      let count = 0;
      
      // Only show % if we have real measurable progress (total > 0)
      // This ensures we never fake progress based on time
      if (progress.total > 0 && progress.current >= 0) {
        // Clamp to 0-100 range, never show 100% until current === total
        const rawPercent = (progress.current / progress.total) * 100;
        percent = progress.current >= progress.total ? 100 : Math.min(99, Math.round(rawPercent));
      } else if (progress.current > 0) {
        // For scan phase: show count without %
        count = progress.current;
      }
      // If both percent === -1 and count === 0, worker shows shimmer-only animation
      
      lastPercent = percent;
      lastCount = count;

      worker.postMessage({
        type: 'update',
        phase: progress.stage,
        phaseName: stageName,
        percent,
        count,
      });
    },

    stop() {
      return new Promise<void>((resolve) => {
        let settled = false;
        const finish = (): void => {
          if (settled) return;
          settled = true;
          // Worker has cleared (or been terminated off) the animation line;
          // persist the final stage's done-line from the main thread.
          printStageDone();
          resolve();
        };

        const timeout = setTimeout(() => {
          worker.terminate().then(finish);
        }, 2000);

        worker.on('message', (msg: { type: string }) => {
          if (msg.type === 'stopped') {
            clearTimeout(timeout);
            worker.terminate().then(finish);
          }
        });

        worker.postMessage({ type: 'stop' });
      });
    },
  };
}

/**
 * Non-TTY fallback: one plain line per stage, no rewrites, no ANSI.
 * Completion details (counts, timings) are printed by the caller's result
 * summary, so stage starts are all that's worth logging here.
 */
function createPlainProgress(): ShimmerProgress {
  let lastStage = '';

  return {
    onProgress(progress: IndexProgress) {
      if (progress.stage === lastStage) return;
      lastStage = progress.stage;
      const stageName = STAGE_NAMES[progress.stage] || progress.stage;
      process.stdout.write(`${stageName}...\n`);
    },

    stop() {
      return Promise.resolve();
    },
  };
}
