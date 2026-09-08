import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  evaluateRetrievalPlanner,
  evaluateRetrievalQualityGate,
  PHASE62_PRODUCTION_THRESHOLDS,
  type RetrievalQualityGate,
  type RetrievalQualityReport,
} from '../work-continuity/retrieval-quality.js';
import {
  RETRIEVAL_QUALITY_PHASE62_BENCHMARK,
  RETRIEVAL_QUALITY_PHASE62_BENCHMARK_VERSION,
} from '../work-continuity/retrieval-quality-adversarial.js';

interface CommandResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

export interface PackagedRetrievalSmoke {
  passed: boolean;
  sourceAbsent: boolean;
  initStatus: number | null;
  singleStatus: number | null;
  compositeStatus: number | null;
  singleMode?: string;
  compositeMode?: string;
  singleSources: string[];
  compositeSources: string[];
  debugPlannerVisible: boolean;
  telemetryPassed: boolean;
  telemetryEvents: number;
  telemetryPrivacySafe: boolean;
  telemetryDetail?: string;
  detail?: string;
}

export interface RetrievalProductionCertification {
  benchmark: RetrievalQualityReport;
  gate: RetrievalQualityGate;
  live: PackagedRetrievalSmoke;
  passed: boolean;
}

function run(command: string, args: string[], cwd: string, env: NodeJS.ProcessEnv): CommandResult {
  const result = spawnSync(command, args, {
    cwd,
    env,
    encoding: 'utf8',
    timeout: 30_000,
    maxBuffer: 10 * 1024 * 1024,
  });
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function parseJson(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function planSources(value: Record<string, unknown> | null): string[] {
  if (!value) {
    return [];
  }
  const plan = value.plan;
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) {
    return [];
  }
  const sources = (plan as Record<string, unknown>).sources;
  if (!Array.isArray(sources)) {
    return [];
  }
  return sources.filter((item): item is string => typeof item === 'string');
}

function mode(value: Record<string, unknown> | null): string | undefined {
  if (typeof value?.mode === 'string') {
    return value.mode;
  }
  return undefined;
}

function sameValues(actual: string[], expected: string[]): boolean {
  if (actual.length !== expected.length) {
    return false;
  }
  return actual.every((item, index) => item === expected[index]);
}

export function certifyPhase62Benchmark(): {
  report: RetrievalQualityReport;
  gate: RetrievalQualityGate;
} {
  const report = evaluateRetrievalPlanner(RETRIEVAL_QUALITY_PHASE62_BENCHMARK, undefined, {
    benchmarkVersion: RETRIEVAL_QUALITY_PHASE62_BENCHMARK_VERSION,
  });
  const gate = evaluateRetrievalQualityGate(report, PHASE62_PRODUCTION_THRESHOLDS);
  return { report, gate };
}

/**
 * Run the ACTUAL packaged CLI against the production bundle.
 *
 * src/ is deliberately absent from runtimeRoot.
 *
 * Questions intentionally use Task + Artifact routes only so the
 * smoke test does not require remote Memory/storage credentials.
 */
export function runPackagedRetrievalSmoke(packageRoot: string): PackagedRetrievalSmoke {
  const base = mkdtempSync(join(tmpdir(), 'toolnet-phase62-retrieval-'));
  const runtimeRoot = join(base, 'package');
  const projectRoot = join(base, 'project');
  try {
    mkdirSync(join(runtimeRoot, 'bin'), { recursive: true });
    mkdirSync(projectRoot, { recursive: true });

    cpSync(join(packageRoot, 'bin', 'toolnet-memory'), join(runtimeRoot, 'bin', 'toolnet-memory'));
    chmodSync(join(runtimeRoot, 'bin', 'toolnet-memory'), 0o755);

    cpSync(join(packageRoot, 'bundle'), join(runtimeRoot, 'bundle'), { recursive: true });
    cpSync(join(packageRoot, 'package.json'), join(runtimeRoot, 'package.json'));

    const nodeModules = join(packageRoot, 'node_modules');
    if (!existsSync(nodeModules)) {
      return {
        passed: false,
        sourceAbsent: true,
        initStatus: null,
        singleStatus: null,
        compositeStatus: null,
        singleSources: [],
        compositeSources: [],
        debugPlannerVisible: false,
        telemetryPassed: false,
        telemetryEvents: 0,
        telemetryPrivacySafe: false,
        telemetryDetail: 'node_modules missing; telemetry smoke was not executed.',
        detail: 'node_modules missing; run npm ci before production certification.',
      };
    }
    symlinkSync(nodeModules, join(runtimeRoot, 'node_modules'), 'dir');

    const binary = join(runtimeRoot, 'bin', 'toolnet-memory');
    const env = {
      ...process.env,
      TOOLNET_MEMORY_BIN: binary,
      TOOLNET_PACKAGE_ROOT: runtimeRoot,
      /*
       * Smoke test must prove local routing does not need
       * remote storage.
       */
      TOOLNET_AGENT_ID: 'phase62-production-smoke',
      /*
       * Phase 63 packaged telemetry smoke.
       */
      TOOLNET_RETRIEVAL_TELEMETRY: '1',
    };

    const init = run(
      binary,
      ['init', '--project', projectRoot, '--json', '--no-integrate'],
      projectRoot,
      env
    );
    const single = run(
      binary,
      ['ask', '--debug-route', '--json', 'task hiện tại là gì?'],
      projectRoot,
      env
    );
    const composite = run(
      binary,
      ['ask', '--debug-route', '--json', 'task hiện tại là gì và deploy production verified chưa?'],
      projectRoot,
      env
    );

    const singleJson = parseJson(single.stdout);
    const compositeJson = parseJson(composite.stdout);
    const singleSources = planSources(singleJson);
    const compositeSources = planSources(compositeJson);
    const debugPlannerVisible =
      single.stderr.includes('[ToolNet Retrieval Planner]') &&
      composite.stderr.includes('[ToolNet Retrieval Planner]') &&
      composite.stderr.includes('source_budget=2/3');
    const sourceAbsent = !existsSync(join(runtimeRoot, 'src'));
    const telemetryFile = join(projectRoot, '.toolnet', 'retrieval', 'telemetry.jsonl');
    let telemetryRaw = '';
    let telemetryEvents: Array<Record<string, unknown>> = [];
    try {
      telemetryRaw = readFileSync(telemetryFile, 'utf8');
      telemetryEvents = telemetryRaw
        .split(/\r?\n/u)
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line) as Record<string, unknown>);
    } catch {
      telemetryRaw = '';
      telemetryEvents = [];
    }
    const telemetryPrivacySafe =
      !telemetryRaw.includes('task hiện tại là gì?') &&
      !telemetryRaw.includes('task hiện tại là gì và deploy production verified chưa?') &&
      !/"question"\s*:/u.test(telemetryRaw) &&
      !/"answer"\s*:/u.test(telemetryRaw) &&
      !/"filePath"\s*:/u.test(telemetryRaw) &&
      !/"taskId"\s*:/u.test(telemetryRaw) &&
      !/"sourceRef"\s*:/u.test(telemetryRaw);
    const telemetryModes = telemetryEvents
      .map((event) => event.mode)
      .filter((value): value is string => typeof value === 'string');
    const telemetrySurfaces = telemetryEvents.map((event) => event.surface);
    const telemetryPassed =
      telemetryEvents.length >= 2 &&
      telemetryPrivacySafe &&
      telemetryModes.includes('single') &&
      telemetryModes.includes('composite') &&
      telemetrySurfaces.every((surface) => surface === 'cli');
    const telemetryDetail = telemetryPassed
      ? undefined
      : [
          `file=${telemetryFile}`,
          `events=${telemetryEvents.length}`,
          `modes=${telemetryModes.join(',')}`,
          `privacySafe=${String(telemetryPrivacySafe)}`,
        ].join('\n');

    const passed =
      init.status === 0 &&
      single.status === 0 &&
      composite.status === 0 &&
      sourceAbsent &&
      mode(singleJson) === 'single' &&
      mode(compositeJson) === 'composite' &&
      sameValues(singleSources, ['persistent-tasks']) &&
      sameValues(compositeSources, ['persistent-tasks', 'task-artifacts']) &&
      debugPlannerVisible;

    return {
      passed,
      sourceAbsent,
      initStatus: init.status,
      singleStatus: single.status,
      compositeStatus: composite.status,
      singleMode: mode(singleJson),
      compositeMode: mode(compositeJson),
      singleSources,
      compositeSources,
      debugPlannerVisible,
      telemetryPassed,
      telemetryEvents: telemetryEvents.length,
      telemetryPrivacySafe,
      ...(telemetryDetail ? { telemetryDetail } : {}),
      ...(passed
        ? {}
        : {
            detail: [
              `init=${String(init.status)}`,
              `single=${String(single.status)}`,
              `composite=${String(composite.status)}`,
              `singleSources=${singleSources.join(',')}`,
              `compositeSources=${compositeSources.join(',')}`,
              `sourceAbsent=${String(sourceAbsent)}`,
              `debug=${String(debugPlannerVisible)}`,
              '',
              'single stderr:',
              single.stderr.slice(-1200),
              '',
              'composite stderr:',
              composite.stderr.slice(-1200),
            ].join('\n'),
          }),
    };
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
}

export function certifyRetrievalProduction(packageRoot: string): RetrievalProductionCertification {
  const benchmark = certifyPhase62Benchmark();
  const live = runPackagedRetrievalSmoke(packageRoot);
  return {
    benchmark: benchmark.report,
    gate: benchmark.gate,
    live,
    passed: benchmark.gate.passed && live.passed && live.telemetryPassed,
  };
}
