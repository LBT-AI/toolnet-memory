# Task Activity Progress

Phase 48 adds deterministic autonomous progress visibility without changing the
lifecycle meaning of `Task.progress`.

## Why this is separate from `Task.progress`

`Task.progress` is explicit execution state and participates in the Task
completion guard. Automatically writing guessed percentages into that field
could prevent a valid Task from completing.

Phase 48 therefore adds the derived field `Task.activityProgress`. It is
reconstructed entirely from existing durable Task state.

## Durable inputs

Activity progress may use:

- lifecycle status
- `filesTouched`
- test outcomes
- verification evidence
- commit evidence

It does not inspect hidden reasoning, raw terminal output, arbitrary assistant
prose, or LLM-generated summaries.

## Stages

`queued`, `implementing`, `verifying`, `needs_attention`,
`ready_to_complete`, `blocked`, `completed`, and `cancelled`.

## Deterministic percentages

The percentage is an execution activity indicator, not a replacement for
explicit project progress.

| Signal                | Percentage |
| --------------------- | ---------: |
| pending               |         0% |
| active                |        15% |
| files changed         |        45% |
| failing checks        |        55% |
| passing tests         |        70% |
| verification PASS     |        85% |
| commit recorded       |        90% |
| completed / cancelled |       100% |

## Completion safety

Activity progress never changes `Task.progress.completed` or
`Task.progress.total`. Existing dependency, child, blocker, and explicit
progress completion guards remain authoritative.

## Replay and convergence

No new Task operation type is required. Activity progress is derived during
Task projection from existing immutable operations, so replaying the same
canonical operation set produces the same activity progress. Phase 45
cross-host convergence remains the source of truth.
