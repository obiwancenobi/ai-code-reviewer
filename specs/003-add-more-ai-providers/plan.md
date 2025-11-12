# Implementation Plan: Add Support for More AI Providers

**Feature Branch**: `003-add-more-ai-providers`  
**Date**: 2025-11-12  
**Status**: Draft  
**Overview**: This plan outlines the targeted modifications to integrate support for eight new AI providers (Novita AI, ZenMux AI, Atlas Cloud AI, Cohere AI, Minimax AI, Moonshot AI, Upstage AI, DeepInfra AI) without creating new files. Changes are limited to `src/config/reviewConfig.js` (for schema, validation, and recommendations) and `src/providers/index.js` (for client initialization and API key mapping). All new providers, including Cohere AI, are assumed to use OpenAI-compatible APIs. Environment variables follow the pattern `{PROVIDER}_API_KEY` (e.g., `NOVITA_API_KEY`).

## Assumptions
- All providers support OpenAI-compatible chat completions endpoints for consistency.
- Recommended models are based on common offerings; actual models should be verified post-implementation.
- No changes to prompt building, response parsing, or other logic, as normalization is handled uniformly.
- Secure API key storage via environment variables; no additional encryption needed.
- Testing: Add unit tests in `tests/unit/providers/aiProvider.test.js` for new providers (covered in separate test plan).

## Step-by-Step Implementation Guide

### Step 1: Update Provider Schema and Validation in `src/config/reviewConfig.js`
- **Location**: Line 11 (schema.ai.provider.enum array).
- **Change**: Append new providers to the enum array in lowercase kebab-case for consistency (e.g., 'novita-ai').
- **Code Snippet**:
  ```js
  provider: { type: 'string', required: true, enum: ['openai', 'anthropic', 'google', 'deepseek', 'openrouter', 'xai', 'groq', 'zai', 'together-ai', 'fireworks-ai', 'mistral-ai', 'cerebras-ai', 'novita', 'zenmux', 'atlas-cloud', 'cohere', 'minimax', 'moonshot', 'upstage', 'deepinfra'] },
  ```
- **Impact**: Enables configuration validation for new providers. Update `getAvailableProviders()` to reflect this (automatic via schema).
- **Validation**: Ensure `validate()` method checks against the expanded enum without errors.

### Step 2: Add Recommended Models for New Providers in `src/config/reviewConfig.js`
- **Location**: Lines 149-162 (getRecommendedModels method, recommendations object).
- **Change**: Add entries for each new provider with 2-3 sample models (based on typical offerings).
- **Code Snippet**:
  ```js
  const recommendations = {
    // ... existing providers ...
    'novita': ['novita-llama-3', 'novita-mistral'],
    'zenmux': ['zenmux-gpt-like', 'zenmux-coder'],
    'atlas-cloud': ['atlas-gemini-pro', 'atlas-llama'],
    'cohere': ['command-r', 'command-r-plus'],
    'minimax': ['minimax-chat', 'minimax-vision'],
    'moonshot': ['moonshot-v1-8k', 'moonshot-kimi'],
    'upstage': ['solar-10.7b', 'solar-70b'],
    'deepinfra': ['deepinfra-llama3', 'deepinfra-mixtral']
  };
  ```
- **Impact**: Provides user-friendly model suggestions in configuration. Fallback to empty array if provider unknown.
- **Note**: Models are placeholders; replace with actual supported models from provider docs.

### Step 3: Update API Key Mapping in `src/providers/index.js`
- **Location**: Lines 105-118 (getApiKey method, keyMap object).
- **Change**: Add mappings for new providers using uppercase env vars.
- **Code Snippet**:
  ```js
  const keyMap = {
    // ... existing mappings ...
    'novita': 'NOVITA_API_KEY',
    'zenmux': 'ZENMUX_API_KEY',
    'atlas-cloud': 'ATLAS_CLOUD_API_KEY',
    'cohere': 'COHERE_API_KEY',
    'minimax': 'MINIMAX_API_KEY',
    'moonshot': 'MOONSHOT_API_KEY',
    'upstage': 'UPSTAGE_API_KEY',
    'deepinfra': 'DEEPINFRA_API_KEY'
  };
  ```
- **Impact**: Allows secure retrieval of API keys from env vars. Throws error if missing, as per existing logic.

### Step 4: Add Client Initialization for New Providers in `src/providers/index.js`
- **Location**: Lines 26-95 (initializeClient switch statement).
- **Change**: Add cases for new providers using OpenAI client with custom baseURL.
- **Code Snippet** (add after existing cases):
  ```js
  case 'novita':
    return new OpenAI({
      apiKey,
      baseURL: 'https://api.novita.ai/openai'
    });

  case 'zenmux':
    return new OpenAI({
      apiKey,
      baseURL: 'https://zenmux.ai/api/v1'
    });

  case 'atlas-cloud':
    return new OpenAI({
      apiKey,
      baseURL: 'https://api.atlascloud.ai/api/v1/chat/completions'
    });

  case 'cohere':
    return new OpenAI({
      apiKey,
      baseURL: 'https://api.cohere.ai/compatibility/v1' 
    });

  case 'minimax':
    return new OpenAI({
      apiKey,
      baseURL: 'https://api.minimax.io/v1'
    });

  case 'moonshot':
    return new OpenAI({
      apiKey,
      baseURL: 'https://api.moonshot.ai/v1/chat/completions'
    });

  case 'upstage':
    return new OpenAI({
      apiKey,
      baseURL: 'https://api.upstage.ai/v1'
    });

  case 'deepinfra':
    return new OpenAI({
      apiKey,
      baseURL: 'https://api.deepinfra.com/v1/openai'
    });
  ```
- **Impact**: Initializes clients for new providers using uniform OpenAI-compatible setup. No separate SDK needed for Cohere.
- **Note**: Verify baseURLs from provider docs.

### Step 5: Testing and Validation
- Run `npm test` to verify no regressions.
- Manually test configuration with new providers using sample API keys.
- Update README.md with new env vars and models (minimal change outside specified files).

### Dependencies
- No new dependencies required, as all use OpenAI client.

### Risks and Mitigations
- **Risk**: Incorrect baseURLs lead to API errors. **Mitigation**: Test with free tiers or docs.
- **Risk**: Rate limits differ per provider. **Mitigation**: Rely on existing retry logic in errorHandler.
- **Risk**: Response formats vary. **Mitigation**: Existing parseReviewResponse handles JSON extraction robustly.

### Timeline Estimate
- Implementation: 2-4 hours (schema updates quick; client init/testing longer).
- Testing: 1-2 hours.
- Total: 3-6 hours.

This plan aligns with the spec's functional requirements (FR-001 to FR-007) and success criteria (SC-001 to SC-004). Proceed to code mode for implementation.