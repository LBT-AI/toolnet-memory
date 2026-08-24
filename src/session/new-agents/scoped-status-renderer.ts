import type {
  UnifiedScopeLayerStatus,
  UnifiedScopedAgentStatus,
  UnifiedScopedIntegrationStatus,
} from './scoped-status.js';

function ready(value: boolean): string {
  return value ? 'ready' : 'missing';
}

function workLabel(layer: UnifiedScopeLayerStatus): string {
  if (!layer.work) {
    return 'n/a';
  }

  return `${layer.work.kind} ${ready(layer.work.configured)} — ${layer.work.file}`;
}

function renderLayer(name: string, layer: UnifiedScopeLayerStatus | undefined): string[] {
  if (!layer) {
    return [`  ${name.padEnd(8)} not selected`];
  }

  return [
    `  ${name}`,
    `    MCP   ${ready(layer.mcp.configured)} — ${layer.mcp.file}`,
    `    Hooks ${ready(layer.hooks.configured)} — ${layer.hooks.file}`,
    `    Work  ${workLabel(layer)}`,
  ];
}

export function renderUnifiedAgentScopedStatus(agent: UnifiedScopedAgentStatus): string[] {
  const lines: string[] = [];

  lines.push(`${agent.label} — ${agent.state.toUpperCase()}`);
  lines.push(...renderLayer('Global', agent.global));
  lines.push(...renderLayer('Project', agent.project));
  lines.push(
    `  Effective  MCP=${agent.effective.mcp} Hooks=${agent.effective.hooks} Work=${agent.effective.work}`
  );
  lines.push(
    `  Dedupe     ${agent.dedupe.ready ? 'ready' : 'missing'}${agent.dedupe.required ? ' (required)' : ' (not required)'}`
  );
  lines.push(
    `  Trust      ${
      agent.trust.state === 'required-unverified'
        ? 'required / native trust unverified'
        : 'not required'
    }`
  );
  lines.push(
    `  Risk       MCP=${agent.risk.mcp} Hooks=${agent.risk.hooks} Work=${agent.risk.work}`
  );

  for (const warning of agent.warnings) {
    lines.push(`  Note       ${warning}`);
  }

  return lines;
}

export function renderUnifiedScopedIntegrationStatus(
  status: UnifiedScopedIntegrationStatus
): string {
  const lines: string[] = [];

  lines.push('ToolNet Scoped Integrations');
  lines.push('===========================');
  lines.push('');
  lines.push(`State   : ${status.state}`);
  lines.push(`Scope   : ${status.requestedScope}`);

  if (status.projectRoot) {
    lines.push(`Project : ${status.projectRoot}`);
  }

  lines.push('');

  status.agents.forEach((agent, index) => {
    lines.push(...renderUnifiedAgentScopedStatus(agent));

    if (index < status.agents.length - 1) {
      lines.push('');
    }
  });

  lines.push('');
  lines.push(
    `Summary : ${status.summary.ready}/${status.summary.total} ready` +
      ` | ${status.summary.partial} partial` +
      ` | ${status.summary.invalid} invalid` +
      ` | ${status.summary.missing} missing`
  );
  lines.push('');

  return lines.join('\n');
}
