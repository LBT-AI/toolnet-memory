import type { CodeSymbol } from '../../core/types.js';

export type GraphEdgeType =
  | 'DEFINES'
  | 'IMPORTS'
  | 'CALLS'
  | 'CALL_REFERENCE'
  | 'USES_TYPE'
  | 'INHERITS'
  | 'IMPLEMENTS'
  | 'READS'
  | 'WRITES'
  | 'HANDLES'
  | 'CONFIGURES'
  | 'ROUTE'
  | 'TESTS'
  | 'HTTP_CALLS'
  | 'RPC_CALLS'
  | 'GRAPHQL_CALLS'
  | 'TRPC_CALLS'
  | 'EMITS'
  | 'LISTENS_ON';

export interface EdgeSemanticDefinition {
  type: GraphEdgeType;
  description: string;
  allowedSourceTypes: CodeSymbol['type'][];
  allowedTargetTypes: CodeSymbol['type'][];
  primaryProducer: 'parser' | 'resolver' | 'enricher' | 'analysis';
  requiresResolvedTarget: boolean;
  supportsMultiple: boolean;
  category: 'structure' | 'dependency' | 'call' | 'type' | 'data' | 'route' | 'test' | 'event';
}

export const EDGE_SEMANTIC_REGISTRY: Record<GraphEdgeType, EdgeSemanticDefinition> = {
  DEFINES: {
    type: 'DEFINES',
    description: 'Container/symbol containment relationship',
    allowedSourceTypes: ['file', 'module', 'class', 'namespace', 'service'] as CodeSymbol['type'][],
    allowedTargetTypes: [
      'function',
      'method',
      'class',
      'interface',
      'property',
      'route',
      'module',
      'event',
    ] as CodeSymbol['type'][],
    primaryProducer: 'parser',
    requiresResolvedTarget: true,
    supportsMultiple: true,
    category: 'structure',
  },
  IMPORTS: {
    type: 'IMPORTS',
    description: 'Module/file import dependency',
    allowedSourceTypes: ['file', 'module'] as CodeSymbol['type'][],
    allowedTargetTypes: ['file', 'module'] as CodeSymbol['type'][],
    primaryProducer: 'parser',
    requiresResolvedTarget: true,
    supportsMultiple: true,
    category: 'dependency',
  },
  CALLS: {
    type: 'CALLS',
    description: 'Deterministic static call relationship',
    allowedSourceTypes: ['function', 'method', 'class', 'route'] as CodeSymbol['type'][],
    allowedTargetTypes: ['function', 'method', 'class', 'constructor'] as CodeSymbol['type'][],
    primaryProducer: 'resolver',
    requiresResolvedTarget: true,
    supportsMultiple: true,
    category: 'call',
  },
  CALL_REFERENCE: {
    type: 'CALL_REFERENCE',
    description: 'Call site references declaration/interface without known runtime target',
    allowedSourceTypes: ['function', 'method', 'class', 'route'] as CodeSymbol['type'][],
    allowedTargetTypes: [
      'function',
      'method',
      'class',
      'interface',
      'constructor',
    ] as CodeSymbol['type'][],
    primaryProducer: 'resolver',
    requiresResolvedTarget: true,
    supportsMultiple: true,
    category: 'call',
  },
  USES_TYPE: {
    type: 'USES_TYPE',
    description: 'Symbol uses/references a type',
    allowedSourceTypes: [
      'function',
      'method',
      'class',
      'interface',
      'property',
      'parameter',
    ] as CodeSymbol['type'][],
    allowedTargetTypes: ['class', 'interface', 'type', 'struct', 'enum'] as CodeSymbol['type'][],
    primaryProducer: 'enricher',
    requiresResolvedTarget: true,
    supportsMultiple: true,
    category: 'type',
  },
  INHERITS: {
    type: 'INHERITS',
    description: 'Class inherits from parent class',
    allowedSourceTypes: ['class'] as CodeSymbol['type'][],
    allowedTargetTypes: ['class', 'interface'] as CodeSymbol['type'][],
    primaryProducer: 'parser',
    requiresResolvedTarget: true,
    supportsMultiple: false,
    category: 'type',
  },
  IMPLEMENTS: {
    type: 'IMPLEMENTS',
    description: 'Class implements interface/trait',
    allowedSourceTypes: ['class'] as CodeSymbol['type'][],
    allowedTargetTypes: ['interface', 'trait'] as CodeSymbol['type'][],
    primaryProducer: 'parser',
    requiresResolvedTarget: true,
    supportsMultiple: true,
    category: 'type',
  },
  READS: {
    type: 'READS',
    description: 'Symbol reads/accesses a field/variable',
    allowedSourceTypes: ['function', 'method', 'class'] as CodeSymbol['type'][],
    allowedTargetTypes: ['property', 'field', 'variable'] as CodeSymbol['type'][],
    primaryProducer: 'enricher',
    requiresResolvedTarget: true,
    supportsMultiple: true,
    category: 'data',
  },
  WRITES: {
    type: 'WRITES',
    description: 'Symbol writes/assigns a field/variable',
    allowedSourceTypes: ['function', 'method', 'class'] as CodeSymbol['type'][],
    allowedTargetTypes: ['property', 'field', 'variable'] as CodeSymbol['type'][],
    primaryProducer: 'enricher',
    requiresResolvedTarget: true,
    supportsMultiple: true,
    category: 'data',
  },
  HANDLES: {
    type: 'HANDLES',
    description: 'Route handler handles a route',
    allowedSourceTypes: ['function', 'method', 'class'] as CodeSymbol['type'][],
    allowedTargetTypes: ['route'] as CodeSymbol['type'][],
    primaryProducer: 'enricher',
    requiresResolvedTarget: true,
    supportsMultiple: true,
    category: 'route',
  },
  CONFIGURES: {
    type: 'CONFIGURES',
    description: 'Symbol configures another symbol',
    allowedSourceTypes: ['function', 'method', 'class', 'module'] as CodeSymbol['type'][],
    allowedTargetTypes: [
      'function',
      'method',
      'class',
      'module',
      'property',
    ] as CodeSymbol['type'][],
    primaryProducer: 'analysis',
    requiresResolvedTarget: true,
    supportsMultiple: true,
    category: 'structure',
  },
  ROUTE: {
    type: 'ROUTE',
    description: 'Route maps to handler',
    allowedSourceTypes: ['route'] as CodeSymbol['type'][],
    allowedTargetTypes: ['function', 'method', 'class'] as CodeSymbol['type'][],
    primaryProducer: 'enricher',
    requiresResolvedTarget: true,
    supportsMultiple: true,
    category: 'route',
  },
  TESTS: {
    type: 'TESTS',
    description: 'Test file targets implementation file',
    allowedSourceTypes: ['file'] as CodeSymbol['type'][],
    allowedTargetTypes: ['file'] as CodeSymbol['type'][],
    primaryProducer: 'enricher',
    requiresResolvedTarget: true,
    supportsMultiple: true,
    category: 'test',
  },
  HTTP_CALLS: {
    type: 'HTTP_CALLS',
    description: 'Deterministic HTTP client call to a known route',
    allowedSourceTypes: ['function', 'method', 'class'] as CodeSymbol['type'][],
    allowedTargetTypes: ['route'] as CodeSymbol['type'][],
    primaryProducer: 'analysis',
    requiresResolvedTarget: true,
    supportsMultiple: true,
    category: 'call',
  },
  RPC_CALLS: {
    type: 'RPC_CALLS',
    description: 'Deterministic gRPC client call to a known RPC method',
    allowedSourceTypes: ['function', 'method', 'class'] as CodeSymbol['type'][],
    allowedTargetTypes: ['route'] as CodeSymbol['type'][],
    primaryProducer: 'analysis',
    requiresResolvedTarget: true,
    supportsMultiple: true,
    category: 'call',
  },
  GRAPHQL_CALLS: {
    type: 'GRAPHQL_CALLS',
    description: 'Deterministic GraphQL client operation targeting a schema operation',
    allowedSourceTypes: ['function', 'method', 'class'] as CodeSymbol['type'][],
    allowedTargetTypes: ['route'] as CodeSymbol['type'][],
    primaryProducer: 'analysis',
    requiresResolvedTarget: true,
    supportsMultiple: true,
    category: 'call',
  },
  TRPC_CALLS: {
    type: 'TRPC_CALLS',
    description: 'Deterministic tRPC client call to a known procedure',
    allowedSourceTypes: ['function', 'method', 'class'] as CodeSymbol['type'][],
    allowedTargetTypes: ['route'] as CodeSymbol['type'][],
    primaryProducer: 'analysis',
    requiresResolvedTarget: true,
    supportsMultiple: true,
    category: 'call',
  },
  EMITS: {
    type: 'EMITS',
    description: 'Symbol publishes to a deterministic event channel',
    allowedSourceTypes: ['function', 'method', 'class'] as CodeSymbol['type'][],
    allowedTargetTypes: ['event'] as CodeSymbol['type'][],
    primaryProducer: 'analysis',
    requiresResolvedTarget: true,
    supportsMultiple: true,
    category: 'event',
  },
  LISTENS_ON: {
    type: 'LISTENS_ON',
    description: 'Symbol subscribes to a deterministic event channel',
    allowedSourceTypes: ['function', 'method', 'class'] as CodeSymbol['type'][],
    allowedTargetTypes: ['event'] as CodeSymbol['type'][],
    primaryProducer: 'analysis',
    requiresResolvedTarget: true,
    supportsMultiple: true,
    category: 'event',
  },
};

