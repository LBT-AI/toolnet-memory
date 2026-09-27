export type EdgeOrigin = 'parser' | 'resolver' | 'enricher' | 'analysis';

export type EdgeEvidence =
  | 'syntax'
  | 'explicit_import'
  | 'resolved_symbol'
  | 'receiver_type'
  | 'inheritance'
  | 'declaration'
  | 'assignment'
  | 'route_declaration';

export type EdgeCertainty = 'deterministic' | 'reference';

export interface EdgeProvenance {
  origin: EdgeOrigin;
  evidence: EdgeEvidence;
  certainty: EdgeCertainty;
  generation?: string;
  filePath?: string;
  line?: number;
  language?: string;
}

export function createEdgeProvenance(
  origin: EdgeOrigin,
  evidence: EdgeEvidence,
  certainty: EdgeCertainty,
  options?: Partial<EdgeProvenance>
): EdgeProvenance {
  return {
    origin,
    evidence,
    certainty,
    ...options,
  };
}
