# Implementation Plan: Add Support for Additional AI Providers

**Branch**: `002-add-ai-providers` | **Date**: 2025-11-10 | **Spec**: [specs/002-add-ai-providers/spec.md]

**Input**: Feature specification from `/specs/002-add-ai-providers/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

The primary requirement is to extend the AI code reviewer tool to support four additional AI providers: Together AI, Fireworks AI, Mistral AI, and Cerebras AI. This enables users to set the "provider" field in ai-review-config.json to these new names and specify compatible models, with API keys loaded from environment variables (e.g., TOGETHER_API_KEY). The technical approach extends the existing abstraction in src/providers/index.js, which already handles multiple providers via switch statements for client initialization, key loading, and response generation. Add cases for new providers: OpenAI-compatible for Together/Fireworks/Cerebras (reuse OpenAI SDK with baseURL), dedicated SDK for Mistral. This maintains backward compatibility without config schema changes.

## Technical Context

**Language/Version**: Node.js 20+ (LTS)  
**Primary Dependencies**: @together-ai/sdk (Together AI), @mistralai/mistralai (Mistral AI), existing @openai/openai (for Fireworks/Cerebras), @anthropic-ai/sdk  
**Storage**: Existing JSON config for provider/model; env vars for API keys  
**Testing**: Jest for unit/integration tests on new provider cases  
**Target Platform**: Node.js server/CLI (cross-platform)  
**Project Type**: Single project (Node.js CLI/tool)  
**Performance Goals**: Review completion under 30 seconds; leverage Cerebras for low latency  
**Constraints**: Extend existing src/providers/index.js; no config changes; secure env var loading; rate limit retries  
**Scale/Scope**: Add 4 cases to switches in providers/index.js; update generateResponse for Mistral; support 10+ providers total

## Workflow Integration
- **.github/workflows/ai-review.yml**: Supports "ai-provider" input and env vars (e.g., OPENAI_API_KEY). Add new env vars (TOGETHER_API_KEY, etc.) to secrets. The action uses updated index.js for new providers.
- **setup-workflow.sh**: Downloads workflow/config; no changes. Users add new secrets in GitHub settings post-setup.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Adheres to Node.js 20+ LTS, standard conventions.
- TDD for new cases; integration tests for providers.
- GitHub workflows: Extend existing action; Discord for errors.
- No violations: Reuse abstraction (YAGNI); observability via logger.js.
- Passes: Modularity (switch extensions); simplicity (no new files for core logic).

## Project Structure

### Documentation (this feature)

```text
specs/002-add-ai-providers/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── config/
│   ├── index.js         # Load env vars for new keys
│   └── reviewConfig.js  # Validate new provider names
├── providers/
│   └── index.js         # Extend: Add cases in initializeClient(), getApiKey(), generateResponse() for new providers
├── services/
│   └── aiReviewService.js  # Use extended AIProvider; normalize responses
└── utils/
    ├── logger.js        # Log provider usage
    └── errorHandler.js  # Handle new errors

tests/
├── unit/
│   └── providers/       # Add tests for new cases in index.js
└── integration/         # Tests with mock env vars
```

**Structure Decision**: Modify existing src/providers/index.js (add switch cases for initialization, keys, response generation). Minimal new files; leverage current abstraction for OpenAI-compatible providers.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A      | N/A       | N/A                                |