export function getEdgeSemanticDefinition(type: GraphEdgeType): EdgeSemanticDefinition | undefined {
  return EDGE_SEMANTIC_REGISTRY[type];
}

export function isEdgeTypeAllowed(
  type: GraphEdgeType,
  sourceType: CodeSymbol['type'],
  targetType: CodeSymbol['type']
): boolean {
  const definition = EDGE_SEMANTIC_REGISTRY[type];
  if (!definition) return false;
  return (
    definition.allowedSourceTypes.includes(sourceType) &&
    definition.allowedTargetTypes.includes(targetType)
  );
}

export function getEdgeCategory(
  type: GraphEdgeType
): EdgeSemanticDefinition['category'] | undefined {
  return EDGE_SEMANTIC_REGISTRY[type]?.category;
}

export function getDependencyEdgeTypes(): GraphEdgeType[] {
  return Object.entries(EDGE_SEMANTIC_REGISTRY)
    .filter(([, def]) => def.category === 'dependency')
    .map(([type]) => type as GraphEdgeType);
}

export function getCallEdgeTypes(): GraphEdgeType[] {
  return Object.entries(EDGE_SEMANTIC_REGISTRY)
    .filter(([, def]) => def.category === 'call')
    .map(([type]) => type as GraphEdgeType);
}

