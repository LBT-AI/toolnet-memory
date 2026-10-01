/**
 * ToolNet Wiki state inspection + repair (pure logic).
 *
 * Phase 86E: Wiki state is a global knowledge namespace shared across ToolNet
 * projects, so inspection and repair must be deterministic and non-destructive.
 *
 *   missing            -> a valid unused subsystem (never corruption)
 *   current            -> readable, owned by this project
 *   project_mismatch   -> owned by another project (never adopted, never rewritten)
 *   schema_unsupported -> written by a newer ToolNet (never downgraded)
 *   corrupt            -> unparseable or schema-invalid (never overwritten)
 *
 * Repair only applies a supported, deterministic migration. There is no
 * supported legacy schema below version 1 today, so repair is an identity for
 * current state and a refusal for anything else.
 */

import type { ProjectManifest } from '../core/types.js';
import {
  KnowledgeGovernanceStore,
  WikiStore,
  classifyWikiLedger,
  type KnowledgeGovernanceClassification,
  type WikiAutomationLedgerClassification,
  type WikiStateClassification,
} from '../wiki/index.js';
import type { WikiStorage } from '../wiki/store.js';

/** Read-only Wiki/governance/automation state vocabulary. */
export type WikiStateStatus =
  | 'unused'
  | 'current'
  | 'project_mismatch'
  | 'corrupt'
  | 'schema_unsupported'
  | 'revision_integrity_failed';

export interface WikiSubsystemInspection {
  status: WikiStateStatus | 'empty' | 'missing';
  projectId?: string;
  pages?: number;
  revisions?: number;
  entries?: number;
  reason?: string;
}

export interface WikiInspectionReport {
  schema: 'toolnet.wiki-state.v1';
  projectId: string;
  state: {
    wiki: WikiSubsystemInspection;
    governance: WikiSubsystemInspection;
    automation: WikiSubsystemInspection;
  };
  /** Overall truth: the worst state across the three knowledge files. */
  status: WikiStateStatus;
  /** True when a lifecycle action is required before the Wiki is usable. */
  repairRequired: boolean;
  /** True when a supported migration can be applied by `wiki:repair`. */
  migrationAvailable: boolean;
  supportedSchemas: number[];
  guidance: string[];
}

export interface WikiRepairReport {
  schema: 'toolnet.wiki-repair.v1';
  dryRun: boolean;
  statusBefore: WikiStateStatus;
  statusAfter: WikiStateStatus;
  actions: string[];
  changed: boolean;
  migrated: boolean;
  guidance: string[];
}

function wikiSubsystem(classification: WikiStateClassification): WikiSubsystemInspection {
  switch (classification.status) {
    case 'project_mismatch':
      return { status: 'project_mismatch', projectId: classification.projectId };
    case 'unsupported_schema':
      return { status: 'schema_unsupported', reason: `version-${String(classification.version)}` };
    case 'corrupt':
      return { status: 'corrupt', reason: classification.reason };
    case 'revision_integrity_failed':
      return { status: 'revision_integrity_failed', reason: 'revision-integrity' };
    case 'empty':
      return {
        status: 'empty',
        projectId: classification.state.projectId,
        pages: classification.state.pages.length,
        revisions: classification.state.revisions.length,
      };
    case 'current':
      return {
        status: 'current',
        projectId: classification.state.projectId,
        pages: classification.state.pages.length,
        revisions: classification.state.revisions.length,
      };
    default:
      return { status: 'missing' };
  }
}

function governanceSubsystem(
  classification: KnowledgeGovernanceClassification
): WikiSubsystemInspection {
  switch (classification.status) {
    case 'project_mismatch':
      return { status: 'project_mismatch', projectId: classification.projectId };
    case 'unsupported_schema':
      return { status: 'schema_unsupported', reason: `version-${String(classification.version)}` };
    case 'corrupt':
      return { status: 'corrupt', reason: classification.reason };
    case 'current':
      return {
        status: 'current',
        projectId: classification.state.projectId,
        revisions: classification.state.reviews.length,
        entries: classification.state.audit.length,
      };
    default:
      return { status: 'missing' };
  }
}

