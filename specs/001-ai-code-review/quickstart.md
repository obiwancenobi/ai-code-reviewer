# Quick Start: AI Code Review Workflow

## Overview

This guide helps you set up and configure the AI-powered code review workflow for your Node.js repository. The workflow automatically reviews pull requests using configurable AI models and posts review comments.

## Prerequisites

- Node.js 18+ installed
- GitHub repository with Actions enabled
- AI API access (OpenAI or Anthropic)
- Discord server (optional, for notifications - can be disabled)

## Installation

1. **Clone or download the workflow files** to your repository:
   ```bash
   # Copy the workflow file to your repository
   cp ai-code-review-workflow.yml .github/workflows/
   ```

2. **Install dependencies** (if building from source):
   ```bash
   npm install @octokit/rest openai anthropic discord.js
   ```

## Configuration

### 1. Create Configuration File

Create `ai-review-config.json` in your repository root:

```json
{
  "ai": {
    "provider": "openai",
    "model": "gpt-4",
    "persona": "senior-engineer"
  },
  "processing": {
    "maxFileSize": 1048576,
    "chunkSize": 50000,
    "excludePatterns": [
      "node_modules/**",
      "build/**",
      "dist/**",
      "*.min.js",
      "*.lock"
    ]
  },
  "notifications": {
    "discordWebhookUrl": "https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN"
  }
```

To disable Discord notifications, omit the `notifications` section or set `discordWebhookUrl` to an empty string.
}
```

### 2. Set Up GitHub Secrets

In your repository settings, add these secrets:

- `GITHUB_TOKEN`: (automatically provided by GitHub Actions)
- `OPENAI_API_KEY`: Your OpenAI API key
- `ANTHROPIC_API_KEY`: Your Anthropic API key (if using Claude)
- `GOOGLE_AI_API_KEY`: Your Google AI API key (if using Gemini)
- `DEEPSEEK_API_KEY`: Your DeepSeek API key (if using DeepSeek)
- `OPENROUTER_API_KEY`: Your OpenRouter API key (if using OpenRouter)
- `XAI_API_KEY`: Your xAI API key (if using xAI)
- `GROQ_API_KEY`: Your Groq API key (if using Groq)
- `ZAI_API_KEY`: Your Z.ai API key (if using Z.ai)
- `DISCORD_WEBHOOK_URL`: Your Discord webhook URL

### 3. Configure Workflow Triggers

The workflow automatically triggers on pull request events. You can customize triggers in `.github/workflows/ai-code-review.yml`:

```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened]
    paths-ignore:
      - 'docs/**'
      - '*.md'
```

## Usage

### Basic Usage

1. **Create a pull request** with code changes
2. **Workflow automatically starts** and posts a Discord notification
3. **AI reviews your code** and posts comments on the PR
4. **Review completes** with success/failure notification

### Customizing AI Behavior

#### Changing AI Provider and Model
```json
{
  "ai": {
    "provider": "anthropic",
    "model": "claude-3-sonnet"
  }
}
```

Supported providers and models:
- **OpenAI**: `gpt-4`, `gpt-4-turbo`, `gpt-3.5-turbo`
- **Anthropic**: `claude-3-sonnet`, `claude-3-haiku`
- **Google**: `gemini-pro`, `gemini-pro-vision`
- **DeepSeek**: `deepseek-chat`, `deepseek-coder`
- **OpenRouter**: `openrouter-model` (specify full model name)
- **xAI**: `grok-1`, `grok-beta`
- **Groq**: `llama2-70b`, `mixtral-8x7b`
- **Z.ai**: `z-model-1`

#### Adjusting Reviewer Persona
```json
{
  "ai": {
    "persona": "security-expert"
  }
}
```

Available personas:
- `senior-engineer`: General code quality and best practices
- `security-expert`: Security vulnerabilities and risks
- `performance-specialist`: Performance optimizations
- `accessibility-advocate`: Accessibility compliance

### File Exclusion

Add patterns to exclude files from review:

```json
{
  "processing": {
    "excludePatterns": [
      "node_modules/**",
      "build/**",
      "dist/**",
      "*.min.js",
      "*.test.js",
      "coverage/**"
    ]
  }
}
```

## Troubleshooting

### Common Issues

#### Workflow doesn't start
- Check that `.github/workflows/` directory exists
- Verify workflow file syntax with GitHub's workflow validator
- Ensure PR triggers match your configuration

#### AI API errors
- Verify API keys are set correctly in repository secrets
- Check API rate limits and billing status
- Ensure correct model names for your provider

#### No comments posted
- Check GitHub token permissions
- Verify PR is not from a fork (requires different token setup)
- Review workflow logs for error messages

#### Large files not processed
- Files over `maxFileSize` are skipped
- Increase limit or exclude large files
- Check chunking configuration

### Debug Mode

Enable debug logging by setting the secret `DEBUG=ai-review:*`

### Manual Testing

Test the workflow locally:

```bash
# Install dependencies
npm install

# Set environment variables
export GITHUB_TOKEN=your_token
export OPENAI_API_KEY=your_key

# Run review on a test file
node index.js review --file src/example.js --pr 123
```

## Advanced Configuration

### Custom Review Prompts

Create custom prompts for specific personas by extending the configuration:

```json
{
  "ai": {
    "customPrompts": {
      "team-lead": "Review code as a technical lead focusing on architecture and maintainability..."
    }
  }
}
```

### Integration with Other Tools

The workflow can be extended to integrate with:
- Code quality tools (ESLint, Prettier)
- Security scanners (SonarQube, Snyk)
- Performance monitoring
- Deployment pipelines

### Monitoring and Analytics

Track review metrics by parsing workflow logs or setting up external monitoring for:
- Review completion times
- Comment quality scores
- False positive rates
- Developer satisfaction

## Support

For issues and questions:
- Check workflow logs in GitHub Actions tab
- Review the troubleshooting section above
- Create an issue in the workflow repository
- Join our Discord community for real-time help