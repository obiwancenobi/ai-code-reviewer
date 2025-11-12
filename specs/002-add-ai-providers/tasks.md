# Implementation Tasks: Add Support for Additional AI Providers

**Date**: 2025-11-10  
**Feature**: 002-add-ai-providers  
**Status**: Ready for Code Mode  
**Dependencies**: Complete plan.md, research.md, data-model.md, contracts/ai-api.md, quickstart.md  

## Overview
These tasks break down the implementation into actionable steps for Code mode. Each task is independent, testable, and follows TDD (write tests first). Focus on extending src/providers/index.js for new providers (Together AI, Fireworks AI, Mistral AI, Cerebras) using existing abstraction. Total estimated effort: 1-2 days. Commit after each task; run tests before PR.

## Task List

### Task 1: Add Dependencies for New SDKs
- Install @together-ai/sdk and @mistralai/mistralai via npm.
- Update package.json and run npm install.
- Test: Verify no breaking changes to existing deps; run npm test.

### Task 2: Extend getApiKey() in src/providers/index.js
- Add env var mappings for new providers: TOGETHER_API_KEY, FIREWORKS_API_KEY, MISTRAL_API_KEY, CEREBRAS_API_KEY.
- Update keyMap object with new entries.
- Test: Write unit test for getApiKey() with mocks for new vars; ensure throws error if missing.

### Task 3: Extend initializeClient() in src/providers/index.js for OpenAI-Compatible Providers
- Add cases for 'together-ai', 'fireworks-ai', 'cerebras' using OpenAI SDK with custom baseURL:
  - together-ai: 'https://api.together.xyz/v1'
  - fireworks-ai: 'https://api.fireworks.ai/inference/v1'
  - cerebras: 'https://api.cerebras.ai/v1'
- Test: Unit tests for each new client initialization; mock OpenAI constructor.

### Task 4: Add initializeClient() Case for Mistral AI in src/providers/index.js
- Import @mistralai/mistralai.
- Add case for 'mistral-ai': new MistralAI({ apiKey }).
- Test: Unit test for Mistral client creation; verify SDK import.

### Task 5: Extend generateResponse() in src/providers/index.js for New Providers
- For OpenAI-compatible (together-ai, fireworks-ai, cerebras): Reuse generateOpenAIResponse().
- For mistral-ai: Add generateMistralResponse() method using client.chat.completions.create() and return content.
- Update switch in generateResponse() to call new methods.
- Test: Unit tests for each new response generation; mock API calls, verify normalized output.

### Task 6: Update Config Validation in src/config/reviewConfig.js
- Add validation for new provider names in "ai.provider" (together-ai, fireworks-ai, mistral-ai, cerebras).
- Validate model against provider-specific lists (hardcoded or from research.md).
- Test: Unit tests for validator with new providers; ensure rejects invalid models.

### Task 7: Add Logging and Error Handling for New Providers
- In aiReviewService.js, log selected provider and model on routing.
- Extend errorHandler.js for provider-specific errors (e.g., quota exceeded).
- Test: Integration test with mock failures; verify logs and graceful fallbacks.

### Task 8: Write Unit Tests for New Providers
- In tests/unit/providers/: Test client init, key loading, response generation for each new provider.
- Mock SDKs and env vars.
- Run npm test; ensure 100% coverage for new code.

### Task 9: Write Integration Tests for End-to-End Reviews
- In tests/integration/: Mock env vars and APIs; test full review flow with each new provider.
- Verify normalized ReviewResponse structure.
- Test: Run with different providers; check output matches spec.

### Task 10: Update Documentation and Quickstart
- Ensure quickstart.md examples use new providers with existing config format.
- Add new providers to README.md supported list.
- Test: Manual verification of docs; no code changes needed.

### Task 11: Verify Workflow Compatibility
- Test .github/workflows/ai-review.yml locally or in PR: Set ai-provider input to new value, add mock secrets.
- Ensure setup-workflow.sh runs without issues (no changes needed).
- Test: Simulate PR; verify reviews route to new providers.

## Completion Criteria
- All tests pass (npm test).
- No breaking changes (existing providers work).
- Code follows ESLint/Prettier.
- Commit message: "feat: add support for Together AI, Fireworks AI, Mistral AI, Cerebras".
- Ready for PR and GitHub workflow deployment.

**Tasks Complete**: Proceed to Code mode for execution.