function automationSubsystem(
  classification: WikiAutomationLedgerClassification
): WikiSubsystemInspection {
  switch (classification.status) {
    case 'project_mismatch':
      return { status: 'project_mismatch', projectId: classification.projectId };
    case 'unsupported_schema':
      return { status: 'schema_unsupported', reason: `version-${String(classification.version)}` };
    case 'corrupt':
      return { status: 'corrupt', reason: classification.reason };
    case 'current':
      return {
        status: 'current',
        projectId: classification.ledger.projectId,
        entries: classification.ledger.entries.length,
      };
    default:
      return { status: 'missing' };
  }
}

function overallStatus(state: WikiInspectionReport['state']): WikiStateStatus {
  const all = [state.wiki.status, state.governance.status, state.automation.status];

  if (all.includes('project_mismatch')) {
    return 'project_mismatch';
  }

  if (all.includes('schema_unsupported')) {
    return 'schema_unsupported';
  }

  if (all.includes('corrupt') || all.includes('revision_integrity_failed')) {
    return 'corrupt';
  }

  if (
    state.wiki.status === 'missing' &&
    state.governance.status === 'missing' &&
    state.automation.status === 'missing'
  ) {
    return 'unused';
  }

  return 'current';
}

function guidanceFor(status: WikiStateStatus): string[] {
  switch (status) {
    case 'project_mismatch':
      return [
        'This storage root holds Wiki state for another ToolNet project.',
        'Open the owning project, or point this project at its own storage root.',
        'ToolNet will not adopt or rewrite the existing state.',
      ];
    case 'schema_unsupported':
      return ['Upgrade ToolNet to the build that wrote this state.'];
    case 'corrupt':
      return [
        'The original state file is preserved; ToolNet never overwrites it.',
        'Restore from backup, or move the file aside to start a fresh Wiki.',
      ];
    default:
      return [];
  }
}

/** Pure Wiki state inspection. Never writes. */
export async function inspectWikiState(
  storage: WikiStorage,
  project: ProjectManifest
): Promise<WikiInspectionReport> {
  const wikiStore = new WikiStore(storage, project);
  const governanceStore = new KnowledgeGovernanceStore(storage, project);

  const [wikiClassification, governanceClassification, ledgerText] = await Promise.all([
    wikiStore.readState(),
    governanceStore.readState(),
    storage.getText('wiki/automation.v1.json'),
  ]);

  const ledgerClassification = classifyWikiLedger(ledgerText, project.id);

  const state: WikiInspectionReport['state'] = {
    wiki: wikiSubsystem(wikiClassification),
    governance: governanceSubsystem(governanceClassification),
    automation: automationSubsystem(ledgerClassification),
  };

  const status = overallStatus(state);

  return {
    schema: 'toolnet.wiki-state.v1',
    projectId: project.id,
    state,
    status,
    repairRequired: status !== 'unused' && status !== 'current',
    migrationAvailable: false,
    supportedSchemas: [1],
    guidance: guidanceFor(status),
  };
}

/**
 * Repair Wiki state.
 *
 * Safe-by-construction: only a supported, deterministic migration is written.
 * There is no supported legacy schema below version 1 today, so the migration
 * path is an identity — repair is a no-op for current state and a refusal for
 * mismatch/corruption/unsupported state. The original file is never deleted.
 */
export async function runWikiRepair(
  storage: WikiStorage,
  project: ProjectManifest,
  options: { dryRun?: boolean } = {}
): Promise<WikiRepairReport> {
  const dryRun = options.dryRun ?? false;

  const before = await inspectWikiState(storage, project);

  const actions: string[] = [];

  let migrated = false;

  if (before.status === 'unused' || before.status === 'current') {
    actions.push('no-action:state-loadable');
  } else if (before.status === 'project_mismatch') {
    actions.push('refused:project-mismatch');
  } else if (before.status === 'schema_unsupported') {
    actions.push('refused:unsupported-schema');
  } else {
    actions.push('refused:corrupt');
  }

  if (!dryRun && before.status === 'current') {
    /* Identity migration: validate, then re-persist only when the store reports
     * a legacy version. Version 1 is current, so nothing is written. */
    const wikiStore = new WikiStore(storage, project);
    const result = await wikiStore.migrate();
    migrated = result.migrated;
    if (migrated) {
      actions.push(`migrated:version-${String(result.fromVersion)}`);
    }
  }

  const after = dryRun ? before : await inspectWikiState(storage, project);

  return {
    schema: 'toolnet.wiki-repair.v1',
    dryRun,
    statusBefore: before.status,
    statusAfter: after.status,
    actions,
    changed: after.status !== before.status,
    migrated,
    guidance: after.guidance,
  };
}
