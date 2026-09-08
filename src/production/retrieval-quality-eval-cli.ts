import { writeFileSync } from 'node:fs';

import {
  evaluateRetrievalPlanner,
  evaluateRetrievalQualityGate,
  PHASE61_DEFAULT_THRESHOLDS,
  PHASE61_STRICT_THRESHOLDS,
  renderRetrievalQualityReport,
} from '../work-continuity/retrieval-quality.js';
import {
  RETRIEVAL_QUALITY_PHASE62_BENCHMARK,
  RETRIEVAL_QUALITY_PHASE62_BENCHMARK_VERSION,
} from '../work-continuity/retrieval-quality-adversarial.js';

interface EvalCliInput {
  strict: boolean;
  json: boolean;
  outputPath?: string;
}

function parseArgs(): EvalCliInput {
  const args = process.argv.slice(2);
  let strict = false;
  let json = false;
  let outputPath: string | undefined;
  for (const arg of args) {
    if (arg === '--strict') {
      strict = true;
      continue;
    }
    if (arg === '--json') {
      json = true;
      continue;
    }
    if (!outputPath && !arg.startsWith('-')) {
      outputPath = arg;
      continue;
    }
  }
  return {
    strict,
    json,
    outputPath,
  };
}

function main(): void {
  const input = parseArgs();
  const report = evaluateRetrievalPlanner(RETRIEVAL_QUALITY_PHASE62_BENCHMARK, undefined, {
    benchmarkVersion: RETRIEVAL_QUALITY_PHASE62_BENCHMARK_VERSION,
  });
  const gate = evaluateRetrievalQualityGate(
    report,
    input.strict ? PHASE61_STRICT_THRESHOLDS : PHASE61_DEFAULT_THRESHOLDS
  );
  if (input.json) {
    const payload = JSON.stringify(
      {
        benchmarkVersion: report.benchmarkVersion,
        report,
        gate,
        strict: input.strict,
      },
      null,
      2
    );
    if (input.outputPath) {
      writeFileSync(input.outputPath, `${payload}\n`);
    } else {
      process.stdout.write(`${payload}\n`);
    }
  } else {
    process.stdout.write(`${renderRetrievalQualityReport(report)}\n`);
    process.stdout.write(
      gate.passed
        ? `\nRETRIEVAL_QUALITY_GATE=${input.strict ? 'STRICT' : 'DEFAULT'}=PASS\n`
        : `\nRETRIEVAL_QUALITY_GATE=FAIL\n${gate.failures.map((failure) => `- ${failure}`).join('\n')}\n`
    );
  }
  if (!gate.passed) {
    process.exitCode = 1;
  }
}

main();
