/**
 * ToolNet v0.7 continuity foundation.
 *
 * Pure, storage-agnostic compilation from an ACKNOWLEDGED authoritative
 * checkpoint into a compact cross-agent resume packet.
 *
 * No filesystem, networking, LLM, or implicit truncation of mandatory facts.
 * This module is deliberately not wired into existing hooks until the
 * cloud-only authority and compatibility gates are implemented.
 */
export type ResumePacketMode = 'tiny' | 'standard' | 'full';
export type ResumeActiveTaskStatus = 'in_progress' | 'blocked' | 'pending';
export type ResumeVerification = 'unverified' | 'partially_verified' | 'verified';

export interface ResumeProjectIdentity {
  id: string;
  name: string;
  branch?: string;
  currentCodeRevision?: string;
  flows: Array<{ id: string; description: string; critical: boolean }>;
  rules: Array<{ id: string; text: string; mandatory: boolean; verified: boolean }>;
}

export interface ResumeTaskBoard {
  completed: string[];
  pending: string[];
  blocked: string[];
}

export interface ResumeActiveTask {
  id: string;
  title: string;
  status: ResumeActiveTaskStatus;
  verification: ResumeVerification;
  done: string[];
  remaining: string[];
  filesTouched: string[];
  blockers: string[];
  nextAction?: string;
  evidenceRefs: string[];
}

export interface ResumeCheckpoint {
  /** Project-scoped, monotonically increasing authoritative revision. */
  revision: number;
  /** Must indicate an actual durable cloud ACK, not a local write. */
  cloudAcknowledged: boolean;
  sourceAgent: string;
  /** Revision of the code tree at checkpoint time, if known. */
  codeRevision?: string;
}

export interface ResumePacketSource {
  project: ResumeProjectIdentity;
  checkpoint: ResumeCheckpoint;
  taskBoard: ResumeTaskBoard;
  activeTask: ResumeActiveTask;
}

export interface ResumePacketOptions {
  mode?: ResumePacketMode;
  /** Soft target: mandatory facts are NEVER truncated to fit it. */
  budgetTokens?: number;
  /** Use the target agent's tokenizer in production. */
  countTokens?: (text: string) => number;
}

export interface ResumePacketResult {
  text: string;
  mode: ResumePacketMode;
  sourceRevision: number;
  estimatedTokens: number;
  budgetTokens: number;
  exceedsBudget: boolean;
  omittedOptionalSections: string[];
  warnings: string[];
}

const DEFAULT_BUDGET: Record<ResumePacketMode, number> = {
  tiny: 350,
  standard: 1200,
  full: 4000,
};

