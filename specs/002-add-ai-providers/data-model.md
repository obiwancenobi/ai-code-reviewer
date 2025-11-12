# Data Model: Add Support for Additional AI Providers

**Date**: 2025-11-10  
**Feature**: 002-add-ai-providers  
**Status**: Complete  

## Overview
This data model extends the existing configuration structure to support multiple AI providers without introducing new fields. The focus is on reusing the current "ai" section in ai-review-config.json, where the "provider" field accepts new values (e.g., "together-ai"). Models are provider-specific and handled internally. No schema changes; code maps providers to clients and defaults. Key entities include the config (file-based) and review requests (internal).

## Entities

### 1. AI Config (Existing Structure)
The root "ai" object in ai-review-config.json remains unchanged. New providers are enabled by setting "provider" to one of the supported names.

**Attributes** (unchanged):
- **provider** (string, required): Now supports "openai", "anthropic", "together-ai", "fireworks-ai", "mistral-ai", "cerebras".
- **model** (string, required): Provider-specific model ID (e.g., "gpt-4o" for OpenAI, "meta-llama/Llama-2-70b-chat-hf" for Together AI).
- **persona** (string, optional): Review persona (e.g., "senior-engineer").
- **customPersonas** (object, optional): Custom prompt personas.

**Relationships**:
- Maps to internal client via provider name; no new storage.

**Example JSON Snippet** (in ai-review-config.json):
```json
{
  "ai": {
    "provider": "together-ai",
    "model": "meta-llama/Llama-2-70b-chat-hf",
    "persona": "senior-engineer"
  },
  "processing": { ... }
}
```
- For other providers: Change "provider" to "fireworks-ai" and update "model" accordingly (e.g., "accounts/fireworks/models/llama-v3p1-405b").
- API keys: Assumed via env vars (e.g., TOGETHER_API_KEY); code loads based on provider.

### 2. ReviewRequest
Internal object for aiReviewService.js, created from config and file inputs.

**Attributes** (minimal changes):
- **fileContent** (string): Code to review.
- **filePath** (string): File path.
- **provider** (string): From config "ai.provider" (e.g., "mistral-ai").
- **model** (string): From config "ai.model".
- **persona** (string): From config "ai.persona".
- **context** (object, optional): Additional info.

**Relationships**:
- Uses config "provider" to route to the correct client.

**Example Object**:
```javascript
{
  fileContent: "// sample code...",
  filePath: "src/index.js",
  provider: "cerebras",
  model: "llama-3.1-8b",
  persona: "senior-engineer"
}
```

### 3. ReviewResponse (New Normalized Output)
Unified structure post-normalization.

**Attributes** (unchanged):
- **suggestions** (array): Improvements with line, severity, description, fix.
- **overallScore** (number): 0-100.
- **summary** (string): Feedback.
- **provider** (string): Source (e.g., "fireworks-ai").

**Relationships**:
- Generated from any provider's response.

**Example Object**:
```javascript
{
  suggestions: [
    {
      line: 42,
      severity: "high",
      description: "Potential security vulnerability",
      fix: "Use parameterized queries"
    }
  ],
  overallScore: 85,
  summary: "Mostly clean; fix security.",
  provider: "together-ai"
}
```

## Schema Updates
- **No Changes**: Existing validator.js accepts new "provider" values; code handles mapping (e.g., baseUrl, SDK).
- **Provider Mapping** (internal, in providers/index.js):
  - "together-ai": Use @together-ai/sdk, baseUrl "https://api.together.xyz/v1".
  - "fireworks-ai": OpenAI SDK, baseUrl "https://api.fireworks.ai/inference/v1".
  - "mistral-ai": @mistralai/mistralai SDK.
  - "cerebras": OpenAI SDK, baseUrl "https://api.cerebras.ai/v1".
- **API Keys**: Loaded from env vars named after provider (e.g., MISTRAL_API_KEY).
- **Validation**: On startup, validate model for selected provider; error if invalid.

## Assumptions & Decisions
- Single active provider per config (as existing); switching via config edit or CLI flag.
- Models hardcoded per provider in code for validation; users set valid ones.
- Env vars for keys: e.g., export TOGETHER_API_KEY=... before running.
- Normalization parses content for all providers.

**Model Complete**: Reuses existing format; code handles new providers. Proceed to contracts.