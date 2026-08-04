import type { MemoryEngine } from "../core/memory-engine.js";
import type { RetrievalEngine } from "../retrieval/retrieval-engine.js";
import type { CodeGraphStore } from "../code-intelligence/graph/graph-store.js";
import { getArchitecture } from "../code-intelligence/graph/architecture.js";

export interface AutoContextOptions {
  maxRules?: number;
  maxTodos?: number;
  maxDecisions?: number;
  maxRelevant?: number;
  maxCharacters?: number;
}

export class AutoContextBuilder {
  constructor(
    private readonly memory: MemoryEngine,
    private readonly retrieval: RetrievalEngine,
    private readonly graph: CodeGraphStore,
  ) {}

  build(
    projectId: string,
    query: string,
    options: AutoContextOptions = {},
  ): string {
    const maxRules = options.maxRules ?? 3;
    const maxTodos = options.maxTodos ?? 3;
    const maxDecisions = options.maxDecisions ?? 3;
    const maxRelevant = options.maxRelevant ?? 5;
    const maxCharacters = options.maxCharacters ?? 7000;

    const rules = this.memory
      .byType(projectId, "rule")
      .slice(0, maxRules);

    const todos = this.memory
      .byType(projectId, "todo")
      .slice(0, maxTodos);

    const decisions = this.memory
      .byType(projectId, "decision")
      .slice(0, maxDecisions);

    const relevant = this.retrieval.search(
      projectId,
      query,
      {
        topK: maxRelevant,
      },
    );

    const architecture = getArchitecture(
      this.graph,
      projectId,
    );

    const blocks: string[] = [];

    blocks.push(
      [
        "[PROJECT]",
        `files=${architecture.files}`,
        `classes=${architecture.classes}`,
        `functions=${architecture.functions}`,
        `methods=${architecture.methods}`,
        `calls=${architecture.calls}`,
      ].join(" "),
    );

    for (const item of rules) {
      blocks.push(
        `[RULE] ${item.content}`,
      );
    }

    for (const item of decisions) {
      blocks.push(
        `[DECISION] ${item.content}`,
      );
    }

    for (const item of todos) {
      blocks.push(
        `[TODO] ${item.content}`,
      );
    }

    for (const item of relevant) {
      const prefix =
        item.memory.type.toUpperCase();

      const block =
        `[${prefix}] ${item.memory.content}`;

      if (!blocks.includes(block)) {
        blocks.push(block);
      }
    }

    let output = "";

    for (const block of blocks) {
      const next =
        output.length === 0
          ? block
          : `${output}\n${block}`;

      if (
        next.length >
        maxCharacters
      ) {
        break;
      }

      output = next;
    }

    return output;
  }
}
