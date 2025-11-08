# AI Code Reviewer

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-2088FF?logo=github-actions&logoColor=white)](https://github.com/features/actions)
[![OpenAI](https://img.shields.io/badge/OpenAI-412991?logo=openai&logoColor=white)](https://openai.com/)
[![Anthropic](https://img.shields.io/badge/Anthropic-191919?logo=anthropic&logoColor=white)](https://anthropic.com/)
[![Google AI](https://img.shields.io/badge/Google%20AI-4285F4?logo=google&logoColor=white)](https://ai.google/)
[![DeepSeek](https://img.shields.io/badge/DeepSeek-000000?logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDMTMuMSAyIDE0IDIuOSAxNCA0VjIwQzE0IDIxLjEgMTMuMSAyMiAxMiAyMkg0QzIuOSAyMiAyIDIxLjEgMiAyMFY0QzIgMi45IDIuOSAyIDQgMkgxMkMxMy4xIDIgMTQgMi45IDE0IDRWNFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=)](https://platform.deepseek.com/)
[![xAI](https://img.shields.io/badge/xAI-000000?logo=x&logoColor=white)](https://x.ai/)
[![Groq](https://img.shields.io/badge/Groq-FF6B35?logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDMTMuMSAyIDE0IDIuOSAxNCA0VjIwQzE0IDIxLjEgMTMuMSAyMiAxMiAyMkg0QzIuOSAyMiAyIDIxLjEgMiAyMFY0QzIgMi45IDIuOSAyIDQgMkgxMkMxMy4xIDIgMTQgMi45IDE0IDRWNFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=)](https://groq.com/)
[![Discord](https://img.shields.io/badge/Discord-5865F2?logo=discord&logoColor=white)](https://discord.com/)
[![Jest](https://img.shields.io/badge/Jest-C21325?logo=jest&logoColor=white)](https://jestjs.io/)
[![ESLint](https://img.shields.io/badge/ESLint-4B32C3?logo=eslint&logoColor=white)](https://eslint.org/)
[![Prettier](https://img.shields.io/badge/Prettier-F7B93E?logo=prettier&logoColor=white)](https://prettier.io/)

AI-powered code review automation for GitHub pull requests using configurable AI models and reviewer personas.

## 🚀 Features

- **Multi-Provider AI Support**: OpenAI GPT-4, Anthropic Claude, Google Gemini, DeepSeek, OpenRouter, xAI Grok, Groq, and Z.ai
- **Configurable Reviewer Personas**: Senior Engineer, Security Expert, Performance Specialist, Accessibility Advocate
- **Smart File Processing**: Large file chunking, comprehensive exclusion patterns for all major development stacks
- **Discord Notifications**: Real-time status updates for review start, completion, and errors
- **GitHub Integration**: Seamless PR commenting with inline and general review comments
- **Enterprise Ready**: Secure credential management, rate limiting, comprehensive error handling

## 📋 Prerequisites

- Node.js 18+ LTS
- GitHub repository with Actions enabled
- AI API access (OpenAI, Anthropic, or other supported providers)
- Discord server (optional, for notifications)

## 🛠️ Quick Start

### Option 1: Use in Your Own Repository

1. **Copy workflow files** to your repository:
   ```bash
   # Create directories if they don't exist
   mkdir -p .github/workflows

   # Copy the workflow file
   curl -o .github/workflows/ai-review.yml https://raw.githubusercontent.com/obiwancenobi/ai-code-reviewer/main/.github/workflows/ai-review.yml
   ```

2. **Create configuration file**:
   ```bash
   # Download and customize configuration
   curl -o ai-review-config.json https://raw.githubusercontent.com/obiwancenobi/ai-code-reviewer/main/ai-review-config.json.example

   # Edit with your preferred settings
   nano ai-review-config.json
   ```

3. **Set up GitHub secrets** in your repository settings:
   - `GITHUB_TOKEN` (automatically provided by GitHub Actions)
   - `OPENAI_API_KEY` (or your chosen AI provider's API key)
   - `DISCORD_WEBHOOK_URL` (optional, for notifications)

4. **Commit and push**:
   ```bash
   git add .
   git commit -m "Add AI code review workflow"
   git push
   ```

### Option 2: Fork and Customize

1. **Fork this repository** on GitHub

2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/ai-code-reviewer.git
   cd ai-code-reviewer
   npm install
   ```

3. **Customize configuration** in `ai-review-config.json`

4. **Deploy to your target repository** by copying the workflow and config files

### Option 3: Use as a Template

1. **Use this repository as a template** for new projects

2. **Configure** the AI provider and settings

3. **The workflow will run automatically** on pull requests in the templated repository

## ⚙️ Configuration

### AI Review Configuration (`ai-review-config.json`)

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
      "*.lock",
      "DerivedData/**",
      ".gradle/**",
      "Pods/**",
      "__pycache__/**",
      "*.pyc",
      "target/**",
      "*.class",
      ".next/**",
      ".nuxt/**"
    ]
  },
  "notifications": {
    "discordWebhookUrl": "https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN"
  }
}
```

**Provider-specific examples:**

**Anthropic Claude:**
```json
{
  "ai": {
    "provider": "anthropic",
    "model": "claude-3-sonnet",
    "persona": "security-expert"
  }
}
```

**Google Gemini:**
```json
{
  "ai": {
    "provider": "google",
    "model": "gemini-pro",
    "persona": "performance-specialist"
  }
}
```

**DeepSeek:**
```json
{
  "ai": {
    "provider": "deepseek",
    "model": "deepseek-coder",
    "persona": "senior-engineer"
  }
}
```

### Supported AI Providers

| Provider | Models | Environment Variable | Status |
|----------|--------|---------------------|--------|
| OpenAI | `gpt-4`, `gpt-4-turbo`, `gpt-3.5-turbo` | `OPENAI_API_KEY` | ✅ Production |
| Anthropic | `claude-3-sonnet`, `claude-3-haiku` | `ANTHROPIC_API_KEY` | ✅ Production |
| Google | `gemini-pro`, `gemini-pro-vision` | `GOOGLE_AI_API_KEY` | ✅ Production |
| DeepSeek | `deepseek-chat`, `deepseek-coder` | `DEEPSEEK_API_KEY` | ✅ Production |
| OpenRouter | Custom models | `OPENROUTER_API_KEY` | ✅ Production |
| xAI | `grok-1`, `grok-beta` | `XAI_API_KEY` | ✅ Production |
| Groq | `llama2-70b`, `mixtral-8x7b` | `GROQ_API_KEY` | ✅ Production |
| Z.ai | `z-model-1` | `ZAI_API_KEY` | ✅ Production |

### Reviewer Personas

#### Built-in Personas

- **`senior-engineer`**: General code quality, maintainability, best practices
- **`security-expert`**: Security vulnerabilities, data protection, secure coding
- **`performance-specialist`**: Performance optimization, scalability, efficiency
- **`accessibility-advocate`**: Inclusive design, WCAG compliance, user experience

#### Custom Personas

You can define custom reviewer personas with your own prompts:

```json
{
  "ai": {
    "provider": "openai",
    "model": "gpt-4",
    "persona": "code-reviewer",
    "customPersonas": {
      "code-reviewer": "You are an expert code reviewer focusing on clean code principles, SOLID design, and modern best practices. Pay special attention to naming conventions, function complexity, and code organization.",
      "team-lead": "You are a technical team lead reviewing code for architectural decisions, scalability concerns, and team standards compliance. Focus on long-term maintainability and technical debt.",
      "qa-engineer": "You are a QA engineer reviewing code for testability, error handling, and potential edge cases. Suggest improvements for debugging and monitoring."
    }
  }
}
```

**Custom persona features:**
- Define any persona name you want
- Write custom prompts tailored to your team's needs
- Mix built-in and custom personas in the same configuration
- Prompts can be as specific or general as needed

## 🔧 CLI Usage

```bash
# Validate configuration
node index.js validate --config ai-review-config.json

# Test Discord webhook
node index.js test-discord --webhook-url YOUR_WEBHOOK_URL

# Manual review (for testing)
node index.js review --pr 123 --repo owner/repo
```

## 📁 File Exclusions

The system automatically excludes common build artifacts and dependencies:

### Backend Stacks
- **Python**: `__pycache__/`, `*.pyc`, `venv/`, `.pytest_cache/`
- **Java**: `target/`, `*.class`, `*.jar`, `.gradle/`
- **.NET/C#**: `bin/`, `obj/`, `packages/`
- **Go**: `vendor/`, `*.exe`, `*.test`
- **Rust**: `target/`, `debug/`, `release/`
- **PHP**: `vendor/`, `composer.lock`
- **Ruby**: `.bundle/`, `vendor/bundle/`, `log/`, `tmp/`

### Frontend Stacks
- **React/Next.js**: `.next/`, `out/`, `.cache/`
- **Vue/Nuxt**: `.nuxt/`, `dist/`
- **Angular**: `dist/`, `build/`
- **General**: `node_modules/`, `dist/`, `build/`

### Mobile Stacks
- **iOS**: `DerivedData/`, `xcuserdata/`, `Pods/`, `Carthage/`
- **Android**: `.gradle/`, `build/`, `app/build/`
- **React Native**: `.expo/`, `platforms/`, `plugins/`
- **Flutter**: `.dart_tool/`, `build/`, `android/app/build/`
- **Cordova/Ionic**: `platforms/`, `plugins/`, `www/build/`

## 🎯 How It Works

1. **PR Trigger**: GitHub Actions workflow activates on pull request events
2. **File Analysis**: System identifies changed files, applies exclusion filters
3. **AI Processing**: Code is chunked if needed and sent to configured AI model
4. **Review Generation**: AI analyzes code using specified persona and generates comments
5. **Comment Posting**: Inline and general comments posted to GitHub PR
6. **Notification**: Discord webhook sends status updates (if configured)

## 🔒 Security

- API keys stored securely as GitHub Secrets
- No source code persistence in logs or cache
- Secure webhook validation
- Rate limiting and error handling
- Principle of least privilege for GitHub tokens

## 📊 Performance

- **Processing Time**: <10 minutes for repositories <100MB
- **File Size Limit**: 1MB per file (configurable)
- **Chunking**: Automatic splitting for large files
- **Concurrency**: Parallel file processing with rate limiting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Node.js](https://nodejs.org/)
- Powered by multiple AI providers
- Integrated with [GitHub Actions](https://github.com/features/actions)
- Notifications via [Discord](https://discord.com/)

## 🔄 Using in Other Repositories

This AI code review workflow is designed to be easily deployed to any GitHub repository. Here are the steps to integrate it:

### Automated Setup (Recommended)

1. **Run the setup script** in your target repository:
   ```bash
   # From your target repository root
   curl -fsSL https://raw.githubusercontent.com/obiwancenobi/ai-code-reviewer/main/setup-workflow.sh | bash
   ```

   This script will:
   - Download the latest workflow file
   - Create a basic configuration file
   - Provide instructions for setting up secrets

2. **Configure secrets** in your repository settings as prompted

3. **Customize configuration** (optional):
   ```bash
   # Edit ai-review-config.json to match your needs
   nano ai-review-config.json
   ```

### Manual Setup

1. **Download workflow file**:
   ```bash
   curl -o .github/workflows/ai-review.yml \
     https://raw.githubusercontent.com/obiwancenobi/ai-code-reviewer/main/.github/workflows/ai-review.yml
   ```

2. **Download configuration template**:
   ```bash
   curl -o ai-review-config.json \
     https://raw.githubusercontent.com/obiwancenobi/ai-code-reviewer/main/ai-review-config.json.example
   ```

3. **Set up GitHub secrets** for your AI provider

4. **Commit and deploy**:
   ```bash
   git add .
   git commit -m "feat: add AI code review workflow"
   git push
   ```

### Repository-Specific Configuration

Each repository can have its own configuration:

```json
{
  "ai": {
    "provider": "anthropic",
    "model": "claude-3-sonnet",
    "persona": "security-expert"
  },
  "processing": {
    "excludePatterns": [
      "node_modules/**",
      "build/**",
      "tests/**"
    ]
  }
}
```

### Multi-Repository Deployment

For organizations deploying across multiple repositories:

1. **Create a shared configuration repository**
2. **Use GitHub repository templates** with pre-configured workflows
3. **Set up organization-level secrets** for AI API keys
4. **Use GitHub Actions reusable workflows** for centralized updates

### Updating the Workflow

To update to the latest version across repositories:

```bash
# Update workflow file
curl -o .github/workflows/ai-review.yml \
  https://raw.githubusercontent.com/obiwancenobi/ai-code-reviewer/main/.github/workflows/ai-review.yml

# Check for configuration updates
curl -s https://raw.githubusercontent.com/obiwancenobi/ai-code-reviewer/main/ai-review-config.json.example
```

## 📞 Support

- 📖 [Quick Start Guide](specs/001-ai-code-review/quickstart.md)
- 🐛 [Issues](https://github.com/obiwancenobi/ai-code-reviewer/issues)
- 💬 [Discussions](https://github.com/obiwancenobi/ai-code-reviewer/discussions)
- 📧 [Setup Script](https://raw.githubusercontent.com/obiwancenobi/ai-code-reviewer/main/setup-workflow.sh)
