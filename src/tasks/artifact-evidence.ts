import { sanitizeDurableText } from '../security/durable-sanitizer.js';
import type {
  TaskArtifactEvidence,
  TaskArtifactState,
  TaskArtifactType,
  TaskEvidence,
} from './types.js';
const ARTIFACT_TYPES = new Set<TaskArtifactType>([
  'backup',
  'report',
  'build',
  'deploy',
  'verification',
  'seo-audit',
  'crawler-output',
  'screenshot',
  'release',
]);
const ARTIFACT_STATES = new Set<TaskArtifactState>(['planned', 'executed', 'verified', 'failed']);
function requiredText(value: string, code: string): string {
  const normalized = sanitizeDurableText(value).trim();
  if (!normalized) {
    throw new Error(code);
  }
  return normalized;
}
function optionalText(value: string | undefined, code: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return requiredText(value, code);
}
function optionalIso(value: string | undefined, code: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(code);
  }
  return new Date(parsed).toISOString();
}
function operationIso(value: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new Error('TASK_ARTIFACT_OPERATION_TIME_INVALID');
  }
  return new Date(parsed).toISOString();
}
function optionalExitCode(value: number | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Number.isSafeInteger(value) || value < 0 || value > 255) {
    throw new Error('TASK_ARTIFACT_EXIT_CODE_INVALID');
  }
  return value;
}
export function isTaskArtifactType(value: string): value is TaskArtifactType {
  return ARTIFACT_TYPES.has(value as TaskArtifactType);
}
export function isTaskArtifactState(value: string): value is TaskArtifactState {
  return ARTIFACT_STATES.has(value as TaskArtifactState);
}
/**
 * Sanitizes user/provider supplied structured artifact metadata.
 *
 * This function deliberately does NOT invent executedAt/verifiedAt.
 * Those timestamps become authoritative only when the immutable
 * Task operation is projected.
 */
export function sanitizeTaskArtifactInput(input: TaskArtifactEvidence): TaskArtifactEvidence {
  if (!ARTIFACT_TYPES.has(input.type)) {
    throw new Error('TASK_ARTIFACT_TYPE_INVALID');
  }
  if (!ARTIFACT_STATES.has(input.state)) {
    throw new Error('TASK_ARTIFACT_STATE_INVALID');
  }
  const key = optionalText(input.key, 'TASK_ARTIFACT_KEY_REQUIRED');
  const path = optionalText(input.path, 'TASK_ARTIFACT_PATH_REQUIRED');
  const command = optionalText(input.command, 'TASK_ARTIFACT_COMMAND_REQUIRED');
  const executedAt = optionalIso(input.executedAt, 'TASK_ARTIFACT_EXECUTED_AT_INVALID');
  const verifiedAt = optionalIso(input.verifiedAt, 'TASK_ARTIFACT_VERIFIED_AT_INVALID');
  const exitCode = optionalExitCode(input.exitCode);
  const digest = optionalText(input.digest, 'TASK_ARTIFACT_DIGEST_REQUIRED');
  /*
   * A planned artifact must not masquerade as something
   * which has already been executed.
   */
  if (
    input.state === 'planned' &&
    (executedAt !== undefined || verifiedAt !== undefined || exitCode !== undefined)
  ) {
    throw new Error('TASK_ARTIFACT_PLANNED_EXECUTION_METADATA');
  }
  /*
   * Verification is a distinct state.
   *
   * executed != verified
   * failed   != verified
   */
  if (input.state !== 'verified' && verifiedAt !== undefined) {
    throw new Error('TASK_ARTIFACT_VERIFIED_AT_REQUIRES_VERIFIED');
  }
  /*
   * A verified command result cannot simultaneously
   * carry a failing process exit code.
   */
  if (input.state === 'verified' && exitCode !== undefined && exitCode !== 0) {
    throw new Error('TASK_ARTIFACT_VERIFIED_EXIT_CODE_INVALID');
  }
  return {
    type: input.type,
    state: input.state,
    ...(key
      ? {
          key,
        }
      : {}),
    ...(path
      ? {
          path,
        }
      : {}),
    ...(command
      ? {
          command,
        }
      : {}),
    ...(executedAt
      ? {
          executedAt,
        }
      : {}),
    ...(verifiedAt
      ? {
          verifiedAt,
        }
      : {}),
    ...(exitCode !== undefined
      ? {
          exitCode,
        }
      : {}),
    ...(digest
      ? {
          digest,
        }
      : {}),
  };
}
/**
 * Canonical projection-time materialization.
 *
 * executed/failed automatically receive executedAt from the
 * immutable Task operation if the producer did not provide one.
 *
 * verified receives both executedAt and verifiedAt defaults.
 */
