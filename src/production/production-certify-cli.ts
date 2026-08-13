import { certifyProductionReadiness } from './production-certify.js';

async function main(): Promise<void> {
  const result = await certifyProductionReadiness();

  console.log('');
  console.log('◇ ToolNet Production Readiness Certification');
  console.log('│');

  for (const check of result.checks) {
    console.log(`│ ${check.passed ? '✓' : '✗'} ${check.label}`);

    if (!check.passed && check.detail) {
      for (const line of check.detail.split('\n')) {
        console.log(`│   ↳ ${line}`);
      }
    }
  }

  console.log('│');

  if (result.passed) {
    console.log(`◆ PASS ${result.passedCount}/${result.total} production checks`);

    return;
  }

  console.log(`◆ FAIL ${result.passedCount}/${result.total} production checks`);

  process.exitCode = 1;
}

await main();
