# Quickstart: Configuring and Using Additional AI Providers

**Date**: 2025-11-10  
**Feature**: 002-add-ai-providers  
**Status**: Complete  

## Overview
This quickstart guides users on setting up and using the new AI providers (Together AI, Fireworks AI, Mistral AI, Cerebras AI) in the AI code reviewer tool. It reuses the existing ai-review-config.json format. Set the "provider" field to the new provider name and "model" to a valid model ID for that provider. API keys are loaded from environment variables. No schema changes or new fields required.

## Prerequisites
- Node.js 18+ installed.
- API keys for desired providers (sign up at provider websites).
- Tool cloned and dependencies installed (`npm install`).
- Config file: Copy `ai-review-config.json.example` to `ai-review-config.json` and edit.

## Step 1: Obtain API Keys
1. **Together AI**: Sign up at [together.ai](https://together.ai), get API key from dashboard.
2. **Fireworks AI**: Register at [fireworks.ai](https://fireworks.ai), generate key in API section.
3. **Mistral AI**: Create account at [mistral.ai](https://mistral.ai), retrieve key from console.
4. **Cerebras AI**: Apply for beta access at [cerebras.ai](https://cerebras.ai), get key upon approval.

Set keys as environment variables (required for security):
```bash
export TOGETHER_API_KEY="your_key_here"
export FIREWORKS_API_KEY="your_key_here"
export MISTRAL_API_KEY="your_key_here"
export CEREBRAS_API_KEY="your_key_here"
```

## Step 2: Update Configuration
Edit `ai-review-config.json` using the existing structure. Change "provider" to the new name and "model" to a supported model for that provider.

**Example for Together AI**:
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

**Examples for Other Providers**:
- **Fireworks AI**: `"provider": "fireworks-ai"`, `"model": "accounts/fireworks/models/llama-v3p1-405b"`
- **Mistral AI**: `"provider": "mistral-ai"`, `"model": "mistral-large-latest"`
- **Cerebras AI**: `"provider": "cerebras-ai"`, `"model": "llama-3.1-8b"`

- Use valid models from provider docs (see research.md).
- The tool maps providers internally (e.g., base URLs, SDKs).
- Validate: Start the tool; it checks model validity for the provider.

## Step 3: Run a Code Review
1. **CLI Mode**: 
   ```bash
   npm start -- --file src/index.js
   ```
   - Uses config "provider" and "model".
   - Override temporarily: Set env var or edit config before run.

2. **GitHub Workflow**: Push to a PR on branch `002-add-ai-providers`. Auto-reviews using config provider.
   - Override in PR comment: `/review --provider mistral-ai` (if CLI flag supported).

3. **Verify**: Logs show "Using provider: together-ai". No auth errors if keys set.

## Step 4: Switching Providers
- Edit config "provider" and "model", then restart/re-run.
- For testing: Use env vars for keys; change config for each test.
- Single config supports one active provider at a time (as existing).

## Troubleshooting
- **Auth Error**: Check env var (e.g., TOGETHER_API_KEY); test with curl.
- **Model Not Found**: Use valid model for provider; see research.md.
- **Rate Limit**: Switch providers via config; tool retries.
- **No Output**: Verify "provider" spelling; check logs.
- **Discord Notifications**: Includes provider in messages if configured.

## Example Workflow
1. Set env vars for keys.
2. Edit config: "provider": "fireworks-ai", "model": "accounts/fireworks/models/llama-v3p1-405b".
3. Run: `npm start -- --file tests/sample.js`.
4. Review output: Suggestions from the model.
5. Switch: Edit to "mistral-ai", "mistral-large-latest", re-run.

**Quickstart Complete**: Reuse existing config; setup in <2 minutes. For details, see spec.md.