export function materializeTaskArtifact(
  input: TaskArtifactEvidence,
  occurredAt: string
): TaskArtifactEvidence {
  const artifact = sanitizeTaskArtifactInput(input);
  const eventAt = operationIso(occurredAt);
  if (artifact.state === 'planned') {
    return artifact;
  }
  if (artifact.state === 'verified') {
    return {
      ...artifact,
      executedAt: artifact.executedAt ?? eventAt,
      verifiedAt: artifact.verifiedAt ?? eventAt,
    };
  }
  return {
    ...artifact,
    executedAt: artifact.executedAt ?? eventAt,
  };
}
function compact(value: string, max = 240): string {
  const normalized = value.normalize('NFKC').replace(/\s+/gu, ' ').trim();
  if (normalized.length <= max) {
    return normalized;
  }
  return `${normalized.slice(0, max)}…`;
}
function artifactIdentity(evidence: TaskEvidence): string {
  const artifact = evidence.artifact;
  if (!artifact) {
    return ['legacy', evidence.ref ?? '', evidence.summary].join('|');
  }
  if (artifact.key) {
    return `key:${artifact.key}`;
  }
  /*
   * Try to correlate lifecycle updates even when caller
   * did not explicitly provide --artifact-key.
   */
  return [artifact.type, artifact.path ?? evidence.ref ?? evidence.summary].join('|');
}
function formatStructuredArtifact(evidence: TaskEvidence): string {
  const artifact = evidence.artifact!;
  const parts = [`[${artifact.state}] ${artifact.type}: ${compact(evidence.summary)}`];
  if (artifact.path) {
    parts.push(`path=${compact(artifact.path, 300)}`);
  }
  if (artifact.command) {
    parts.push(`command=${compact(artifact.command, 300)}`);
  }
  if (artifact.exitCode !== undefined) {
    parts.push(`exit=${artifact.exitCode}`);
  }
  if (artifact.executedAt) {
    parts.push(`executed=${artifact.executedAt}`);
  }
  if (artifact.verifiedAt) {
    parts.push(`verified=${artifact.verifiedAt}`);
  }
  if (artifact.digest) {
    parts.push(`digest=${compact(artifact.digest, 160)}`);
  }
  if (evidence.ref) {
    parts.push(`ref=${compact(evidence.ref, 220)}`);
  }
  return parts.join(' | ');
}
/**
 * Returns the newest logical artifact state.
 *
 * planned -> executed -> verified produces one current line,
 * not three noisy historical lines.
 *
 * Raw immutable Task evidence remains untouched.
 */
export function currentTaskArtifactLines(evidence: TaskEvidence[], limit = 8): string[] {
  const lines: string[] = [];
  const seen = new Set<string>();
  for (let index = evidence.length - 1; index >= 0; index -= 1) {
    const item = evidence[index];
    if (!item || item.kind !== 'artifact') {
      continue;
    }
    const identity = artifactIdentity(item);
    if (seen.has(identity)) {
      continue;
    }
    seen.add(identity);
    if (item.artifact) {
      lines.push(formatStructuredArtifact(item));
    } else {
      lines.push(
        `[legacy] artifact: ${compact(item.summary)}${
          item.ref ? ` | ref=${compact(item.ref, 220)}` : ''
        }`
      );
    }
    if (lines.length >= limit) {
      break;
    }
  }
  return lines;
}
