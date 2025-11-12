# Feature Tasks: Add Support for More AI Providers

**Feature Branch**: `003-add-more-ai-providers`  
**Date**: 2025-11-12  
**Status**: Open  
**Overview**: This file tracks the implementation tasks for integrating eight new AI providers (Novita AI, ZenMux AI, Atlas Cloud AI, Cohere AI, Minimax AI, Moonshot AI, Upstage AI, DeepInfra AI). Tasks are derived from the plan.md and focus on modifications to `src/config/reviewConfig.js` and `src/providers/index.js` only. Mark tasks as [x] when completed. Prioritize in order: configuration updates first, then provider integration, followed by testing.

## Implementation Tasks

- [ ] Update provider enum in `src/config/reviewConfig.js` (line 11): Append 'novita', 'zenmux', 'atlas-cloud', 'cohere', 'minimax', 'moonshot', 'upstage', 'deepinfra' to the schema.ai.provider.enum array.
- [ ] Add recommended models in `src/config/reviewConfig.js` (getRecommendedModels method): Insert entries for the eight new providers with 2-3 sample models each, as per plan snippet.
- [ ] Update API key mapping in `src/providers/index.js` (getApiKey method, lines 105-118): Add keyMap entries for the eight new providers with env vars like 'NOVITA_API_KEY'.
- [ ] Add client initialization cases in `src/providers/index.js` (initializeClient switch, lines 26-95): Implement OpenAI client cases for each new provider with their baseURLs, including Cohere at 'https://api.cohere.ai/compatibility/v1'.
- [ ] Verify no new dependencies needed: Confirm OpenAI SDK suffices for all; run `npm ls openai` to check.

## Testing Tasks

- [ ] Run unit tests: Execute `npm test` to ensure no regressions in existing providers; add new test cases for one new provider (e.g., novita-ai) in `tests/unit/providers/aiProvider.test.js`.
- [ ] Manual integration test: Set env var for one new provider (e.g., COHERE_API_KEY), configure in ai-review-config.json, run a sample code review, verify response parsing.
- [ ] Validate configuration: Use ReviewConfig.validate() with a config including a new provider; confirm no errors in schema check.
- [ ] Edge case testing: Test invalid API key for a new provider; ensure error handling throws appropriate message.

## Documentation and Cleanup Tasks

- [ ] Update README.md: Add section on new providers, env vars, and sample models (minimal addition outside core files).
- [ ] Commit changes: Create commit with message "feat: add support for Novita AI, ZenMux AI, etc. providers (#003)".
- [ ] Review code: Self-review for consistency with existing style; ensure no implementation details in spec.

## Blockers/Dependencies
- Access to provider API docs for exact baseURLs and models (if assumptions incorrect).
- Test API keys for at least one provider per category (OpenAI-compatible).

**Completion Criteria**: All tasks checked [x], tests pass 100%, manual review succeeds. Total estimated effort: 3-6 hours. Switch to code mode to start implementation.