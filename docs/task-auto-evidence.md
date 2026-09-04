# Automatic Task Evidence

Phase 38 connects existing ToolNet activity hooks to Persistent Shared Tasks.

Automatic evidence is recorded only when an agent currently holds an active
Task lease.

## Target resolution

Target selection is deterministic.

Priority:

```text
1. Explicit TOOLNET_TASK_ID
2. Exactly one Task leased by TOOLNET_AGENT_ID
3. Exactly one active Task among the agent's leases
4. Otherwise: record nothing
```

If attribution is ambiguous, ToolNet fails closed and does not guess.

## File edits

The existing afterEdit -> HookRuntime.fileWrite() path records project-relative
file paths into the claimed Task.

Ignored:

```text
.toolnet/**
.git/**
node_modules/**
files outside project root
```

The browser/UI is not involved.

## Tests

Recognized local test families include:

```text
npm test
pnpm test
yarn test
bun test
npm/pnpm/yarn/bun run *test*
vitest
jest
pytest
go test
cargo test
```

A numeric exit code is required.

Result:

```text
exit 0     -> pass
exit != 0  -> fail
```

Raw stdout/stderr is never stored automatically.

## Verification evidence

Recognized verification families include script names containing:

```text
typecheck
lint
audit
verify
certif
build
smoke
check
```

Also:

```text
tsc --noEmit
git diff --check
```

Task evidence stores only a safe normalized label, for example:

```text
Verification PASS: npm run typecheck
```

The raw command and command output are not persisted into Task evidence.

## Commit evidence

A successful recognized:

```text
git commit
```

causes ToolNet to resolve the repository HEAD with:

```text
git rev-parse --verify HEAD
```

The Task receives:

```text
kind: commit
summary: Commit abc123...
ref: <full commit SHA>
```

Duplicate commit SHA evidence is ignored.

No shell execution is used for Git inspection.

## No automatic completion

Phase 38 intentionally does not call `task.complete`.

Passing tests, typecheck or build is evidence only.

Task completion continues to require an explicit lifecycle action and the
Phase 34 deterministic completion guards.

## Hook behavior

Automatic Task evidence is enabled when:

```text
TOOLNET_AGENT_ID=<agent>
```

is available and the HookRuntime resolves the same existing ToolNet project.

Optional explicit Task:

```text
TOOLNET_TASK_ID=<task-id>
```

Disable:

```text
TOOLNET_AUTO_TASK_EVIDENCE=off
```

## Fail-soft compatibility

Task evidence failure does not break the existing Memory capture hook.

HookRuntime exposes:

```text
taskAutoEvidenceEnabled()
taskEvidenceFailureCount()
```

for diagnostics.

## Security

Automatic Task evidence never stores:

- raw command stdout,
- raw command stderr,
- arbitrary tool output,
- environment variables,
- credentials,
- files outside the project.

Durable strings continue through the existing ToolNet sanitizer.

## Architecture

No LLM, embedding provider, vector database, filesystem polling daemon or
remote distributed lock is added.