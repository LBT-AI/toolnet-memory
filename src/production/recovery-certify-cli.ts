import { certifyRecoveryResilience } from './recovery-certify.js';

async function main(): Promise<void> {
  const result = await certifyRecoveryResilience();

  console.log('');
  console.log('◇ ToolNet Recovery & Resilience Certification');
  console.log('│');

  for (const check of result.checks) {
    console.log(`│ ${check.passed ? '✓' : '✗'} ${check.label}`);

    if (!check.passed && check.detail) {
      console.log(`│   ↳ ${check.detail}`);
    }
  }

  console.log('│');

  if (result.passed) {
    console.log(`◆ PASS ${result.passedCount}/${result.total} recovery checks`);

    return;
  }

  console.log(`◆ FAIL ${result.passedCount}/${result.total} recovery checks`);

  process.exitCode = 1;
}

await main();
