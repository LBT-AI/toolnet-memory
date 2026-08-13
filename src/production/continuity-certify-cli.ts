import {
  certifyCrossAgentContinuity,
  type ContinuityCertificationCase,
} from './continuity-certify.js';

const ANSI = {
  reset: '\x1b[0m',

  green: '\x1b[32m',

  red: '\x1b[31m',

  cyan: '\x1b[36m',

  gray: '\x1b[90m',

  white: '\x1b[97m',
};

function status(value: boolean): string {
  return value ? `${ANSI.green}✓${ANSI.reset}` : `${ANSI.red}✗${ANSI.reset}`;
}

function printCase(result: ContinuityCertificationCase): void {
  const title = `${result.from.padEnd(8)} → ${result.to.padEnd(8)}`;

  console.log(`│ ${status(result.passed)} ${title}`);

  if (result.passed) {
    return;
  }

  for (const [name, value] of Object.entries(result.checks)) {
    if (!value) {
      console.log(`│   ${ANSI.red}✗${ANSI.reset} ${name}`);
    }
  }
}

async function main(): Promise<void> {
  console.log('');
  console.log(
    `${ANSI.cyan}◇${ANSI.reset} ${ANSI.white}ToolNet Cross-Agent Continuity Certification${ANSI.reset}`
  );
  console.log(`${ANSI.gray}│${ANSI.reset}`);

  const result = await certifyCrossAgentContinuity();

  for (const item of result.cases) {
    printCase(item);
  }

  console.log(`${ANSI.gray}│${ANSI.reset}`);

  if (result.passed) {
    console.log(
      `${ANSI.green}◆ PASS${ANSI.reset} ${result.passedCount}/${result.total} cross-agent transitions`
    );

    console.log(`${ANSI.green}✓${ANSI.reset} canonical handoff`);

    console.log(`${ANSI.green}✓${ANSI.reset} memory_agent_ask`);

    console.log(`${ANSI.green}✓${ANSI.reset} task / file / TODO / next action`);

    console.log(`${ANSI.green}✓${ANSI.reset} raw transcripts isolated`);

    console.log(`${ANSI.green}✓${ANSI.reset} AI not required for direct continuity`);

    return;
  }

  console.log(
    `${ANSI.red}◆ FAIL${ANSI.reset} ${result.passedCount}/${result.total} cross-agent transitions`
  );

  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));

  process.exitCode = 1;
});
