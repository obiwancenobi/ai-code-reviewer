# AI Code Reviewer

AI-powered code review automation using GitHub Actions, OpenRouter, and Discord notifications.

## Features

- 🤖 **AI-Powered Reviews**: Uses OpenRouter API with multiple model support (GPT-3.5, GPT-4, Claude, Gemini)
- 📝 **Direct PR Comments**: AI comments directly on pull requests with structured feedback
- 🎯 **Actor-Aware Prompts**: Includes developer role context (e.g., "Senior Mobile Engineer") for language-agnostic reviews
- 📦 **Large PR Handling**: Intelligent chunking for PRs with >1000 lines of changes
- 📢 **Discord Notifications**: Real-time notifications for review start and completion
- 🔧 **Dynamic Configuration**: Runtime model and webhook selection via workflow inputs

## Quick Start

### Option 1: Copy Files to Your Repository

Copy these files from this repository to yours:

```
.github/workflows/ai-code-review.yml
scripts/
├── chunk-changes.js
├── comment-pr.js
├── discord-complete.js
├── discord-start.js
└── openrouter-review.js
package.json
```

Then follow the setup steps below.

### Option 2: Use as Reusable Workflow (Recommended)

Use this workflow directly from your repository without copying files:

#### PR-Only Trigger Example

```yaml
# In your .github/workflows/pr-review.yml
name: AI Code Review

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  ai-review:
    uses: your-org/ai-code-reviewer/.github/workflows/ai-code-review.yml@main
    with:
      model: ${{ vars.AI_MODEL || 'anthropic/claude-3-haiku' }}
    secrets:
      openrouter_api_key: ${{ secrets.OPENROUTER_API_KEY }}
      discord_webhook_url: ${{ secrets.DISCORD_WEBHOOK_URL }}
```

#### PR-Only Trigger with Dynamic Actor Example

```yaml
# In your .github/workflows/pr-review.yml
name: AI Code Review

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  ai-review:
    uses: your-org/ai-code-reviewer/.github/workflows/ai-code-review.yml@main
    with:
      model: ${{ vars.AI_MODEL || 'anthropic/claude-3-haiku' }}
      actor_role: ${{ vars.ACTOR_ROLE || 'Senior Software Engineer' }}
    secrets:
      openrouter_api_key: ${{ secrets.OPENROUTER_API_KEY }}
      discord_webhook_url: ${{ secrets.DISCORD_WEBHOOK_URL }}
```

#### Advanced Example with Actor from PR Author

```yaml
# In your .github/workflows/pr-review.yml
name: AI Code Review

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  get-actor:
    runs-on: ubuntu-latest
    outputs:
      actor_role: ${{ steps.get-role.outputs.role }}
    steps:
      - name: Get actor role from repository variables
        id: get-role
        run: |
          # Map GitHub usernames to roles (customize as needed)
          declare -A user_roles=(
            ["john-dev"]="Senior Backend Engineer"
            ["sarah-mobile"]="Senior Mobile Engineer"
            ["alex-frontend"]="Senior Frontend Engineer"
          )
          
          actor="${{ github.actor }}"
          role="${user_roles[$actor]:-Senior Software Engineer}"
          
          echo "role=$role" >> $GITHUB_OUTPUT
          echo "Using role: $role for actor: $actor"

  ai-review:
    needs: get-actor
    uses: your-org/ai-code-reviewer/.github/workflows/ai-code-review.yml@main
    with:
      model: ${{ vars.AI_MODEL || 'anthropic/claude-3-haiku' }}
      actor_role: ${{ needs.get-actor.outputs.actor_role }}
    secrets:
      openrouter_api_key: ${{ secrets.OPENROUTER_API_KEY }}
      discord_webhook_url: ${{ secrets.DISCORD_WEBHOOK_URL }}
```

#### Manual + PR Trigger Example

```yaml
# In your .github/workflows/pr-review.yml
name: AI Code Review

on:
  pull_request:
    types: [opened, synchronize, reopened]
  workflow_dispatch:
    inputs:
      model:
        description: 'AI Model to use'
        required: true
        default: 'anthropic/claude-3-haiku'
        type: choice
        options:
          - anthropic/claude-3-haiku
          - openai/gpt-3.5-turbo
          - openai/gpt-4
          - google/gemini-pro
      discord_webhook:
        description: 'Discord Webhook URL (optional)'
        required: false
      actor_role:
        description: 'Your role/expertise (e.g., Senior Mobile Engineer)'
        required: false
        default: 'Senior Software Engineer'

jobs:
  ai-review:
    uses: your-org/ai-code-reviewer/.github/workflows/ai-code-review.yml@main
    with:
      model: ${{ inputs.model || 'anthropic/claude-3-haiku' }}
      discord_webhook: ${{ inputs.discord_webhook }}
      actor_role: ${{ inputs.actor_role || 'Senior Software Engineer' }}
    secrets:
      openrouter_api_key: ${{ secrets.OPENROUTER_API_KEY }}
      discord_webhook_url: ${{ secrets.DISCORD_WEBHOOK_URL }}
```

