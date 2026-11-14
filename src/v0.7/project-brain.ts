/**
 * ToolNet v0.7 Project Brain.
 *
 * A derived, revision-aware view over cloud authority records. It is never a
 * second authority: it does not accept edits, does not invent rules, and marks
 * inferred knowledge as unverified. Its only job is to decide what a resuming
 * agent must be told.
 */

import type { AuthorityFlow, AuthorityRule, AuthoritySnapshot } from './authority-state.js';
import type { ResumeProjectIdentity } from '../work-continuity/resume-packet-v07.js';

export interface ProjectBrainInput {
  snapshot: AuthoritySnapshot;
  /** Current working-tree revision, when the caller can determine it. */
  currentCodeRevision?: string;
}

export interface ProjectBrainStaleness {
  /** The brain's source revision matches the checkpoint revision. */
  checkpointMatchesHead: boolean;
  /** The checkpoint code revision matches the inspected working tree. */
  codeRevisionVerified: boolean;
  reasons: string[];
}

export interface ProjectBrain {
  projectId: string;
  projectName: string;
  branch?: string;
  revision: number;
  checkpointRevision?: number;
  checkpointCodeRevision?: string;
  currentCodeRevision?: string;
  rules: AuthorityRule[];
  flows: AuthorityFlow[];
  decisions: string[];
  mandatoryRules: AuthorityRule[];
  criticalFlows: AuthorityFlow[];
  staleness: ProjectBrainStaleness;
  warnings: string[];
}

function sortedById<T extends { id: string }>(items: T[]): T[] {
  return [...items].sort((left, right) =>
    left.id.localeCompare(right.id, undefined, { numeric: true, sensitivity: 'base' })
  );
}

export function buildProjectBrain(input: ProjectBrainInput): ProjectBrain {
  const { snapshot } = input;
  const reasons: string[] = [];
  const warnings: string[] = [];

  const checkpointRevision = snapshot.checkpoint?.revision;
  const checkpointCodeRevision = snapshot.checkpoint?.codeRevision ?? snapshot.codeRevision;

  const checkpointMatchesHead =
    checkpointRevision === undefined ? false : checkpointRevision === snapshot.revision;

  if (!snapshot.checkpoint) {
    reasons.push('NO_ACKNOWLEDGED_CHECKPOINT');
  } else if (!checkpointMatchesHead) {
    reasons.push('CHECKPOINT_REVISION_BEHIND_AUTHORITY');
    warnings.push(
      `Checkpoint revision ${String(checkpointRevision)} does not match authority revision ${snapshot.revision}`
    );
  }

  const codeRevisionVerified =
    checkpointCodeRevision !== undefined &&
    input.currentCodeRevision !== undefined &&
    checkpointCodeRevision === input.currentCodeRevision;

  if (checkpointCodeRevision === undefined) {
    reasons.push('CODE_REVISION_UNKNOWN');
    warnings.push('Code revision was not recorded at checkpoint time; inspect the working tree');
  } else if (input.currentCodeRevision === undefined) {
    reasons.push('CURRENT_CODE_REVISION_UNKNOWN');
    warnings.push('Current code revision is unknown; inspect the working tree before editing');
  } else if (!codeRevisionVerified) {
    reasons.push('CODE_REVISION_MISMATCH');
    warnings.push(
      `Code moved from ${checkpointCodeRevision} to ${input.currentCodeRevision}; inspect uncommitted work`
    );
  }

  for (const rule of snapshot.rules) {
    if (rule.mandatory && !rule.verified) {
      warnings.push(`RULE_NOT_VERIFIED:${rule.id}`);
    }
  }

  const rules = sortedById(snapshot.rules);
  const flows = sortedById(snapshot.flows);

  return {
    projectId: snapshot.projectId,
    projectName: snapshot.projectName,
    ...(snapshot.branch === undefined ? {} : { branch: snapshot.branch }),
    revision: snapshot.revision,
    ...(checkpointRevision === undefined ? {} : { checkpointRevision }),
    ...(checkpointCodeRevision === undefined ? {} : { checkpointCodeRevision }),
    ...(input.currentCodeRevision === undefined
      ? {}
      : { currentCodeRevision: input.currentCodeRevision }),
    rules,
    flows,
    decisions: [...snapshot.decisions],
    mandatoryRules: rules.filter((rule) => rule.mandatory),
    criticalFlows: flows.filter((flow) => flow.critical),
    staleness: { checkpointMatchesHead, codeRevisionVerified, reasons },
    warnings,
  };
}

export function brainToResumeIdentity(brain: ProjectBrain): ResumeProjectIdentity {
  return {
    id: brain.projectId,
    name: brain.projectName,
    ...(brain.branch === undefined ? {} : { branch: brain.branch }),
    ...(brain.currentCodeRevision === undefined
      ? {}
      : { currentCodeRevision: brain.currentCodeRevision }),
    flows: brain.flows.map((flow) => ({
      id: flow.id,
      description: flow.description,
      critical: flow.critical,
    })),
    rules: brain.rules.map((rule) => ({
      id: rule.id,
      text: rule.text,
      mandatory: rule.mandatory,
      verified: rule.verified,
    })),
  };
}
