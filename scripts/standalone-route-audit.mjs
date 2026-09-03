import { readFileSync } from 'node:fs';

const bash = readFileSync('bin/toolnet-memory', 'utf8');
const standalone = readFileSync('src/standalone/cli.ts', 'utf8');

const bashCommands = new Set();
const shellCase = /^\s{2}([A-Za-z0-9:_-]+(?:\|[A-Za-z0-9:_-]+)*)\)\s*$/gmu;
for (const match of bash.matchAll(shellCase)) {
  for (const value of match[1].split('|')) {
    bashCommands.add(value);
  }
}

const standaloneCommands = new Set(
  [...standalone.matchAll(/case '([^']+)':/gu)].map((match) => match[1])
);

const missing = [...bashCommands].filter((command) => !standaloneCommands.has(command)).sort();
const extras = [...standaloneCommands].filter((command) => !bashCommands.has(command)).sort();

console.log(`BASH_COMMANDS=${bashCommands.size}`);
console.log(`STANDALONE_COMMANDS=${standaloneCommands.size}`);
if (missing.length > 0) {
  console.log(`MISSING=${missing.join(',')}`);
}
if (extras.length > 0) {
  console.log(`STANDALONE_ONLY=${extras.join(',')}`);
}

if (missing.length === 0) {
  console.log('STANDALONE_ROUTE_PARITY=PASS');
  process.exitCode = 0;
} else {
  console.log('STANDALONE_ROUTE_PARITY=FAIL');
  process.exitCode = 1;
}
