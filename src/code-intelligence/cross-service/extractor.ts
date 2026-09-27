import type { ServiceDescriptor } from './types.js';
import type {
  EventDeclaration,
  HttpClientCall,
  HttpOperationDeclaration,
  HttpRouteDeclaration,
  ProtocolClientCall,
} from './types.js';

export interface ExtractionContext {
  projectId: string;
  rootPath: string;
  /** Project-root-relative path of the file being analysed. */
  filePath: string;
  source: string;
  service: ServiceDescriptor | undefined;
  /** Containing symbol (by start line) for deterministic caller attribution. */
  callerSymbolFor: (line: number) => string | undefined;
}

export interface ExtractionOutput {
  routes: HttpRouteDeclaration[];
  operations: HttpOperationDeclaration[];
  clients: Array<HttpClientCall | ProtocolClientCall>;
  events: EventDeclaration[];
  unsupportedFrameworks: string[];
  /** Deterministic, source-free diagnostics. */
  diagnostics: string[];
}

export function emptyExtraction(): ExtractionOutput {
  return {
    routes: [],
    operations: [],
    clients: [],
    events: [],
    unsupportedFrameworks: [],
    diagnostics: [],
  };
}

export interface ProtocolExtractor {
  readonly id: string;
  /** Extractors are keyed by language id, e.g. `typescript`, `python`, `go`. */
  readonly language: string;
  supports(filePath: string): boolean;
  extract(context: ExtractionContext): ExtractionOutput | Promise<ExtractionOutput>;
}
