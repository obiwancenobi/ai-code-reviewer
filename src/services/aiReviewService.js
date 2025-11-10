/**
 * AI code review service for processing pull requests
 */

const AIProvider = require('../providers/index');
const fileProcessor = require('../utils/fileProcessor');
const logger = require('../utils/logger');
const errorHandler = require('../utils/errorHandler');

class AIReviewService {
  constructor(config) {
    this.config = config;
    this.aiProvider = new AIProvider(config.ai.provider, config.ai);
    logger.info(`Initialized AIReviewService with provider: ${this.config.ai.provider}, model: ${this.config.ai.model}`);
  }

  /**
   * Process a pull request for AI code review
   * @param {Array} files - Array of files changed in PR
   * @param {Object} prDetails - Pull request details
   * @returns {Promise<Array>} - Array of review comments
   */
  async reviewPullRequest(files, prDetails) {
    logger.info(`Starting AI review for PR #${prDetails.number} with ${files.length} files`);

    const reviewResults = {
      comments: [],
      processedFiles: 0,
      skippedFiles: 0,
      errors: []
    };

    // Filter and validate files
    const validFiles = await this.filterValidFiles(files);

    if (validFiles.length === 0) {
      logger.warn('No valid files found for review');
      return reviewResults;
    }

    logger.info(`Processing ${validFiles.length} valid files out of ${files.length} total files`);

    // Process files in parallel with concurrency control
    const concurrencyLimit = 3;
    const chunks = this.chunkArray(validFiles, concurrencyLimit);

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(file => this.reviewFile(file, prDetails));
      const chunkResults = await Promise.allSettled(chunkPromises);

      // Process results
      for (const result of chunkResults) {
        if (result.status === 'fulfilled') {
          const fileResult = result.value;
          reviewResults.comments.push(...fileResult.comments);
          reviewResults.processedFiles++;
        } else {
          logger.error('File review failed:', result.reason);
          reviewResults.errors.push(result.reason.message);
        }
      }
    }

    logger.info(`AI review completed: ${reviewResults.processedFiles} files processed, ${reviewResults.comments.length} comments generated`);
    return reviewResults;
  }

  /**
   * Filter and validate files for review
   * @param {Array} files - Array of files from PR
   * @returns {Promise<Array>} - Array of valid files
   */
  async filterValidFiles(files) {
    const validFiles = [];

    for (const file of files) {
      // Skip files that match exclusion patterns
      if (fileProcessor.shouldExcludeFile(file.filename, this.config.processing.excludePatterns)) {
        logger.debug(`Skipping excluded file: ${file.filename}`);
        continue;
      } else {
        logger.info('accepted file', file.filename);
      }

      // For GitHub Actions, files come from PR API and may not exist locally
      // Skip file existence validation for PR files
      const validation = {
        isValid: true,
        fileInfo: {
          size: file.size || 0,
          language: fileProcessor.detectLanguage(file.filename)
        }
      };

      // Check file size limit if available
      if (this.config.processing?.maxFileSize && file.size > this.config.processing.maxFileSize) {
        logger.debug(`Skipping large file ${file.filename}: ${file.size} bytes`);
        continue;
      }

      if (validation.isValid) {
        validFiles.push({
          ...file,
          size: validation.fileInfo.size,
          language: validation.fileInfo.language
        });
      } else {
        logger.debug(`Skipping invalid file ${file.filename}: ${validation.reason}`);
      }
    }

    return validFiles;
  }

  /**
   * Review a single file
   * @param {Object} file - File object from PR
   * @param {Object} prDetails - Pull request details
   * @returns {Promise<Object>} - Review results for the file
   */
  async reviewFile(file, prDetails) {
    const result = {
      file: file.filename,
      comments: []
    };

    try {
      logger.debug(`Reviewing file: ${file.filename}`);

      // Get file content (for added/modified files)
      let content = '';
      if (file.status !== 'removed') {
        try {
          // In a real implementation, this would get content from GitHub API
          // For now, we'll use patch content or skip
          content = file.patch || '';
        } catch (error) {
          logger.warn(`Could not get content for ${file.filename}:`, error.message);
        }
      }

      if (!content.trim()) {
        logger.debug(`No content available for ${file.filename}, skipping`);
        return result;
      }

      // Split large files into chunks
      const chunks = fileProcessor.splitIntoChunks(content, this.config.processing.chunkSize);

      // Review each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkComments = await this.reviewCodeChunk(chunk, file, prDetails, i, chunks.length);

        // Adjust line numbers for chunked content
        const adjustedComments = chunkComments.map(comment => ({
          ...comment,
          line_number: comment.line_number ? comment.line_number + (i * Math.floor(content.split('\n').length / chunks.length)) : null
        }));

        result.comments.push(...adjustedComments);
      }

    } catch (error) {
      logger.error(`Failed to review file ${file.filename}:`, error.message);
      throw error;
    }

    return result;
  }

  /**
   * Review a chunk of code
   * @param {string} code - Code chunk to review
   * @param {Object} file - File information
   * @param {Object} prDetails - PR details
   * @param {number} chunkIndex - Index of this chunk
   * @param {number} totalChunks - Total number of chunks
   * @returns {Promise<Array>} - Array of review comments
   */
  async reviewCodeChunk(code, file, prDetails, chunkIndex, totalChunks) {
    logger.info(`Routing review for ${file.filename} to ${this.aiProvider.provider} with model ${this.config.ai.model}`);
    const context = `File: ${file.filename}
Status: ${file.status}
Changes: +${file.additions} -${file.deletions}
Chunk: ${chunkIndex + 1}/${totalChunks}`;

    const comments = await this.aiProvider.reviewCode(
      code,
      file.language,
      this.config.ai.persona,
      context
    );

    // Convert AI comments to GitHub review format
    return comments
      .filter(comment => comment.line_number && comment.line_number > 0) // Filter out invalid line numbers
      .map(comment => ({
        path: file.filename,
        line: comment.line_number,
        body: this.formatCommentBody(comment),
        commitId: prDetails.head?.sha, // Will be overridden by GitHubClient
        severity: comment.severity,
        type: comment.type
      }));
  }

  /**
   * Format comment body for GitHub
   * @param {Object} comment - AI comment object
   * @returns {string} - Formatted comment body
   */
  formatCommentBody(comment) {
    // Handle undefined/null severity
    const severity = comment.severity || 'INFO';
    let body = `**${severity.toUpperCase()}:** ${comment.content}`;

    if (comment.suggestion) {
      body += `\n\n**Suggestion:** ${comment.suggestion}`;
    }

    // Add AI reviewer attribution with model info
    const aiModel = `${this.config.ai.provider}|${this.config.ai.model}`;
    body += `\n\n*Reviewed by 🤖 (${this.config.ai.persona}) using ${aiModel}*`;

    return body;
  }

  /**
   * Split array into chunks for parallel processing
   * @param {Array} array - Array to split
   * @param {number} size - Size of each chunk
   * @returns {Array} - Array of chunks
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

module.exports = AIReviewService;