function clean(value: string): string {
  return value
    .replace(/[\u0000-\u001f\u007f]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

function requireValue(value: string, field: string): string {
  const normalized = clean(value);
  if (!normalized) {
    throw new Error(`RESUME_INVALID_${field}`);
  }
  return normalized;
}

function unique(values: string[]): string[] {
  const output: string[] = [];
  const seen = new Set<string>();

  for (const raw of values) {
    const value = clean(raw);
    if (!value) {
      continue;
    }
    const key = value.normalize('NFKC').toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(value);
  }

  return output;
}

function values(values: string[]): string {
  const normalized = unique(values);
  return normalized.length > 0 ? normalized.join('; ') : 'none';
}

function assertTaskBoard(source: ResumePacketSource): void {
  const { completed, pending, blocked } = source.taskBoard;
  const ownership = new Map<string, string>();
  for (const [status, tasks] of [
    ['completed', completed],
    ['pending', pending],
    ['blocked', blocked],
  ] as const) {
    for (const raw of tasks) {
      const id = requireValue(raw, 'TASK_ID');
      const key = id.toLocaleLowerCase();
      const other = ownership.get(key);
      if (other && other !== status) {
        throw new Error(`RESUME_CONFLICTING_TASK_STATUS:${id}`);
      }
      ownership.set(key, status);
    }
  }

  const active = requireValue(source.activeTask.id, 'ACTIVE_TASK_ID').toLocaleLowerCase();
  if (ownership.get(active) === 'completed') {
    throw new Error('RESUME_ACTIVE_TASK_ALREADY_COMPLETED');
  }
  if (ownership.get(active) === 'blocked' && source.activeTask.status !== 'blocked') {
    throw new Error('RESUME_CONFLICTING_ACTIVE_TASK_STATUS');
  }
  if (ownership.get(active) === 'pending' && source.activeTask.status !== 'pending') {
    throw new Error('RESUME_CONFLICTING_ACTIVE_TASK_STATUS');
  }
}

function defaultCountTokens(text: string): number {
  // A conservative byte-based estimate, NOT a model-exact tokenizer.
  // Production callers should inject the tokenizer for their target agent.
  return Math.ceil(Buffer.byteLength(text, 'utf8') / 2);
}

function checkedTokenCount(text: string, counter: (text: string) => number): number {
  const result = counter(text);
  if (!Number.isFinite(result) || !Number.isInteger(result) || result < 0) {
    throw new Error('RESUME_INVALID_TOKEN_COUNTER');
  }
  return result;
}

/**
 * Compile a resume packet without touching disk or remote services.
 * Unknown or unverified state is made explicit rather than invented.
 */
export function compileResumePacket(
  source: ResumePacketSource,
  options: ResumePacketOptions = {}
): ResumePacketResult {
  const mode = options.mode ?? 'tiny';
  if (!Object.hasOwn(DEFAULT_BUDGET, mode)) {
    throw new Error('RESUME_INVALID_MODE');
  }
  const budgetTokens = options.budgetTokens ?? DEFAULT_BUDGET[mode];
  if (!Number.isSafeInteger(budgetTokens) || budgetTokens < 1) {
    throw new Error('RESUME_INVALID_BUDGET');
  }
  if (!source.checkpoint.cloudAcknowledged) {
    throw new Error('RESUME_UNACKNOWLEDGED_CLOUD_CHECKPOINT');
  }
  if (!Number.isSafeInteger(source.checkpoint.revision) || source.checkpoint.revision < 0) {
    throw new Error('RESUME_INVALID_CHECKPOINT_REVISION');
  }

  assertTaskBoard(source);
  const project = source.project;
  const task = source.activeTask;
  const checkpoint = source.checkpoint;
  const counter = options.countTokens ?? defaultCountTokens;
  const warnings: string[] = [];

  const required: string[] = [
    '[ToolNet Resume v0.7 | cloud ACK]',
    `Project: ${requireValue(project.name, 'PROJECT_NAME')} [${requireValue(project.id, 'PROJECT_ID')}]`,
    `Checkpoint: revision ${checkpoint.revision}; source ${requireValue(checkpoint.sourceAgent, 'SOURCE_AGENT')}`,
    `Task board: completed=${values(source.taskBoard.completed)}; active=${requireValue(task.id, 'ACTIVE_TASK_ID')} (${task.status}); pending=${values(source.taskBoard.pending)}; blocked=${values(source.taskBoard.blocked)}`,
    `Active task: ${requireValue(task.title, 'ACTIVE_TASK_TITLE')}; verification=${task.verification}`,
    `Work done: ${values(task.done)}`,
    `Remaining: ${values(task.remaining)}`,
    `Next action: ${clean(task.nextAction ?? '') || 'UNKNOWN - verify task before editing'}`,
    `Blockers: ${values(task.blockers)}`,
    `Touched files: ${values(task.filesTouched)}`,
  ];

  if (project.branch) {
    required.push(`Branch: ${clean(project.branch)}`);
  }
  if (project.currentCodeRevision && checkpoint.codeRevision) {
    if (project.currentCodeRevision !== checkpoint.codeRevision) {
      warnings.push('CODE_REVISION_MISMATCH: verify working tree before editing');
      required.push(
        'WARNING: code revision differs from acknowledged checkpoint; inspect changes.'
      );
    }
  } else {
    warnings.push('CODE_REVISION_NOT_VERIFIED');
    required.push('Code revision: unverified; inspect working tree before editing.');
  }

  for (const rule of project.rules.filter((item) => item.mandatory)) {
    required.push(
      `${rule.verified ? 'RULE' : 'UNVERIFIED RULE'} [${requireValue(rule.id, 'RULE_ID')}]: ${requireValue(rule.text, 'RULE_TEXT')}`
    );
    if (!rule.verified) {
      warnings.push(`RULE_NOT_VERIFIED:${rule.id}`);
    }
  }
  for (const flow of project.flows.filter((item) => item.critical)) {
    required.push(
      `Critical flow [${requireValue(flow.id, 'FLOW_ID')}]: ${requireValue(flow.description, 'FLOW_DESCRIPTION')}`
    );
  }

  let text = required.join('\n');
  const omittedOptionalSections: string[] = [];
  const otherFlows = project.flows
    .filter((item) => !item.critical)
    .map(
      (item) =>
        `Other flow [${requireValue(item.id, 'FLOW_ID')}]: ${requireValue(item.description, 'FLOW_DESCRIPTION')}`
    )
    .join('\n');
  const otherRules = project.rules
    .filter((item) => !item.mandatory)
    .map(
      (item) =>
        `Advisory rule [${requireValue(item.id, 'RULE_ID')}]: ${requireValue(item.text, 'RULE_TEXT')}`
    )
    .join('\n');
  const optional: Array<[string, string]> = [
    ['evidence', `Evidence: ${values(task.evidenceRefs)}`],
    ['other-flows', otherFlows],
    ['other-rules', otherRules],
  ];

  if (mode === 'tiny') {
    optional.splice(1);
  }
  for (const [name, item] of optional) {
    if (!item || (name === 'evidence' && task.evidenceRefs.length === 0)) {
      continue;
    }
    const candidate = `${text}\n${item}`;
    if (checkedTokenCount(candidate, counter) > budgetTokens) {
      omittedOptionalSections.push(name);
      continue;
    }
    text = candidate;
  }

  const estimatedTokens = checkedTokenCount(text, counter);
  const exceedsBudget = estimatedTokens > budgetTokens;
  if (exceedsBudget) {
    warnings.push('MANDATORY_CONTEXT_EXCEEDS_SOFT_BUDGET');
  }

  return {
    text,
    mode,
    sourceRevision: checkpoint.revision,
    estimatedTokens,
    budgetTokens,
    exceedsBudget,
    omittedOptionalSections,
    warnings,
  };
}
