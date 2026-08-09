# Public Repository Checklist

This checklist covers tasks required before making the ToolNet Memory repository public and maintaining it as a professional open-source project.

## Pre-Publication Security

- [ ] **Secret Scan**: Run comprehensive secret scan on entire git history
  ```bash
  git log --all --full-history --source -- '*/.env*'
  git log --all --full-history --source -- '*token*'
  git log --all --full-history --source -- '*secret*'
  git log --all --full-history --source -- '*password*'
  ```

- [ ] **Remove Sensitive History**: If secrets found, use `git filter-repo` or BFG Repo-Cleaner
  ```bash
  # Example with git-filter-repo
  git filter-repo --path-glob '**/.env' --invert-paths
  ```

- [ ] **Verify .gitignore**: Ensure all sensitive files are ignored
  - `.env` and `.env.*` (except `.env.example`)
  - `*.db`, `*.db-zst`, `*.zst`
  - `node_modules/`, `dist/`, `.cache/`
  - `.toolnet/`, `.bob/`, `projects/`

- [ ] **Review Example Files**: Sanitize `.env.example` and example configurations

## Repository Metadata

### GitHub Settings

- [ ] **Repository Description**:
  ```
  Persistent project memory, work continuity, and code intelligence for AI coding agents
  ```

- [ ] **Topics** (GitHub repository topics):
  - `ai`
  - `memory`
  - `coding-agents`
  - `mcp`
  - `opencode`
  - `codex`
  - `antigravity`
  - `code-intelligence`
  - `typescript`
  - `nodejs`
  - `developer-tools`

- [ ] **Website**: Link to npm package
  ```
  https://www.npmjs.com/package/toolnet-memory
  ```

- [ ] **License**: Verify MIT license is set in GitHub settings

- [ ] **Social Preview**: Upload repository social preview image (1280x640px)

### Repository Features

- [ ] **Enable Issues**: For bug reports and feature requests
- [ ] **Enable Discussions**: For community Q&A and announcements
- [ ] **Enable Wiki**: For extended documentation (optional)
- [ ] **Enable Projects**: For roadmap tracking (optional)
- [ ] **Enable Sponsorships**: If accepting sponsorships (optional)

### Branch Protection

- [ ] **Protect `main` branch**:
  - Require pull request reviews
  - Require status checks (CI) to pass
  - Require branches to be up to date
  - Require signed commits (optional)
  - Include administrators in restrictions

### GitHub Actions

- [ ] **Verify CI workflow**: Ensure all checks pass
  - Lint
  - Format check
  - Type check
  - Tests
  - Build

- [ ] **Verify Release workflow**: Test npm publishing
  - OIDC token configuration
  - npm provenance
  - GitHub Release creation

## Documentation

### README.md

- [ ] **Quick Start**: Clear installation and setup instructions
- [ ] **Demo Output**: Show example command output
- [ ] **Storage Providers**: Document all supported backends
- [ ] **Agent Integration**: Clear integration steps
- [ ] **Fast Context**: Explain fast vs deep recovery
- [ ] **Example Workflow**: End-to-end usage example
- [ ] **Badges**: npm version, CI status, Node.js version, license

### Additional Documentation

- [ ] **CONTRIBUTING.md**: Contribution guidelines and PR process
- [ ] **SECURITY.md**: Security policy and vulnerability reporting
- [ ] **CHANGELOG.md**: Release history and version notes
- [ ] **LICENSE**: MIT license text
- [ ] **docs/STORAGE.md**: Storage backend setup guide
- [ ] **docs/architecture.md**: System architecture overview
- [ ] **docs/memory-model.md**: Memory model documentation
- [ ] **docs/code-intelligence.md**: Code intelligence features

### Agent Instruction Files

- [ ] **GEMINI.md**: Instructions for Gemini/Agy agents
- [ ] **AGENTS.md**: Standard agent instructions
- [ ] **CLAUDE.md**: Instructions for Claude/Codex agents

## npm Package

### Package Metadata

- [ ] **package.json**: Verify all fields
  - `name`: `toolnet-memory`
  - `version`: Semantic versioning
  - `description`: Clear and concise
  - `keywords`: Relevant search terms
  - `repository`: GitHub URL
  - `homepage`: GitHub or docs URL
  - `bugs`: GitHub issues URL
  - `license`: MIT
  - `engines`: Node.js 22+

- [ ] **README.md**: npm will display this on package page

- [ ] **LICENSE**: Included in npm package