export function getStructureEdgeTypes(): GraphEdgeType[] {
  return Object.entries(EDGE_SEMANTIC_REGISTRY)
    .filter(([, def]) => def.category === 'structure')
    .map(([type]) => type as GraphEdgeType);
}

export function getTypeEdgeTypes(): GraphEdgeType[] {
  return Object.entries(EDGE_SEMANTIC_REGISTRY)
    .filter(([, def]) => def.category === 'type')
    .map(([type]) => type as GraphEdgeType);
}

export function getDataEdgeTypes(): GraphEdgeType[] {
  return Object.entries(EDGE_SEMANTIC_REGISTRY)
    .filter(([, def]) => def.category === 'data')
    .map(([type]) => type as GraphEdgeType);
}

export function getRouteEdgeTypes(): GraphEdgeType[] {
  return Object.entries(EDGE_SEMANTIC_REGISTRY)
    .filter(([, def]) => def.category === 'route')
    .map(([type]) => type as GraphEdgeType);
}

export function getTestEdgeTypes(): GraphEdgeType[] {
  return Object.entries(EDGE_SEMANTIC_REGISTRY)
    .filter(([, def]) => def.category === 'test')
    .map(([type]) => type as GraphEdgeType);
}

export function getEventEdgeTypes(): GraphEdgeType[] {
  return Object.entries(EDGE_SEMANTIC_REGISTRY)
    .filter(([, def]) => def.category === 'event')
    .map(([type]) => type as GraphEdgeType);
}
