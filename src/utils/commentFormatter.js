/**
 * Comment formatting utilities for AI review comments
 */

class CommentFormatter {
  constructor() {
    this.severityEmojis = {
      error: '🚨',
      warning: '⚠️',
      info: 'ℹ️'
    };

    this.severityLabels = {
      error: 'ERROR',
      warning: 'WARNING',
      info: 'INFO'
    };
  }

  /**
   * Format a review comment for GitHub
   * @param {Object} comment - AI-generated comment
   * @param {Object} config - Review configuration
   * @returns {string} - Formatted comment body
   */
  formatComment(comment, config = {}) {
    const severity = comment.severity || 'info';
    const emoji = this.severityEmojis[severity] || 'ℹ️';
    const label = this.severityLabels[severity] || 'INFO';

    let body = `**${emoji} ${label}:** ${this.escapeMarkdown(comment.content)}`;

    // Add suggestion if provided
    if (comment.suggestion) {
      body += `\n\n**💡 Suggestion:** ${this.escapeMarkdown(comment.suggestion)}`;
    }

    // Add code example if provided
    if (comment.codeExample) {
      body += `\n\n**🔧 Example:**\n\`\`\`\n${comment.codeExample}\n\`\`\``;
    }

    // Add references if provided
    if (comment.references && comment.references.length > 0) {
      body += `\n\n**📚 References:**\n`;
      comment.references.forEach(ref => {
        body += `- ${this.escapeMarkdown(ref)}\n`;
      });
    }

    // Add AI reviewer attribution
    const persona = config.ai?.persona || 'senior-engineer';
    const provider = config.ai?.provider || 'ai';
    const model = config.ai?.model || '-';
    body += `\n\n---\n*Reviewed by 🦫 (${persona}) using ${provider} | ${model}*`;

    return body;
  }

  /**
   * Format multiple comments into a single review
   * @param {Array} comments - Array of comments
   * @param {Object} config - Review configuration
   * @returns {string} - Formatted review body
   */
  formatReviewSummary(comments, config = {}) {
    if (!comments || comments.length === 0) {
      return '✅ **AI Review Complete:** No issues found in the changed code.';
    }

    const severityCounts = this.countSeverities(comments);
    const provider = config.ai?.provider || 'AI';
    const persona = config.ai?.persona || 'senior-engineer';

    let body = `## 🦫 BugBeaver Code Review Summary\n\n`;
    body += `**Provider:** ${provider} | **Reviewer:** ${persona}\n\n`;

    // Summary statistics
    body += `### 📊 Summary\n\n`;
    body += `| Severity | Count |\n`;
    body += `|----------|-------|\n`;
    Object.entries(severityCounts).forEach(([severity, count]) => {
      const emoji = this.severityEmojis[severity] || 'ℹ️';
      const label = this.severityLabels[severity] || severity.toUpperCase();
      body += `| ${emoji} ${label} | ${count} |\n`;
    });
    body += `\n**Total Comments:** ${comments.length}\n\n`;

    // Group comments by severity
    ['error', 'warning', 'info'].forEach(severity => {
      const severityComments = comments.filter(c => c.severity === severity);
      if (severityComments.length > 0) {
        const emoji = this.severityEmojis[severity] || 'ℹ️';
        const label = this.severityLabels[severity] || severity.toUpperCase();
        body += `### ${emoji} ${label} Issues\n\n`;

        severityComments.forEach((comment, index) => {
          body += `**${index + 1}.** ${this.escapeMarkdown(comment.content)}\n`;

          if (comment.filePath && comment.lineNumber) {
            body += `   - *${comment.filePath}:${comment.lineNumber}*\n`;
          }

          if (comment.suggestion) {
            body += `   - **Suggestion:** ${this.escapeMarkdown(comment.suggestion)}\n`;
          }

          body += `\n`;
        });
      }
    });

    body += `---\n*Review completed automatically by BugBeaver*`;

    return body;
  }

  /**
   * Count comments by severity
   * @param {Array} comments - Array of comments
   * @returns {Object} - Severity counts
   */
  countSeverities(comments) {
    const counts = { error: 0, warning: 0, info: 0 };

    comments.forEach(comment => {
      const severity = comment.severity || 'info';
      if (counts[severity] !== undefined) {
        counts[severity]++;
      } else {
        counts.info++; // Default to info for unknown severities
      }
    });

    return counts;
  }

  /**
   * Escape markdown special characters
   * @param {string} text - Text to escape
   * @returns {string} - Escaped text
   */
  escapeMarkdown(text) {
    if (!text) return '';

    return text
      .replace(/\*/g, '\\*')
      .replace(/_/g, '\\_')
      .replace(/`/g, '\\`')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/~/g, '\\~')
      .replace(/>/g, '\\>')
      .replace(/#/g, '\\#')
      .replace(/\+/g, '\\+')
      .replace(/-/g, '\\-')
      .replace(/=/g, '\\=')
      .replace(/\|/g, '\\|')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      .replace(/\./g, '\\.')
      .replace(/\!/g, '\\!');
  }

  /**
   * Truncate comment if too long for GitHub
   * @param {string} comment - Comment body
   * @param {number} maxLength - Maximum length
   * @returns {string} - Truncated comment
   */
  truncateComment(comment, maxLength = 65536) { // GitHub's limit
    if (comment.length <= maxLength) {
      return comment;
    }

    const truncated = comment.substring(0, maxLength - 100);
    return truncated + '\n\n[...]\n\n*Comment truncated due to length*';
  }

  /**
   * Format inline comment for GitHub review
   * @param {Object} comment - Comment object
   * @param {Object} config - Configuration
   * @returns {Object} - GitHub review comment format
   */
  formatInlineComment(comment, config = {}) {
    return {
      path: comment.path,
      line: comment.line_number,
      body: this.truncateComment(this.formatComment(comment, config)),
      side: 'RIGHT'
    };
  }

  /**
   * Format general comment for GitHub issue
   * @param {Object} comment - Comment object
   * @param {Object} config - Configuration
   * @returns {string} - Formatted comment body
   */
  formatGeneralComment(comment, config = {}) {
    return this.truncateComment(this.formatComment(comment, config));
  }
}

module.exports = CommentFormatter;