- [ ] **.npmignore** or `files` field: Control what's published
  - Include: `bundle/`, `bin/`, `README.md`, `.env.example`
  - Exclude: `src/`, `tests/`, `node_modules/`, `.git/`

### Publishing

- [ ] **Test Pack**: Verify package contents
  ```bash
  npm pack --dry-run
  ```

- [ ] **Test Install**: Install from tarball
  ```bash
  npm pack
  npm install -g toolnet-memory-*.tgz
  toolnet-memory --version
  ```

- [ ] **npm Provenance**: Enable provenance via GitHub Actions OIDC

- [ ] **npm 2FA**: Enable two-factor authentication for publishing

## Visual Assets

### Screenshots

- [ ] **Fast Context Output**: Terminal screenshot of `toolnet-memory` command
- [ ] **Agent Integration**: Screenshot of agent using ToolNet Memory
- [ ] **Code Intelligence**: Screenshot of semantic search or impact analysis
- [ ] **Work Continuity**: Screenshot of work status or handoff

### Demo GIF/Video

- [ ] **Quick Demo**: 30-60 second demo showing:
  - Installation
  - Project initialization
  - Fast context output
  - Agent integration
  - Code intelligence query

### Logo/Icon

- [ ] **Repository Icon**: 512x512px icon for social preview
- [ ] **npm Icon**: Icon for npm package page (optional)

## Community

### Issue Templates

- [ ] **Bug Report**: `.github/ISSUE_TEMPLATE/bug_report.yml`
- [ ] **Feature Request**: `.github/ISSUE_TEMPLATE/feature_request.yml`

### Pull Request Template

- [ ] **PR Template**: `.github/pull_request_template.md`
  - Description of changes
  - Related issues
  - Testing checklist
  - Breaking changes

### Code of Conduct

- [ ] **CODE_OF_CONDUCT.md**: Community standards (optional)

### Support

- [ ] **SUPPORT.md**: How to get help (optional)
  - GitHub Issues for bugs
  - GitHub Discussions for questions
  - Documentation links

## Marketing

### Announcement

- [ ] **Blog Post**: Announce release on personal/company blog
- [ ] **Social Media**: Share on Twitter, LinkedIn, Reddit
- [ ] **Hacker News**: Submit to Show HN (if appropriate)
- [ ] **Dev.to**: Write tutorial or introduction article

### Community Engagement

- [ ] **Reddit**: Post to relevant subreddits (r/programming, r/typescript, r/node)
- [ ] **Discord/Slack**: Share in relevant developer communities
- [ ] **Newsletter**: Submit to JavaScript/TypeScript newsletters

## Maintenance

### Regular Tasks

- [ ] **Dependency Updates**: Weekly/monthly dependency updates
- [ ] **Security Alerts**: Monitor and fix security vulnerabilities
- [ ] **Issue Triage**: Respond to issues within 48 hours
- [ ] **PR Review**: Review pull requests within 1 week
- [ ] **Release Cadence**: Regular releases (e.g., monthly)

### Monitoring

- [ ] **npm Downloads**: Track package downloads
- [ ] **GitHub Stars**: Monitor repository popularity
- [ ] **Issue Velocity**: Track issue open/close rate
- [ ] **CI Health**: Monitor CI success rate

## Legal

- [ ] **License Compliance**: Verify all dependencies are MIT-compatible
- [ ] **Copyright**: Update copyright year in LICENSE
- [ ] **Trademark**: Ensure no trademark conflicts with "ToolNet Memory"
- [ ] **Attribution**: Credit any third-party code or assets

## Final Checks

- [ ] **All Tests Pass**: `npm test`
- [ ] **Build Succeeds**: `npm run build:release`
- [ ] **Lint Clean**: `npm run lint`
- [ ] **Format Clean**: `npm run format:check`
- [ ] **Type Check**: `npm run typecheck`
- [ ] **Doctor Passes**: `toolnet-memory doctor`
- [ ] **No Secrets**: Final secret scan
- [ ] **Documentation Complete**: All docs reviewed and updated
- [ ] **Examples Work**: Test all code examples in README

## Post-Publication

- [ ] **Monitor First Issues**: Respond quickly to early adopters
- [ ] **Fix Critical Bugs**: Prioritize bugs reported in first week
- [ ] **Gather Feedback**: Collect user feedback and feature requests
- [ ] **Update Roadmap**: Plan next releases based on feedback
- [ ] **Thank Contributors**: Acknowledge early contributors

---

**Note**: This checklist should be reviewed and updated regularly as the project evolves. Not all items are required before initial publication, but they represent best practices for a professional open-source project.
