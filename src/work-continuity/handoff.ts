import {
  mkdirSync,
  readFileSync,
} from "node:fs";

import {
  join,
} from "node:path";

import type {
  ProjectManifest,
} from "../core/types.js";

import type {
  StorageProvider,
} from "../storage/types.js";

import type {
  SessionIdentity,
} from "../session/types.js";

import {
  sha256,
  writeJsonAtomic,
} from "../session/utils.js";

import {
  loadProjectManual,
} from "../project-manual/manager.js";

import {
  loadWorkState,
  reconcileWorkState,
} from "./reducer.js";

import type {
  WorkItem,
  WorkState,
} from "./types.js";

export interface SmartHandoff {
  version: 1;

  id: string;

  projectId: string;
  projectName: string;

  createdAt: string;

  reason:
    string;

  sourceSession: {
    agent:
      SessionIdentity["agent"];

    nativeSessionId:
      string;

    sessionKey:
      string;

    sequence:
      number;
  };

  goal?: string;

  plan?: string;

  progress:
    WorkState["progress"];

  currentPhase?:
    WorkItem;

  currentTask?:
    WorkItem;

  incompletePhases:
    WorkItem[];

  incompleteTasks:
    WorkItem[];

  nextActions:
    string[];

  blockers:
    string[];

  decisions:
    string[];

  warnings:
    string[];

  attention:
    string[];

  filesTouched:
    string[];

  tests:
    string[];

  stateDigest:
    string;
}

function substantiveState(
  state:
    WorkState,
) {
  return {
    goal:
      state.goal,

    plan:
      state.plan,

    phases:
      state.phases.map(
        item => ({
          id:
            item.id,

          title:
            item.title,

          status:
            item.status,

          order:
            item.order,
        }),
      ),

    tasks:
      state.tasks.map(
        item => ({
          id:
            item.id,

          title:
            item.title,

          status:
            item.status,

          order:
            item.order,
        }),
      ),

    decisions:
      state.decisions,

    blockers:
      state.blockers,

    warnings:
      state.warnings,

    nextActions:
      state.nextActions,

    filesTouched:
      state.filesTouched,

    tests:
      state.tests,
  };
}

function hasUnfinishedWork(
  state:
    WorkState,
): boolean {
  return (
    state.phases.some(
      item =>
        item.status ===
          "pending" ||
        item.status ===
          "in_progress" ||
        item.status ===
          "blocked",
    ) ||

    state.tasks.some(
      item =>
        item.status ===
          "pending" ||
        item.status ===
          "in_progress" ||
        item.status ===
          "blocked",
    ) ||

    state.nextActions.length >
      0 ||

    state.blockers.length >
      0
  );
}

export class SmartHandoffManager {
  constructor(
    private readonly options: {
      project:
        ProjectManifest;

      storage:
        StorageProvider;

      identity:
        SessionIdentity;
    },
  ) {}

  async capture(
    reason:
      string,

    sequence:
      number,
  ): Promise<
    SmartHandoff |
    null
  > {
    let state =
      await loadWorkState(
        this.options
          .project,

        this.options
          .storage,
      );

    if (
      !state
    ) {
      state =
        await reconcileWorkState(
          this.options
            .project,

          this.options
            .storage,
        );
    }

    if (
      !hasUnfinishedWork(
        state,
      )
    ) {
      return null;
    }

    const manual =
      loadProjectManual(
        this.options
          .project,

        false,
      );

    const enforceRules =
      manual
        ? manual.rules
            .filter(
              rule =>
                rule.mode ===
                "enforce",
            )
            .map(
              rule =>
                rule.text,
            )
        : [];

    const stateDigest =
      sha256(
        JSON.stringify(
          substantiveState(
            state,
          ),
        ),
      );

    /*
     * Stable handoff ID.
     *
     * Multiple idle/checkpoint events with no substantive
     * work-state change reuse the same handoff object.
     */
    const id =
      sha256(
        [
          this.options
            .project.id,

          this.options
            .identity
            .sessionKey,

          stateDigest,
        ].join(
          "|",
        ),
      ).slice(
        0,
        24,
      );

    const createdAt =
      new Date()
        .toISOString();

    const handoff:
      SmartHandoff =
    {
      version:
        1,

      id,

      projectId:
        this.options
          .project.id,

      projectName:
        this.options
          .project.name,

      createdAt,

      reason,

      sourceSession: {
        agent:
          this.options
            .identity.agent,

        nativeSessionId:
          this.options
            .identity
            .nativeSessionId,

        sessionKey:
          this.options
            .identity
            .sessionKey,

        sequence,
      },

      goal:
        state.goal,

      plan:
        state.plan,

      progress:
        state.progress,

      currentPhase:
        state.currentPhase,

      currentTask:
        state.currentTask,

      incompletePhases:
        state.phases.filter(
          item =>
            item.status !==
              "completed" &&
            item.status !==
              "cancelled",
        ),

      incompleteTasks:
        state.tasks.filter(
          item =>
            item.status !==
              "completed" &&
            item.status !==
              "cancelled",
        ),

      nextActions:
        state.nextActions
          .slice(
            0,
            10,
          ),

      blockers:
        state.blockers
          .slice(
            0,
            10,
          ),

      decisions:
        state.decisions
          .slice(
            -10,
          ),

      warnings:
        state.warnings
          .slice(
            -10,
          ),

      attention: [
        ...enforceRules,
        ...state.warnings,
      ].slice(
        0,
        20,
      ),

      filesTouched:
        state.filesTouched
          .slice(
            -20,
          ),

      tests:
        state.tests
          .slice(
            -15,
          ),

      stateDigest,
    };

    const remoteKey =
      `projects/${this.options.project.id}/work/handoffs/${id}.json`;

    /*
     * Historical handoff is immutable.
     */
    if (
      !await this.options
        .storage
        .exists(
          remoteKey,
        )
    ) {
      await this.options
        .storage
        .put(
          remoteKey,

          JSON.stringify(
            handoff,
            null,
            2,
          ) +
            "\n",

          "application/json",
        );
    }

    /*
     * Latest pointer is intentionally mutable.
     */
    await this.options
      .storage
      .put(
        `projects/${this.options.project.id}/work/handoff-latest.json`,

        JSON.stringify(
          handoff,
          null,
          2,
        ) +
          "\n",

        "application/json",
      );

    const localDirectory =
      join(
        this.options
          .project
          .rootPath,

        ".toolnet",
        "work",
        "handoffs",
      );

    mkdirSync(
      localDirectory,
      {
        recursive:
          true,
      },
    );

    writeJsonAtomic(
      join(
        localDirectory,
        `${id}.json`,
      ),
      handoff,
    );

    writeJsonAtomic(
      join(
        this.options
          .project
          .rootPath,

        ".toolnet",
        "work",
        "handoff-latest.json",
      ),
      handoff,
    );

    return handoff;
  }
}

export async function loadLatestHandoff(
  project:
    ProjectManifest,

  storage:
    StorageProvider,
): Promise<
  SmartHandoff |
  null
> {
  const text =
    await storage.getText(
      `projects/${project.id}/work/handoff-latest.json`,
    );

  if (
    !text
  ) {
    return null;
  }

  try {
    return JSON.parse(
      text,
    ) as
      SmartHandoff;
  } catch {
    return null;
  }
}
