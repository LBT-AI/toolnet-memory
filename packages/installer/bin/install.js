#!/usr/bin/env node

const https = require('https');
const { spawn } = require('child_process');

const URL = 'https://memory.toolnet.tech/install';

const interactive = process.stdout.isTTY === true && process.env.TERM !== 'dumb';

const color = interactive && process.env.NO_COLOR === undefined;

const ansi = {
  clear: '\r\x1b[2K',
  reset: color ? '\x1b[0m' : '',
  amber: color ? '\x1b[38;5;214m' : '',
  green: color ? '\x1b[38;5;82m' : '',
  red: color ? '\x1b[38;5;196m' : '',
  dim: color ? '\x1b[2m' : '',
};

let frame = 0;
let timer;

function activityBar(width = 14) {
  const pulse = 4;
  const travel = Math.max(1, width - pulse + 1);
  const pos = frame % travel;

  return Array.from({ length: width }, (_, index) =>
    index >= pos && index < pos + pulse ? '━' : '─'
  ).join('');
}

function startDownloadUi() {
  if (!interactive) {
    console.log('→ Downloading ToolNet installer');
    return;
  }

  console.log('');
  console.log('◇ ToolNet Memory Installer');
  console.log('');
  process.stdout.write('│');

  timer = setInterval(() => {
    frame += 1;

    process.stdout.write(
      `${ansi.clear}├ ${ansi.amber}◇${ansi.reset} Downloading installer  ` +
        `${ansi.amber}${activityBar()}${ansi.reset}`
    );
  }, 180);

  timer.unref?.();
}

function finishDownloadUi() {
  if (timer) {
    clearInterval(timer);
    timer = undefined;
  }

  if (interactive) {
    process.stdout.write(
      `${ansi.clear}├ ${ansi.green}◆${ansi.reset} Installer downloaded — done\n`
    );
    console.log('│');
  } else {
    console.log('✓ Installer downloaded');
  }
}

function fail(message) {
  if (timer) {
    clearInterval(timer);
    timer = undefined;
  }

  if (interactive) {
    process.stdout.write(ansi.clear);
  }

  console.error(`${ansi.red}└ ✗ ${message}${ansi.reset}\n`);
  process.exit(1);
}

startDownloadUi();

https
  .get(
    URL,
    {
      headers: {
        'User-Agent': 'toolnet-memory-install',
      },
    },
    (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fail(`Unexpected redirect: ${res.headers.location}`);
      }

      if (res.statusCode !== 200) {
        fail(`Installer server returned HTTP ${res.statusCode}`);
      }

      let script = '';

      res.setEncoding('utf8');

      res.on('data', (chunk) => {
        script += chunk;
      });

      res.on('end', () => {
        if (!script.startsWith('#!/usr/bin/env bash')) {
          fail('Invalid installer response');
        }

        finishDownloadUi();

        const bash = spawn('bash', [], {
          stdio: ['pipe', 'inherit', 'inherit'],
        });

        bash.on('error', () => {
          fail('Bash is required');
        });

        bash.on('close', (code) => {
          process.exit(code ?? 1);
        });

        bash.stdin.end(script);
      });
    }
  )
  .on('error', (err) => {
    fail(`Unable to download installer: ${err.message}`);
  });