**Note**: Replace `your-org/ai-code-reviewer` with the actual repository path (e.g., `octocat/ai-code-reviewer`).

### 3. Configure Repository Secrets

Add these secrets in your repository settings (Settings → Secrets and variables → Actions):

- `OPENROUTER_API_KEY`: Your OpenRouter API key (get from [openrouter.ai](https://openrouter.ai))
- `DISCORD_WEBHOOK_URL`: Default Discord webhook URL (optional, can be overridden)

### 4. Usage

The workflow triggers automatically on:
- Pull request opened
- Pull request synchronized (new commits)
- Pull request reopened

#### Manual Trigger

You can also trigger manually via the Actions tab with custom parameters.

## Configuration Options

### AI Models

Supported models via OpenRouter:
- `anthropic/claude-3-haiku` (default, fast & cost-effective)
- `openai/gpt-3.5-turbo`
- `openai/gpt-4`
- `google/gemini-pro`

### File Filtering & Exclusions

The workflow automatically excludes common build artifacts and dependencies from review:

**Always Excluded:**
- `node_modules/` - NPM dependencies
- `build/`, `dist/`, `out/` - Build outputs
- `.next/`, `.nuxt/`, `.vuepress/` - Framework build directories
- `target/`, `bin/`, `obj/` - Compiled binaries
- `*.min.js`, `*.min.css` - Minified assets
- `package-lock.json`, `yarn.lock` - Lock files
- `.git/` - Git internals
- `*.log`, `*.tmp` - Temporary files

**Language-Specific Exclusions:**
- **Python**: `__pycache__/`, `*.pyc`, `.pytest_cache/`
- **Java**: `target/`, `*.class`, `.gradle/`
- **C/C++**: `cmake-build-*/`, `*.o`, `*.so`
- **Go**: Vendor dependencies in `vendor/`
- **Rust**: `target/`, `Cargo.lock`
- **Mobile**: `android/app/build/`, `ios/build/`, `*.apk`, `*.ipa`

**Custom Exclusions:**
Add repository-specific exclusions via `.ai-review-ignore` file:

```
# .ai-review-ignore
# Add patterns to exclude from AI review
generated/
migrations/
docs/
*.md
```

### Discord Integration

- **Default Webhook**: Set via `DISCORD_WEBHOOK_URL` secret
- **Dynamic Webhook**: Override via workflow input for different channels/projects
- **Notifications**: Blue embed on start, color-coded completion status

### Actor Data

Include your expertise level in prompts:
- `Senior Software Engineer` (default)
- `Senior Mobile Engineer`
- `Senior Backend Engineer`
- `Senior Frontend Engineer`
- `DevOps Engineer`
- Custom roles supported

## How It Works

1. **Trigger**: PR opened/updated or manual dispatch
2. **Notification**: Discord notification sent (blue embed)
3. **Data Collection**: Gather PR changes, actor info, repository context
4. **Chunking**: Split large PRs into manageable pieces (<1000 lines)
5. **AI Review**: Send chunks to OpenRouter with contextual prompts
6. **PR Comments**: Post structured feedback directly on PR
7. **Completion**: Discord notification with results summary

## Architecture

```
PR Event → GitHub Actions → Discord Start → Chunk Analysis → OpenRouter API → PR Comments → Discord Complete
```

## Requirements

- Node.js 18+ (GitHub Actions runner)
- OpenRouter API key
- Discord webhook URL (optional)
- GitHub repository with Actions enabled

## Cost Estimation

Approximate costs per review (based on OpenRouter pricing):
- Claude 3 Haiku: ~$0.001-0.005
- GPT-3.5 Turbo: ~$0.002-0.010
- GPT-4: ~$0.030-0.150
- Gemini Pro: ~$0.001-0.005

Costs scale with PR size and model complexity.

## Troubleshooting

### Common Issues

1. **"OpenRouter API Error"**: Check your `OPENROUTER_API_KEY` secret
2. **"Discord Webhook Failed"**: Verify webhook URL format and permissions
3. **"PR Comment Failed"**: Ensure workflow has `pull-requests: write` permission
4. **"Chunking Timeout"**: Very large PRs may need manual review or model adjustment

### Permissions Required

```yaml
permissions:
  contents: read
  pull-requests: write
  actions: read
```

## Contributing

This is a reusable GitHub Action. To modify for your needs:

1. Fork this repository
2. Update scripts in `scripts/` directory
3. Test with sample PR data
4. Update documentation

## License

MIT License - see LICENSE file for details.
