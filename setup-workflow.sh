#!/bin/bash

# AI Code Reviewer Workflow Setup Script
# This script helps deploy the AI code review workflow to any GitHub repository

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="https://raw.githubusercontent.com/obiwancenobi/ai-code-reviewer/main"
WORKFLOW_DIR=".github/workflows"
CONFIG_FILE="ai-review-config.json"

echo -e "${BLUE}🤖 AI Code Reviewer Workflow Setup${NC}"
echo "====================================="
echo

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Not in a Git repository${NC}"
    echo "Please run this script from the root of your Git repository"
    exit 1
fi

# Check if .github/workflows directory exists
if [ ! -d "$WORKFLOW_DIR" ]; then
    echo -e "${YELLOW}📁 Creating workflows directory...${NC}"
    mkdir -p "$WORKFLOW_DIR"
fi

# Download workflow file
echo -e "${BLUE}📥 Downloading workflow file...${NC}"
if curl -s -o "$WORKFLOW_DIR/ai-review.yml" "$REPO_URL/.github/workflows/ai-review.yml"; then
    echo -e "${GREEN}✅ Workflow file downloaded successfully${NC}"
else
    echo -e "${RED}❌ Failed to download workflow file${NC}"
    exit 1
fi

# Create example workflow using GitHub Action
echo -e "${BLUE}📝 Creating example GitHub Action workflow...${NC}"
cat > "$WORKFLOW_DIR/ai-review-action.yml" << 'EOF'
name: AI Code Review (Action)

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  ai-review:
    runs-on: ubuntu-latest
    if: github.event.pull_request.draft == false

    steps:
      - name: AI Code Review
        uses: obiwancenobi/ai-code-reviewer@v1
        with:
          pr-number: ${{ github.event.pull_request.number }}
          repository: ${{ github.repository }}
          ai-provider: ${{ vars.AI_PROVIDER || 'openai' }}
          ai-model: ${{ vars.AI_MODEL || 'gpt-4' }}
          ai-persona: ${{ vars.AI_PERSONA || 'senior-engineer' }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          DISCORD_WEBHOOK_URL: ${{ secrets.DISCORD_WEBHOOK_URL }}
EOF
echo -e "${GREEN}✅ Example GitHub Action workflow created${NC}"

# Create example workflow for reusable approach
echo -e "${BLUE}📝 Creating example reusable workflow...${NC}"
cat > "$WORKFLOW_DIR/ai-review-reusable.yml" << 'EOF'
name: AI Code Review (Reusable)

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  ai-review:
    uses: obiwancenobi/ai-code-reviewer/.github/workflows/ai-review.yml@main
    with:
      pr-number: ${{ github.event.pull_request.number }}
      repository: ${{ github.repository }}
      ai-provider: ${{ vars.AI_PROVIDER || 'openai' }}
      ai-model: ${{ vars.AI_MODEL || 'gpt-4' }}
      ai-persona: ${{ vars.AI_PERSONA || 'senior-engineer' }}
    secrets:
      github-token: ${{ secrets.GITHUB_TOKEN }}
      openai-api-key: ${{ secrets.OPENAI_API_KEY }}
      anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
      discord-webhook-url: ${{ secrets.DISCORD_WEBHOOK_URL }}
EOF
echo -e "${GREEN}✅ Example reusable workflow created${NC}"

# Download configuration template
echo -e "${BLUE}📥 Downloading configuration template...${NC}"
if curl -s -o "${CONFIG_FILE}.example" "$REPO_URL/ai-review-config.json.example" 2>/dev/null || \
   curl -s -o "${CONFIG_FILE}.example" "$REPO_URL/ai-review-config.json"; then
    echo -e "${GREEN}✅ Configuration template downloaded${NC}"

    # Create default configuration if it doesn't exist
    if [ ! -f "$CONFIG_FILE" ]; then
        cp "${CONFIG_FILE}.example" "$CONFIG_FILE"
        echo -e "${GREEN}✅ Default configuration created${NC}"
    else
        echo -e "${YELLOW}⚠️  Configuration file already exists, skipping${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Could not download configuration template${NC}"
fi

echo
echo -e "${GREEN}🎉 Setup complete!${NC}"
echo
echo -e "${BLUE}Available workflow options:${NC}"
echo "1. GitHub Action: $WORKFLOW_DIR/ai-review-action.yml (recommended - works with any tech stack)"
echo "2. Reusable workflow: $WORKFLOW_DIR/ai-review-reusable.yml (advanced users)"
echo "3. Standard workflow: $WORKFLOW_DIR/ai-review.yml (requires Node.js setup)"
echo
echo -e "${BLUE}Next steps:${NC}"
echo "1. Choose your workflow approach:"
echo "   - For any tech stack: use ai-review-action.yml (recommended)"
echo "   - For advanced control: use ai-review-reusable.yml"
echo "   - For Node.js projects: use ai-review.yml"
echo "2. Edit $CONFIG_FILE to configure your AI provider and settings"
echo "3. Set up GitHub repository secrets:"
echo "   - GITHUB_TOKEN (automatically provided)"
echo "   - OPENAI_API_KEY (or your chosen AI provider's key)"
echo "   - DISCORD_WEBHOOK_URL (optional, for notifications)"
echo "4. Commit and push the changes:"
echo "   git add ."
echo "   git commit -m 'feat: add AI code review workflow'"
echo "   git push"
echo
echo -e "${BLUE}For detailed instructions, visit:${NC}"
echo "https://github.com/obiwancenobi/ai-code-reviewer#readme"
echo
echo -e "${YELLOW}Need help? Check the troubleshooting section in the README${NC}"