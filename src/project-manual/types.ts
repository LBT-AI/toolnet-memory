export type ProjectRuleMode = 'enforce' | 'advisory';

export interface ProjectManualRule {
  id: string;

  mode: ProjectRuleMode;

  text: string;

  source: 'manual';
}

export interface ProjectManual {
  path: string;

  content: string;

  digest: string;

  rules: ProjectManualRule[];

  bytes: number;

  updatedAt: string;
}
