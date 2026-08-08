## Summary

Describe what changed and why.

## Validation

- [ ] `npm test`
- [ ] `npm run build:release`
- [ ] `npm pack --dry-run`
- [ ] `bash -n scripts/install.sh` if installer code changed

## Safety / compatibility

- [ ] No secrets, credentials, `.env` content, or private project data are included.
- [ ] Project isolation is preserved.
- [ ] Existing Agy / OpenCode / Codex integrations are not silently broken.
- [ ] Storage or session schema changes are documented when applicable.

## Notes

List migrations, compatibility concerns, or follow-up work here.
