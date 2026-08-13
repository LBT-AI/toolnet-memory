import { handleClaudeHookInput } from './runtime.js';

async function readInput(): Promise<Record<string, unknown>> {
  let raw = '';

  for await (const chunk of process.stdin) {
    raw += chunk.toString();
  }

  if (!raw.trim()) {
    return {};
  }

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function main(): Promise<void> {
  const input = await readInput();

  const output = handleClaudeHookInput(input);

  process.stdout.write(JSON.stringify(output));
}

main().catch(() => {
  process.stdout.write('{}');

  process.exitCode = 0;
});
