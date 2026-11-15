/**
 * ToolNet v0.7 MCP Token Profiles.
 *
 * Provides Lean/Standard/Full exposure profiles for MCP tool responses
 * to reduce token consumption while preserving mandatory facts.
 */

export type MCPProfile = 'lean' | 'standard' | 'full';

export interface MCPProfileConfig {
  profile: MCPProfile;
  maxMemoryItems: number;
  maxArchitectureNodes: number;
  maxDecisions: number;
  includeRawTraces: boolean;
  includeDetailedMetrics: boolean;
  includeFullGraph: boolean;
}

export const PROFILE_CONFIGS: Record<MCPProfile, MCPProfileConfig> = {
  lean: {
    profile: 'lean',
    maxMemoryItems: 3,
    maxArchitectureNodes: 10,
    maxDecisions: 3,
    includeRawTraces: false,
    includeDetailedMetrics: false,
    includeFullGraph: false,
  },
  standard: {
    profile: 'standard',
    maxMemoryItems: 10,
    maxArchitectureNodes: 50,
    maxDecisions: 10,
    includeRawTraces: false,
    includeDetailedMetrics: true,
    includeFullGraph: false,
  },
  full: {
    profile: 'full',
    maxMemoryItems: 50,
    maxArchitectureNodes: 200,
    maxDecisions: 50,
    includeRawTraces: true,
    includeDetailedMetrics: true,
    includeFullGraph: true,
  },
};

export function getProfileConfig(profile: MCPProfile | undefined): MCPProfileConfig {
  return PROFILE_CONFIGS[profile ?? 'standard'];
}

export function applyProfileToContext<T extends Record<string, unknown>>(
  context: T,
  config: MCPProfileConfig
): T {
  const result = { ...context };

  if (!config.includeRawTraces && 'runtimeTraces' in result) {
    delete (result as Record<string, unknown>).runtimeTraces;
  }

  if (!config.includeDetailedMetrics && 'metrics' in result) {
    delete (result as Record<string, unknown>).metrics;
  }

  if (!config.includeFullGraph && 'graph' in result) {
    delete (result as Record<string, unknown>).graph;
  }

  return result;
}

export function estimateTokens(text: string): number {
  return Math.ceil(Buffer.byteLength(text, 'utf8') / 2);
}

export function compactResponse<T>(data: T, config: MCPProfileConfig): T {
  const json = JSON.stringify(data);
  const estimatedTokens = estimateTokens(json);

  if (estimatedTokens <= 2000) {
    return data;
  }

  if (config.profile === 'lean') {
    return compactLean(data, config);
  }

  return data;
}

function compactLean<T>(data: T, config: MCPProfileConfig): T {
  if (Array.isArray(data)) {
    return data.slice(0, config.maxMemoryItems) as T;
  }

  if (typeof data === 'object' && data !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (key === 'memory' || key === 'relevant' || key === 'items') {
        if (Array.isArray(value)) {
          result[key] = value.slice(0, config.maxMemoryItems);
        } else {
          result[key] = value;
        }
      } else if (key === 'architecture' && typeof value === 'object') {
        result[key] = compactArchitecture(value, config);
      } else if (key === 'decisions' || key === 'architectureDecisions') {
        if (Array.isArray(value)) {
          result[key] = value.slice(0, config.maxDecisions);
        } else {
          result[key] = value;
        }
      } else {
        result[key] = value;
      }
    }
    return result as T;
  }

  return data;
}

function compactArchitecture(arch: unknown, config: MCPProfileConfig): unknown {
  if (typeof arch !== 'object' || arch === null) {
    return arch;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(arch)) {
    if (key === 'nodes' && Array.isArray(value)) {
      result[key] = value.slice(0, config.maxArchitectureNodes);
    } else if (key === 'edges' && Array.isArray(value)) {
      result[key] = value.slice(0, config.maxArchitectureNodes * 2);
    } else {
      result[key] = value;
    }
  }
  return result;
}
