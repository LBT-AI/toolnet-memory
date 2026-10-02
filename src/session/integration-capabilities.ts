export type IntegrationMemoryLevel = 'mcp-only' | 'native-capture';

export type IntegrationRefreshMode =
  'native-lifecycle' | 'persistent-plugin' | 'native-session' | 'mcp-only' | 'managed-wrapper';

export type SupportedIntegrationAgent =
  | 'agy'
  | 'opencode'
  | 'codex'
  | 'claude'
  | 'kiro'
  | 'cursor'
  | 'copilot'
  | 'grok'
  | 'toolnet-cli'
  | 'kilo'
  | 'goose'
  | 'qwen'
  | 'kimi'
  | 'hermes'
  | 'qoder'
  | 'aider'
  | 'plandex'
  | 'openrouter'
  | 'bob';

export interface IntegrationCapabilities {
  mcp: boolean;
  continuityRead: boolean;
  nativeCapture: boolean;
  lifecycleHooks: boolean;
  sharedJournalWrite: boolean;
  level: IntegrationMemoryLevel;
}

export type IntegrationCaptureMode =
  | 'hook'
  | 'managed-wrapper-session-end'
  | 'native-auto-with-source-resolution'
  | 'manual-sync'
  | 'mcp-only'
  | 'blocked-product-identity';

export interface AgentIntegrationCapabilities extends IntegrationCapabilities {
  agent: SupportedIntegrationAgent;
  refreshMode: IntegrationRefreshMode;

  /**
   * How session events actually reach ToolNet. Distinct from refreshMode:
   * a native-lifecycle host may still require an explicit sync command.
   */
  captureMode: IntegrationCaptureMode;
}

/**
 * Native lifecycle events a hook integration must register. Empty for
 * manual-sync and mcp-only integrations.
 */
export const REQUIRED_HOOK_EVENTS: Readonly<Record<SupportedIntegrationAgent, readonly string[]>> =
  {
    claude: ['SessionStart', 'UserPromptSubmit', 'PostToolUse', 'Stop'],
    cursor: [
      'sessionStart',
      'beforeSubmitPrompt',
      'preToolUse',
      'postToolUse',
      'afterAgentResponse',
      'stop',
    ],
    copilot: [
      'sessionStart',
      'userPromptSubmitted',
      'userPromptTransformed',
      'preToolUse',
      'postToolUse',
      'agentStop',
    ],
    grok: ['SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse', 'Stop'],
    kiro: ['SessionStart', 'UserPromptSubmit', 'PostToolUse', 'Stop'],
    opencode: ['session.idle'],
    codex: ['Stop', 'SessionEnd'],
    agy: ['Stop'],
    'toolnet-cli': [],
    kilo: [],
    goose: ['SessionEnd', 'Stop'],
    qwen: ['SessionEnd', 'Stop'],
    kimi: ['SessionEnd', 'Stop'],
    hermes: ['on_session_end'],
    qoder: ['SessionEnd', 'Stop'],
    aider: [],
    plandex: [],
    openrouter: [],
    bob: ['Stop', 'SessionStart'],
  };

const CAPTURE_MODES: Readonly<Record<SupportedIntegrationAgent, IntegrationCaptureMode>> = {
  claude: 'hook',
  cursor: 'hook',
  copilot: 'hook',
  grok: 'hook',
  kiro: 'hook',
  opencode: 'hook',
  codex: 'hook',
  agy: 'hook',
  'toolnet-cli': 'manual-sync',
  kilo: 'mcp-only',
  goose: 'hook',
  qwen: 'hook',
  kimi: 'hook',
  hermes: 'hook',
  qoder: 'hook',
  aider: 'managed-wrapper-session-end',
  plandex: 'manual-sync',
  openrouter: 'blocked-product-identity',
  bob: 'hook',
};

export const MCP_ONLY_CAPABILITIES: IntegrationCapabilities = {
  mcp: true,
  continuityRead: true,
  nativeCapture: false,
  lifecycleHooks: false,
  sharedJournalWrite: false,
  level: 'mcp-only',
};

/**
 * Native durable session source is available and ToolNet Memory
 * can import it into the shared project journal.
 *
 * lifecycleHooks remains false until automatic host lifecycle
 * wiring is installed.
 */
export const NATIVE_SESSION_IMPORT_CAPABILITIES: IntegrationCapabilities = {
  mcp: true,
  continuityRead: true,
  nativeCapture: true,
  lifecycleHooks: false,
  sharedJournalWrite: true,
  level: 'native-capture',
};

const NATIVE_LIFECYCLE_CAPABILITIES: IntegrationCapabilities = {
  mcp: true,
  continuityRead: true,
  nativeCapture: true,
  lifecycleHooks: true,
  sharedJournalWrite: true,
  level: 'native-capture',
};

const PERSISTENT_PLUGIN_CAPABILITIES: IntegrationCapabilities = {
  mcp: true,
  continuityRead: true,
  nativeCapture: true,
  lifecycleHooks: true,
  sharedJournalWrite: true,
  level: 'native-capture',
};

