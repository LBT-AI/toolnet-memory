import { createConnection } from 'node:net';
import { toolNetServiceSocketPath } from './socket-path.js';
const TIMEOUT_MS = Math.max(250, Number(process.env.TOOLNET_DOCKER_HEALTH_TIMEOUT_MS ?? 2_000));
async function checkService(): Promise<boolean> {
  const socketPath = toolNetServiceSocketPath();
  return new Promise((resolveCheck) => {
    const socket = createConnection({
      path: socketPath,
    });
    let settled = false;
    let buffer = '';
    const finish = (healthy: boolean) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      resolveCheck(healthy);
    };
    const timer = setTimeout(() => {
      finish(false);
    }, TIMEOUT_MS);
    socket.setEncoding('utf8');
    socket.once('connect', () => {
      socket.write(
        JSON.stringify({
          type: 'ping',
        }) + '\n'
      );
    });
    socket.on('data', (chunk) => {
      buffer += chunk;
      const newline = buffer.indexOf('\n');
      if (newline < 0) {
        return;
      }
      const line = buffer.slice(0, newline).trim();
      if (!line) {
        finish(false);
        return;
      }
      try {
        const response = JSON.parse(line) as {
          ok?: boolean;
          type?: string;
        };
        finish(response.ok === true && response.type === 'ping');
      } catch {
        finish(false);
      }
    });
    socket.once('error', () => {
      finish(false);
    });
    socket.once('end', () => {
      if (!settled) {
        finish(false);
      }
    });
  });
}
const healthy = await checkService();
if (healthy) {
  console.log('TOOLNET_DOCKER_HEALTH=PASS');
} else {
  console.error('TOOLNET_DOCKER_HEALTH=FAIL');
  process.exitCode = 1;
}
