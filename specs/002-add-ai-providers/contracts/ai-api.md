# AI API Contracts: Multi-Provider Schema

**Date**: 2025-11-10  
**Feature**: 002-add-ai-providers  
**Status**: Complete  

## Overview
This document describes the unified interface for AI provider APIs used in code reviews. All new providers (Together AI, Fireworks AI, Mistral AI, Cerebras AI) conform to an OpenAI-compatible Chat Completions schema where possible, with normalization for differences (e.g., Mistral's official SDK). The contract focuses on the `/v1/chat/completions` endpoint for generating review responses. This extends the existing ai-api.yaml from specs/001-ai-code-review/contracts/ai-api.yaml without modifications to that file; new providers are handled via code mapping (baseUrls, SDKs).

## Common Request Schema (Chat Completion)
All providers use a POST request to `/v1/chat/completions` (or equivalent).

**Path**: `/v1/chat/completions`  
**Method**: POST  
**Headers**:
- `Authorization: Bearer {apiKey}`
- `Content-Type: application/json`

**Request Body** (JSON):
```json
{
  "model": "string",  // e.g., "gpt-4o", "llama-2-70b", required
  "messages": [
    {
      "role": "system|user|assistant",
      "content": "string"  // Prompt for code review
    }
  ],  // Array of 1-10 messages, required
  "max_tokens": 4096,  // Integer, optional (default from config)
  "temperature": 0.7,  // Float 0-2, optional (default from config)
  "top_p": 1.0,  // Float 0-1, optional
  "stream": false,  // Boolean, optional (non-streaming for reviews)
  "response_format": {  // Optional for structured output
    "type": "json_object"
  }
}
```

**Provider-Specific Notes**:
- **Together AI, Fireworks AI, Cerebras AI**: Fully OpenAI-compatible; use baseUrl override in code.
- **Mistral AI**: Compatible via official SDK; supports similar params but no streaming in some models.
- **Validation**: Client validates model against provider-specific lists in code.

## Common Response Schema
Responses are normalized to this schema in aiReviewService.js, regardless of provider.

**Status Code**: 200 OK  
**Response Body** (JSON):
```json
{
  "id": "string",  // Request ID
  "object": "chat.completion",
  "created": 1234567890,  // Unix timestamp
  "model": "string",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "string"  // Raw review text; parsed for suggestions
      },
      "finish_reason": "stop|max_tokens"
    }
  ],
  "usage": {
    "prompt_tokens": 100,
    "completion_tokens": 200,
    "total_tokens": 300
  }
}
```

**Normalization Rules**:
- Extract `choices[0].message.content` and parse for structured review (e.g., using regex/JSON mode for suggestions array).
- Handle errors: 4xx/5xx map to ReviewResponse with error field.
- Provider differences: Mistral may return "text" instead of "content"; Cerebras omits some usage fields.

## Error Handling Contract
**Common Errors**:
- 401 Unauthorized: Invalid API key → Return { error: "Invalid credentials for {provider}" }
- 429 Rate Limit: Too many requests → Retry with exponential backoff
- 500 Internal: Provider downtime → Fallback to default provider

**Response Format** (Error):
```json
{
  "error": {
    "message": "string",
    "type": "invalid_request|rate_limit|server_error",
    "param": "string|null",
    "code": "string|null"
  }
}
```

## Integration with Existing Contracts
- **ai-api.yaml** (from specs/001-ai-code-review/contracts/): No changes; new providers handled in src/providers/index.js via extensions (e.g., baseUrls, SDK cases).
- **github-api.yaml**: No changes; reviews post to GitHub via existing client.
- **Enforcement**: src/config/validator.js checks requests; code routes based on provider.

**Contract Complete**: Describes extensions to existing YAML contract. Proceed to quickstart.