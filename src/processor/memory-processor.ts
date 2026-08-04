import type {
  ActivityEvent,
  MemoryType,
} from "../core/types.js";

import {
  MemoryEngine,
} from "../core/memory-engine.js";

import {
  MemoryExtractor,
} from "./memory-extractor.js";

import {
  looksLikeRule,
} from "./rule-extractor.js";

import {
  looksLikeDecision,
} from "./decision-extractor.js";

import {
  looksLikeTodo,
} from "./todo-extractor.js";

import {
  scoreImportance,
} from "./importance-scorer.js";

import {
  Summarizer,
} from "./summarizer.js";

export class MemoryProcessor {
  private readonly extractor =
    new MemoryExtractor();

  private readonly summarizer =
    new Summarizer();

  constructor(
    private readonly memory:
      MemoryEngine,
  ) {}

  process(
    events: ActivityEvent[],
  ): number {
    let created = 0;

    for (
      const event
      of events
    ) {
      const extracted =
        this.extractor.extract(
          event,
        );

      if (
        extracted
      ) {
        const type =
          this.refineType(
            extracted.type,
            extracted.content,
          );

        this.memory.remember({
          projectId:
            event.projectId,

          type,

          content:
            extracted.content,

          importance:
            scoreImportance(
              type,
              extracted.content,
            ),

          tags:
            extracted.tags,

          source:
            extracted.source,

          metadata: {
            eventId:
              event.id,

            timestamp:
              event.timestamp,

            ...extracted.metadata,
          },
        });

        created++;
      }

      if (
        event.type ===
        "user_prompt"
      ) {
        const content =
          String(
            event.data.content ??
              "",
          );

        const type =
          this.detectPromptMemoryType(
            content,
          );

        if (
          type
        ) {
          this.memory.remember({
            projectId:
              event.projectId,

            type,

            content,

            importance:
              scoreImportance(
                type,
                content,
              ),

            tags: [
              "user",
              type,
            ],

            source:
              "auto-prompt-extractor",

            metadata: {
              eventId:
                event.id,

              timestamp:
                event.timestamp,
            },
          });

          created++;
        }
      }
    }

    const summary =
      this.summarizer
        .summarize(
          events,
        );

    if (
      summary
    ) {
      const projectId =
        events[0]?.projectId;

      if (
        projectId
      ) {
        this.memory.remember({
          projectId,

          type:
            "summary",

          content:
            summary,

          importance:
            "temporary",

          tags:
            ["summary"],

          source:
            "auto-summary",

          metadata: {
            eventCount:
              events.length,
          },
        });

        created++;
      }
    }

    return created;
  }

  private refineType(
    initial:
      MemoryType,
    content:
      string,
  ): MemoryType {
    if (
      looksLikeRule(
        content,
      )
    ) {
      return "rule";
    }

    if (
      looksLikeTodo(
        content,
      )
    ) {
      return "todo";
    }

    if (
      looksLikeDecision(
        content,
      )
    ) {
      return "decision";
    }

    return initial;
  }

  private detectPromptMemoryType(
    content: string,
  ): MemoryType | null {
    if (
      looksLikeRule(
        content,
      )
    ) {
      return "rule";
    }

    if (
      looksLikeTodo(
        content,
      )
    ) {
      return "todo";
    }

    if (
      looksLikeDecision(
        content,
      )
    ) {
      return "decision";
    }

    return null;
  }
}
