/**
 * AI code review service for processing pull requests
 */

const AIProvider = require('../providers/index');
const fileProcessor = require('../utils/fileProcessor');
const fileChunker = require('../utils/fileChunker');
const patchParser = require('../utils/patchParser');
const logger = require('../utils/logger');
const errorHandler = require('../utils/errorHandler');
const CommentFormatter = require('../utils/commentFormatter');

class AIReviewService {
  constructor(config) {
    this.config = config;
    this.aiProvider = new AIProvider(config.ai.provider, config.ai);
    this.commentFormatter = new CommentFormatter();
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

      // Initialize patch parser and file chunker
      const parser = new patchParser();
      const chunker = new fileChunker(this.config);

      // Get file content (for added/modified files)
      let content = '';
      let isPatchContent = false;
      
      if (file.status !== 'removed') {
        try {
          // Check if we have patch content vs full content
          if (file.patch && file.patch.trim()) {
            content = file.patch;
            isPatchContent = true;
            logger.debug(`Using patch content for ${file.filename}`);
          } else {
            // Fallback to full content if available
            content = file.content || '';
            isPatchContent = false;
            if (content) {
              logger.debug(`Using full content for ${file.filename}`);
            }
          }
        } catch (error) {
          logger.warn(`Could not get content for ${file.filename}:`, error.message);
        }
      }

      if (!content.trim()) {
        logger.debug(`No content available for ${file.filename}, skipping`);
        return result;
      }

      let processedContent = content;
      let originalLineCount = 0;

      if (isPatchContent) {
        // Parse patch content and extract reviewable content
        const parsedPatch = parser.parsePatch(content);
        
        if (!parsedPatch.hasContent || parsedPatch.hunks.length === 0) {
          logger.debug(`Invalid patch content for ${file.filename}, skipping`);
          return result;
        }

        // Extract meaningful content for AI review
        processedContent = parser.extractReviewContent(parsedPatch, {
          includeContext: true,
          maxLines: 1000
        });

        originalLineCount = parsedPatch.originalLineCount;

        logger.debug(`Parsed patch for ${file.filename}: ${parsedPatch.hunks.length} hunks, ${originalLineCount} original lines`);

        // Split into chunks using FileChunker with line tracking
        const chunks = chunker.chunkFile(processedContent, {
          maxChunkSize: this.config.processing.chunkSize,
          overlap: 1000
        });

        // Review each chunk
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const chunkComments = await this.reviewCodeChunk(chunk.content, file, prDetails, i, chunks.length);

          // Use FileChunker's line number adjustment
          const adjustedComments = chunker.adjustCommentLineNumbers(
            chunkComments,
            chunk,
            originalLineCount
          );

          // For patch content, map line numbers from patch to original file
          const mappedComments = adjustedComments.map(comment => {
            if (comment.line_number && parsedPatch) {
              const originalLineNumber = parser.mapPatchLineToOriginalFile(comment.line_number, parsedPatch);
              if (originalLineNumber) {
                return {
                  ...comment,
                  line_number: originalLineNumber
                };
              }
            }
            return comment;
          });

          result.comments.push(...mappedComments);
        }

      } else {
        // Handle full file content using FileChunker
        originalLineCount = content.split('\n').length;

        const chunks = chunker.chunkFile(content, {
          maxChunkSize: this.config.processing.chunkSize,
          overlap: 1000
        });

        // Review each chunk
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const chunkComments = await this.reviewCodeChunk(chunk.content, file, prDetails, i, chunks.length);

          // Use FileChunker's line number adjustment
          const adjustedComments = chunker.adjustCommentLineNumbers(
            chunkComments,
            chunk,
            originalLineCount
          );

          result.comments.push(...adjustedComments);
        }
      }

      logger.debug(`File ${file.filename}: ${result.comments.length} comments generated`);

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
    
    // Enhanced context including chunk metadata
    const context = `File: ${file.filename}
Status: ${file.status}
Changes: +${file.additions} -${file.deletions}
Language: ${file.language}
Chunk: ${chunkIndex + 1}/${totalChunks}
Lines: ${code.split('\n').length}`;

    const comments = await this.aiProvider.reviewCode(
      code,
      file.language,
      this.config.ai.persona,
      context
    );

    // Convert AI comments to GitHub review format with enhanced validation
    return comments
      .filter(comment => {
        // Enhanced validation for line numbers
        if (!comment.line_number || comment.line_number <= 0) {
          logger.debug(`Filtering out comment with invalid line number: ${comment.line_number}`);
          return false;
        }
        
        // Validate line number against chunk content
        const lineCount = code.split('\n').length;
        if (comment.line_number > lineCount) {
          logger.warn(`Comment line number ${comment.line_number} exceeds chunk lines ${lineCount} for ${file.filename}`);
          return false;
        }
        
        return true;
      })
      .map(comment => {
        // Validate line number before creating comment
        const validatedLine = this.validateCommentLineNumber(comment.line_number, file);
        
        return {
          path: file.filename,
          line: validatedLine,
          body: this.formatCommentBody(comment),
          commitId: prDetails.head?.sha,
          severity: comment.severity,
          type: comment.type,
          originalLineNumber: comment.line_number // Keep original for debugging
        };
      })
      .filter(comment => comment.line !== null); // Remove comments that failed validation
  }

  /**
   * Validate comment line number against file boundaries
   * @param {number} lineNumber - Proposed line number
   * @param {Object} file - File information
   * @returns {number|null} - Validated line number or null if invalid
   */
  validateCommentLineNumber(lineNumber, file) {
    if (!lineNumber || lineNumber <= 0) {
      return null;
    }

    // Get estimated file line count from GitHub file data
    const estimatedLineCount = Math.max(file.size || 1000, 50); // Conservative estimate
    
    // Additional validation for extremely high line numbers
    if (lineNumber > estimatedLineCount * 2) {
      logger.warn(`Line number ${lineNumber} seems too high for file ${file.filename} (estimated ~${estimatedLineCount} lines)`);
      return null;
    }

    return lineNumber;
  }

  /**
   * Format comment body for GitHub
   * @param {Object} comment - AI comment object
   * @returns {string} - Formatted comment body
   */
  formatCommentBody(comment) {
    // Use the CommentFormatter to create rich formatted comments with emojis
    return this.commentFormatter.formatComment(comment, this.config);
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