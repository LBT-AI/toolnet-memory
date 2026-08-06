import {
  mkdirSync,
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

import {
  writeJsonAtomic,
} from "../session/utils.js";

import type {
  SemanticObservation,
  SemanticObservationBatch,
  SemanticPhaseContext,
  SemanticValue,
  SemanticWorkState,
} from "./semantic-types.js";

function valueOf(
  item:
    SemanticObservation,
): SemanticValue {
  return {
    value:
      item.value,

    confidence:
      item.confidence,

    evidence:
      item.evidence,
  };
}

function isLater(
  incoming:
    SemanticValue,

  previous:
    SemanticValue |
    undefined,
): boolean {
  if (
    !previous
  ) {
    return true;
  }

  const time =
    incoming
      .evidence
      .occurredAt
      .localeCompare(
        previous
          .evidence
          .occurredAt,
      );

  if (
    time !==
    0
  ) {
    return time >
      0;
  }

  if (
    incoming
      .evidence
      .sessionKey ===
    previous
      .evidence
      .sessionKey
  ) {
    return (
      incoming
        .evidence
        .sequence >=
      previous
        .evidence
        .sequence
    );
  }

  return (
    incoming.confidence >=
    previous.confidence
  );
}

function latest(
  previous:
    SemanticValue |
    undefined,

  incoming:
    SemanticValue,
): SemanticValue {
  return isLater(
    incoming,
    previous,
  )
    ? incoming
    : previous!;
}

function uniqueValues(
  values:
    SemanticValue[],

  limit =
    30,
): SemanticValue[] {
  const seen =
    new Set<
      string
    >();

  const output:
    SemanticValue[] =
    [];

  for (
    const value
    of values
  ) {
    const key =
      value.value
        .normalize(
          "NFKC",
        )
        .toLowerCase()
        .replace(
          /\s+/g,
          " ",
        )
        .trim();

    if (
      !key ||
      seen.has(
        key,
      )
    ) {
      continue;
    }

    seen.add(
      key,
    );

    output.push(
      value,
    );
  }

  return output.slice(
    -limit,
  );
}

async function loadBatches(
  project:
    ProjectManifest,

  storage:
    StorageProvider,
): Promise<
  SemanticObservationBatch[]
> {
  const prefix =
    `projects/${project.id}/work/semantic/observations/`;

  const objects =
    await storage.list(
      prefix,
    );

  const batches:
    SemanticObservationBatch[] =
    [];

  for (
    const object
    of objects
      .filter(
        item =>
          item.key.endsWith(
            ".json",
          ),
      )
      .sort(
        (
          left,
          right,
        ) =>
          left.key.localeCompare(
            right.key,
          ),
      )
  ) {
    const text =
      await storage
        .getText(
          object.key,
        );

    if (
      !text
    ) {
      continue;
    }

    try {
      const parsed =
        JSON.parse(
          text,
        ) as
          SemanticObservationBatch;

      if (
        parsed.version ===
          1 &&
        Array.isArray(
          parsed.observations,
        )
      ) {
        batches.push(
          parsed,
        );
      }
    } catch {
      // Optional derived projection.
    }
  }

  return batches;
}

function emptyPhase(
  observation:
    SemanticObservation,
): SemanticPhaseContext {
  return {
    key:
      observation.scopeKey ??
      `phase:${observation.scopeOrder ?? 0}`,

    order:
      observation.scopeOrder ??
      0,

    acceptanceCriteria:
      [],

    dependencies:
      [],

    openQuestions:
      [],

    constraints:
      [],

    notes:
      [],
  };
}

export async function reconcileSemanticWorkState(
  project:
    ProjectManifest,

  storage:
    StorageProvider,
): Promise<
  SemanticWorkState
> {
  const batches =
    await loadBatches(
      project,
      storage,
    );

  const observations =
    batches
      .flatMap(
        batch =>
          batch.observations,
      )
      .sort(
        (
          left,
          right,
        ) => {
          const time =
            left.evidence
              .occurredAt
              .localeCompare(
                right.evidence
                  .occurredAt,
              );

          if (
            time !==
            0
          ) {
            return time;
          }

          if (
            left.evidence
              .sessionKey ===
            right.evidence
              .sessionKey
          ) {
            return (
              left.evidence
                .sequence -
              right.evidence
                .sequence
            );
          }

          return left.id
            .localeCompare(
              right.id,
            );
        },
      );

  let mission:
    SemanticValue |
    undefined;

  let activeObjective:
    SemanticValue |
    undefined;

  let why:
    SemanticValue |
    undefined;

  let desiredOutcome:
    SemanticValue |
    undefined;

  let planRationale:
    SemanticValue |
    undefined;

  const phases =
    new Map<
      string,
      SemanticPhaseContext
    >();

  const openQuestions:
    SemanticValue[] =
    [];

  const constraints:
    SemanticValue[] =
    [];

  const notes:
    SemanticValue[] =
    [];

  for (
    const observation
    of observations
  ) {
    const value =
      valueOf(
        observation,
      );

    if (
      observation.scope ===
        "phase" &&
      observation.scopeKey
    ) {
      const phase =
        phases.get(
          observation
            .scopeKey,
        ) ??
        emptyPhase(
          observation,
        );

      switch (
        observation.kind
      ) {
        case "phase_objective":
          phase.objective =
            latest(
              phase.objective,
              value,
            );
          break;

        case "phase_why":
          phase.why =
            latest(
              phase.why,
              value,
            );
          break;

        case "phase_deliverable":
          phase.deliverable =
            latest(
              phase.deliverable,
              value,
            );
          break;

        case "acceptance_criterion":
          phase.acceptanceCriteria
            .push(
              value,
            );
          break;

        case "dependency":
          phase.dependencies
            .push(
              value,
            );
          break;

        case "open_question":
          phase.openQuestions
            .push(
              value,
            );
          break;

        case "constraint":
          phase.constraints
            .push(
              value,
            );
          break;

        case "note":
          phase.notes
            .push(
              value,
            );
          break;
      }

      phases.set(
        phase.key,
        phase,
      );

      continue;
    }

    switch (
      observation.kind
    ) {
      case "mission":
        mission =
          latest(
            mission,
            value,
          );
        break;

      case "objective":
        activeObjective =
          latest(
            activeObjective,
            value,
          );
        break;

      case "why":
        why =
          latest(
            why,
            value,
          );
        break;

      case "desired_outcome":
        desiredOutcome =
          latest(
            desiredOutcome,
            value,
          );
        break;

      case "plan_rationale":
        planRationale =
          latest(
            planRationale,
            value,
          );
        break;

      case "open_question":
        openQuestions.push(
          value,
        );
        break;

      case "constraint":
        constraints.push(
          value,
        );
        break;

      case "note":
        notes.push(
          value,
        );
        break;
    }
  }

  for (
    const phase
    of phases.values()
  ) {
    phase.acceptanceCriteria =
      uniqueValues(
        phase.acceptanceCriteria,
        20,
      );

    phase.dependencies =
      uniqueValues(
        phase.dependencies,
        15,
      );

    phase.openQuestions =
      uniqueValues(
        phase.openQuestions,
        15,
      );

    phase.constraints =
      uniqueValues(
        phase.constraints,
        15,
      );

    phase.notes =
      uniqueValues(
        phase.notes,
        20,
      );
  }

  const state:
    SemanticWorkState =
  {
    version:
      1,

    projectId:
      project.id,

    projectName:
      project.name,

    mission,

    activeObjective,

    why,

    desiredOutcome,

    planRationale,

    phases:
      Array.from(
        phases.values(),
      ).sort(
        (
          left,
          right,
        ) =>
          left.order -
          right.order,
      ),

    openQuestions:
      uniqueValues(
        openQuestions,
        20,
      ),

    constraints:
      uniqueValues(
        constraints,
        20,
      ),

    notes:
      uniqueValues(
        notes,
        20,
      ),

    updatedAt:
      observations.length
        ? observations[
            observations.length -
            1
          ].evidence
            .occurredAt
        : new Date()
            .toISOString(),
  };

  const localDirectory =
    join(
      project.rootPath,
      ".toolnet",
      "work",
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
      "semantic-current.json",
    ),
    state,
  );

  await storage.put(
    `projects/${project.id}/work/semantic/current.json`,

    JSON.stringify(
      state,
      null,
      2,
    ) +
      "\n",

    "application/json",
  );

  return state;
}

export async function loadSemanticWorkState(
  project:
    ProjectManifest,

  storage:
    StorageProvider,
): Promise<
  SemanticWorkState |
    null
> {
  const text =
    await storage.getText(
      `projects/${project.id}/work/semantic/current.json`,
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
      SemanticWorkState;
  } catch {
    return null;
  }
}