const MANAGED_WRAPPER_CAPABILITIES: IntegrationCapabilities = {
  mcp: true,
  continuityRead: true,
  nativeCapture: true,
  lifecycleHooks: false,
  sharedJournalWrite: true,
  level: 'native-capture',
};

function profile(
  agent: SupportedIntegrationAgent,
  capabilities: IntegrationCapabilities,
  refreshMode: IntegrationRefreshMode
): AgentIntegrationCapabilities {
  return {
    agent,
    ...capabilities,
    refreshMode,
    captureMode: CAPTURE_MODES[agent],
  };
}

export function integrationCaptureModeFor(agent: string): IntegrationCaptureMode | undefined {
  return isSupportedIntegrationAgent(agent) ? CAPTURE_MODES[agent] : undefined;
}

export function requiredHookEventsFor(agent: string): readonly string[] {
  return isSupportedIntegrationAgent(agent) ? REQUIRED_HOOK_EVENTS[agent] : [];
}

export const AGENT_INTEGRATION_CAPABILITIES: Readonly<
  Record<SupportedIntegrationAgent, AgentIntegrationCapabilities>
> = {
  agy: profile('agy', NATIVE_LIFECYCLE_CAPABILITIES, 'native-lifecycle'),
  opencode: profile('opencode', PERSISTENT_PLUGIN_CAPABILITIES, 'persistent-plugin'),
  codex: profile('codex', NATIVE_LIFECYCLE_CAPABILITIES, 'native-lifecycle'),
  claude: profile('claude', NATIVE_LIFECYCLE_CAPABILITIES, 'native-lifecycle'),
  kiro: profile('kiro', NATIVE_LIFECYCLE_CAPABILITIES, 'native-lifecycle'),
  cursor: profile('cursor', NATIVE_LIFECYCLE_CAPABILITIES, 'native-lifecycle'),
  copilot: profile('copilot', NATIVE_LIFECYCLE_CAPABILITIES, 'native-lifecycle'),
  grok: profile('grok', NATIVE_LIFECYCLE_CAPABILITIES, 'native-lifecycle'),
  'toolnet-cli': profile('toolnet-cli', NATIVE_SESSION_IMPORT_CAPABILITIES, 'native-session'),
  kilo: profile('kilo', MCP_ONLY_CAPABILITIES, 'mcp-only'),
  goose: profile('goose', NATIVE_LIFECYCLE_CAPABILITIES, 'native-lifecycle'),
  qwen: profile('qwen', NATIVE_LIFECYCLE_CAPABILITIES, 'native-lifecycle'),
  kimi: profile('kimi', NATIVE_LIFECYCLE_CAPABILITIES, 'native-lifecycle'),
  hermes: profile('hermes', NATIVE_LIFECYCLE_CAPABILITIES, 'native-lifecycle'),
  qoder: profile('qoder', NATIVE_LIFECYCLE_CAPABILITIES, 'native-lifecycle'),
  aider: profile('aider', MANAGED_WRAPPER_CAPABILITIES, 'managed-wrapper'),
  plandex: profile('plandex', NATIVE_SESSION_IMPORT_CAPABILITIES, 'native-session'),
  openrouter: profile('openrouter', MCP_ONLY_CAPABILITIES, 'mcp-only'),
  bob: profile('bob', NATIVE_LIFECYCLE_CAPABILITIES, 'native-lifecycle'),
};

export function isSupportedIntegrationAgent(agent: string): agent is SupportedIntegrationAgent {
  return Object.prototype.hasOwnProperty.call(AGENT_INTEGRATION_CAPABILITIES, agent);
}

export function integrationCapabilitiesForAgent(
  agent: string
): AgentIntegrationCapabilities | undefined {
  if (!isSupportedIntegrationAgent(agent)) {
    return undefined;
  }
  return AGENT_INTEGRATION_CAPABILITIES[agent];
}

/** All supported integration agents in stable order. */
export const SUPPORTED_INTEGRATION_AGENTS: readonly SupportedIntegrationAgent[] = [
  'claude',
  'cursor',
  'copilot',
  'grok',
  'kiro',
  'opencode',
  'codex',
  'agy',
  'toolnet-cli',
  'kilo',
  'goose',
  'qwen',
  'kimi',
  'hermes',
  'qoder',
  'aider',
  'plandex',
  'openrouter',
  'bob',
] as const;

export function integrationCapabilityLabel(agent: string): string {
  const capabilities = integrationCapabilitiesForAgent(agent);
  if (!capabilities) {
    return 'unknown';
  }
  switch (capabilities.refreshMode) {
    case 'native-lifecycle':
      return 'native lifecycle';
    case 'persistent-plugin':
      return 'persistent plugin';
    case 'native-session':
      return 'native session capture';
    case 'mcp-only':
      return 'MCP only';
    case 'managed-wrapper':
      return 'managed wrapper';
    default:
      return capabilities.refreshMode;
  }
}
