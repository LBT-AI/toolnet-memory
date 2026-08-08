# Security Policy

## Supported versions

Security fixes are applied to the latest published release of ToolNet Memory. Users should update to the latest version before reporting a problem that may already be resolved.

## Reporting a vulnerability

Please do not publish vulnerabilities, API keys, access tokens, passwords, session credentials, storage credentials, or private project data in a public issue.

Preferred reporting path:

1. Use GitHub's private security advisory feature for this repository when available.
2. Include the affected ToolNet Memory version, operating system/runtime, reproduction steps, expected behavior, actual behavior, and security impact.
3. Provide the smallest safe proof of concept needed to reproduce the issue.
4. Redact all real secrets and private project content.

If a credential may have been exposed, revoke or rotate it immediately before continuing investigation.

## Security boundaries

ToolNet Memory may process coding-agent sessions, project state, source-code metadata, and remote storage credentials. Contributions must preserve these boundaries:

- secrets must be sanitized before durable persistence,
- `.env` files and authentication stores must not be committed,
- project data must remain isolated by project identity,
- one project's memory must never be silently injected into another project,
- logs and diagnostics must not print full credentials,
- test fixtures must use synthetic credentials only.

## Disclosure

Please allow reasonable time for investigation and remediation before public disclosure of a confirmed vulnerability.
