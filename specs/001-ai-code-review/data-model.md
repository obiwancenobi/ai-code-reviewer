# Data Model: AI Code Review Workflow

## Entities

### ReviewConfiguration
**Purpose**: Stores configuration settings for AI code review workflows
**Fields**:
- `aiProvider`: String (enum: "openai", "anthropic") - AI model provider
- `aiModel`: String - Specific model name (e.g., "gpt-4", "claude-3-sonnet")
- `reviewerPersona`: String - Persona for AI reviewer (e.g., "senior-engineer", "security-expert")
- `maxFileSize`: Number - Maximum file size in bytes for processing
- `chunkSize`: Number - Size of code chunks for large file processing
- `exclusionPatterns`: Array<String> - Glob patterns for files to exclude
- `discordWebhookUrl`: String (optional) - Discord webhook URL for notifications
- `githubToken`: String - GitHub API token (handled securely)
- `aiApiKey`: String - AI provider API key (handled securely)

**Validation Rules**:
- `aiProvider` must be valid enum value
- `maxFileSize` must be positive integer
- `chunkSize` must be positive integer
- `exclusionPatterns` must be valid glob patterns
- `discordWebhookUrl` must be valid URL format
- All secure fields must be provided via environment variables

### PullRequestReview
**Purpose**: Represents a code review session for a pull request
**Fields**:
- `prNumber`: Number - GitHub pull request number
- `repository`: String - Repository full name (owner/repo)
- `branch`: String - Branch name being reviewed
- `commitSha`: String - Commit SHA being reviewed
- `status`: String (enum: "pending", "processing", "completed", "failed") - Review status
- `startedAt`: DateTime - When review started
- `completedAt`: DateTime - When review completed
- `filesProcessed`: Number - Count of files reviewed
- `commentsPosted`: Number - Count of review comments posted
- `errors`: Array<String> - Any errors encountered

**Relationships**:
- Has many `FileReview`
- Belongs to `ReviewConfiguration`

**State Transitions**:
- `pending` → `processing` (when workflow starts)
- `processing` → `completed` (when all files processed successfully)
- `processing` → `failed` (when critical error occurs)

### FileReview
**Purpose**: Represents review of a single file
**Fields**:
- `filePath`: String - Path to the file being reviewed
- `fileSize`: Number - Size of file in bytes
- `language`: String - Programming language detected
- `chunks`: Number - Number of chunks if file was split
- `status`: String (enum: "pending", "processing", "completed", "skipped", "failed")
- `reviewComments`: Array<Object> - AI-generated review comments
- `processingTime`: Number - Time spent processing in milliseconds
- `error`: String - Error message if failed

**Relationships**:
- Belongs to `PullRequestReview`

**Validation Rules**:
- `filePath` must be valid relative path
- `fileSize` must match actual file size
- `reviewComments` must contain valid comment objects with line numbers and content

### ReviewComment
**Purpose**: Represents an individual AI-generated review comment
**Fields**:
- `lineNumber`: Number - Line number in file (null for general comments)
- `commentType`: String (enum: "inline", "general") - Type of comment
- `severity`: String (enum: "info", "warning", "error") - Severity level
- `content`: String - The review comment text
- `suggestion`: String - Optional code improvement suggestion
- `posted`: Boolean - Whether comment was posted to GitHub

**Relationships**:
- Belongs to `FileReview`

**Validation Rules**:
- `content` must not be empty
- `lineNumber` required for inline comments
- `severity` must be valid enum value

## Data Flow

1. **Configuration Load**: ReviewConfiguration loaded from config file and environment variables
2. **PR Detection**: PullRequestReview created when workflow triggers on PR event
3. **File Analysis**: Files in PR analyzed, FileReview entities created for each reviewable file
4. **AI Processing**: Each FileReview processed, ReviewComment entities generated
5. **Comment Posting**: ReviewComment entities posted to GitHub API
6. **Status Update**: PullRequestReview status updated to completed

## Storage Strategy

- **Configuration**: JSON file with environment variable substitution
- **Runtime Data**: In-memory processing, no persistent storage required
- **Logs**: Structured logging to stdout/stderr for GitHub Actions
- **Cache**: Optional file-based cache for AI responses (content-addressable)

## Security Considerations

- All sensitive data (API keys, tokens) handled via environment variables only
- No source code stored persistently
- AI responses cached temporarily in memory only
- GitHub tokens scoped to minimum required permissions
- Discord webhooks validated for correct format