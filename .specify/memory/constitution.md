<!--
Version change: 0.1.0 → 0.2.0
Added sections: None
Removed sections: None
Modified principles: Updated Node.js version to 20+ LTS in VI. GitHub Workflow Automation and Additional Constraints
Templates requiring updates: None (✅ updated)
Follow-up TODOs: Update all references to Node.js version in docs and workflows
-->
# AI Code Reviewer Constitution

## Core Principles

### I. Library-First
Every feature starts as a standalone library; Libraries must be self-contained, independently testable, documented; Clear purpose required - no organizational-only libraries

### II. CLI Interface
Every library exposes functionality via CLI; Text in/out protocol: stdin/args → stdout, errors → stderr; Support JSON + human-readable formats

### III. Test-First (NON-NEGOTIABLE)
TDD mandatory: Tests written → User approved → Tests fail → Then implement; Red-Green-Refactor cycle strictly enforced

### IV. Integration Testing
Focus areas requiring integration tests: New library contract tests, Contract changes, Inter-service communication, Shared schemas

### V. Observability, VI. Versioning & Breaking Changes, VII. Simplicity
Text I/O ensures debuggability; Structured logging required; Or: MAJOR.MINOR.BUILD format; Or: Start simple, YAGNI principles

### VI. GitHub Workflow Automation
All Node.js projects MUST use GitHub Actions for CI/CD; Workflows MUST include linting, testing, and deployment stages; Node.js version MUST be pinned and updated regularly (20+ LTS); Secrets and environment variables MUST be managed securely; AI-powered code review workflows MUST be implemented for pull requests using configurable AI models and reviewer personas; Large files MUST be processed in chunks; Discord notifications MUST be sent for review start, completion, and errors; Unnecessary files/folders (e.g., node_modules/, build/, dist/) MUST be excluded from review

## Additional Constraints

Technology stack requirements: Node.js for runtime (20+ LTS), npm for package management, GitHub for version control and CI/CD

## Development Workflow

Code review requirements: All PRs must pass CI checks; Testing gates enforced; Deployment approval process via GitHub environments

## Governance

Constitution supersedes all other practices; Amendments require documentation, approval, migration plan

All PRs/reviews must verify compliance; Complexity must be justified; Use constitution for runtime development guidance

**Version**: 0.2.0 | **Ratified**: 2025-11-07 | **Last Amended**: 2025-11-10
