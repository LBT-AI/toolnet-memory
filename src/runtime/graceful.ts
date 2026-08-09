import type { ToolNetMemoryRuntime } from './toolnet-memory-runtime.js';

export function registerGracefulShutdown(runtime: ToolNetMemoryRuntime): void {
  let stopping = false;

  const stop = async () => {
    if (stopping) {
      return;
    }

    stopping = true;

    try {
      await runtime.stop();
    } finally {
      process.exit(0);
    }
  };

  process.once('SIGINT', stop);

  process.once('SIGTERM', stop);
}
