# Contributing to ToolNet Memory

Thanks for contributing.

## Requirements

- Node.js 22 or newer
- npm
- Git

## Development setup

```bash
git clone https://github.com/LBT-AI/toolnet-memory.git
cd toolnet-memory
npm ci
```

Run the main validation suite before submitting changes:

```bash
npm test
npm run build:release
npm pack --dry-run
bash -n scripts/install.sh
```

## Pull requests

Keep changes focused and include tests for behavior changes where practical. A pull request should explain:

- what changed,
- why the change is needed,
- how it was tested,
- whether it changes storage, session capture, project identity, agent hooks, packaging, or CLI behavior.

Do not mix unrelated refactors into a bug fix.

## Repository hygiene

Never commit:

- `.env` files or real credentials,
- API keys, access tokens, passwords, or cookies,
- `.toolnet/` runtime state,
- raw project/session data,
- `.bob/` local agent metadata,
- generated `projects/` runtime data,
- npm package archives (`*.tgz`),
- local databases, logs, caches, or backups.

Use `.env.example` for configuration examples and synthetic values for tests.

## Project isolation

Changes involving storage, sessions, retrieval, or work continuity must preserve strict project isolation. A project must never silently inherit memory, vectors, session state, or context from another project.

## Security-sensitive changes

For changes involving secrets, credential handling, sanitization, remote storage, or session capture, review `SECURITY.md` and verify that diagnostics do not expose full secret values.

## Releases

Releases are automated through GitHub Actions. Release tags must match the version in `package.json` exactly, for example `v0.2.10` for package version `0.2.10`.

Do not manually publish a package from a feature branch.
