import { createConnection } from 'node:net';

import type {
  ToolNetServiceProject,
  ToolNetServiceRequest,
  ToolNetServiceResponse,
} from './protocol.js';

import { toolNetServiceSocketPath } from './socket-path.js';

export interface ToolNetServiceClientOptions {
  socketPath?: string;
  timeoutMs?: number;
}

function request(
  input: ToolNetServiceRequest,
  options: ToolNetServiceClientOptions = {}
): Promise<ToolNetServiceResponse> {
  const socketPath = options.socketPath ?? toolNetServiceSocketPath();

  const timeoutMs = options.timeoutMs ?? 1_000;

  return new Promise((resolve, reject) => {
    const socket = createConnection({
      path: socketPath,
    });

    let buffer = '';
    let settled = false;

    const finish = (callback: () => void): void => {
      if (settled) {
        return;
      }

      settled = true;

      clearTimeout(timer);

      socket.destroy();

      callback();
    };

    const timer = setTimeout(() => {
      finish(() => {
        reject(new Error(`ToolNet service timeout after ${timeoutMs}ms`));
      });
    }, timeoutMs);

    socket.setEncoding('utf8');

    socket.once('connect', () => {
      socket.write(`${JSON.stringify(input)}\n`);
    });

    socket.on('data', (chunk) => {
      buffer += chunk;

      const newline = buffer.indexOf('\n');

      if (newline === -1) {
        return;
      }

      const line = buffer.slice(0, newline).trim();

      finish(() => {
        try {
          resolve(JSON.parse(line) as ToolNetServiceResponse);
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      });
    });

    socket.once('error', (error) => {
      finish(() => {
        reject(error);
      });
    });

    socket.once('end', () => {
      if (!settled) {
        finish(() => {
          reject(new Error('ToolNet service closed without response'));
        });
      }
    });
  });
}

export async function pingToolNetService(options: ToolNetServiceClientOptions = {}) {
  const response = await request(
    {
      type: 'ping',
    },
    options
  );

  if (!response.ok || response.type !== 'ping') {
    throw new Error(response.ok ? 'Invalid ToolNet service ping response' : response.error);
  }

  return response;
}

export async function hydrateFromService(
  project: ToolNetServiceProject,
  options: ToolNetServiceClientOptions = {}
) {
  const response = await request(
    {
      type: 'hydrate',
      project,
    },
    options
  );

  if (!response.ok || response.type !== 'hydrate') {
    throw new Error(response.ok ? 'Invalid ToolNet service hydrate response' : response.error);
  }

  return response;
}

export async function tryHydrateFromService(
  project: ToolNetServiceProject,
  options: ToolNetServiceClientOptions = {}
) {
  try {
    return await hydrateFromService(project, options);
  } catch {
    return null;
  }
}

export async function invalidateServiceProject(
  project: ToolNetServiceProject,
  options: ToolNetServiceClientOptions = {}
): Promise<boolean> {
  try {
    const response = await request(
      {
        type: 'invalidate',
        project,
      },
      {
        timeoutMs: 250,
        ...options,
      }
    );

    return response.ok && response.type === 'invalidate';
  } catch {
    return false;
  }
}
