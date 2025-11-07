/**
 * File chunking utilities for processing large files
 */

const fileProcessor = require('./fileProcessor');
const logger = require('./logger');

class FileChunker {
  constructor(config) {
    this.config = config;
  }

  /**
   * Split file content into manageable chunks for AI processing
   * @param {string} content - File content
   * @param {Object} options - Chunking options
   * @returns {Array<Object>} - Array of content chunks with metadata
   */
  chunkFile(content, options = {}) {
    const maxChunkSize = options.maxChunkSize || this.config.processing?.chunkSize || 50000;
    const overlap = options.overlap || 1000; // Overlap between chunks for context

    if (content.length <= maxChunkSize) {
      return [{
        content,
        startLine: 1,
        endLine: content.split('\n').length,
        chunkIndex: 0,
        totalChunks: 1
      }];
    }

    const lines = content.split('\n');
    const chunks = [];
    let currentChunk = '';
    let currentStartLine = 1;
    let chunkIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const potentialChunk = currentChunk + (currentChunk ? '\n' : '') + line;

      // Check if adding this line would exceed chunk size
      if (potentialChunk.length > maxChunkSize && currentChunk.length > 0) {
        // Create chunk
        chunks.push({
          content: currentChunk,
          startLine: currentStartLine,
          endLine: i,
          chunkIndex,
          totalChunks: null // Will be set later
        });

        // Start new chunk with overlap
        const overlapLines = this.getOverlapLines(lines, i - 1, overlap);
        currentChunk = overlapLines.join('\n');
        currentStartLine = Math.max(1, i - overlapLines.length + 1);
        chunkIndex++;
      } else {
        currentChunk = potentialChunk;
      }
    }

    // Add final chunk
    if (currentChunk) {
      chunks.push({
        content: currentChunk,
        startLine: currentStartLine,
        endLine: lines.length,
        chunkIndex,
        totalChunks: null
      });
    }

    // Set total chunks
    const totalChunks = chunks.length;
    chunks.forEach(chunk => {
      chunk.totalChunks = totalChunks;
    });

    logger.debug(`Split file into ${totalChunks} chunks`);
    return chunks;
  }

  /**
   * Get lines for overlap between chunks
   * @param {Array<string>} lines - All file lines
   * @param {number} endIndex - End index for overlap
   * @param {number} maxOverlap - Maximum overlap size in characters
   * @returns {Array<string>} - Overlap lines
   */
  getOverlapLines(lines, endIndex, maxOverlap) {
    const overlapLines = [];
    let overlapSize = 0;

    for (let i = Math.max(0, endIndex - 10); i <= endIndex; i++) {
      if (i >= 0 && i < lines.length) {
        const line = lines[i];
        if (overlapSize + line.length + 1 <= maxOverlap) {
          overlapLines.push(line);
          overlapSize += line.length + 1;
        } else {
          break;
        }
      }
    }

    return overlapLines;
  }

  /**
   * Validate chunk boundaries to ensure code integrity
   * @param {string} chunk - Chunk content
   * @returns {Object} - Validation result
   */
  validateChunk(chunk) {
    const result = {
      isValid: true,
      issues: []
    };

    // Check for incomplete code blocks
    const openBraces = (chunk.match(/\{/g) || []).length;
    const closeBraces = (chunk.match(/\}/g) || []).length;

    if (openBraces !== closeBraces) {
      result.issues.push('Unmatched braces - chunk may split code block');
      result.isValid = false;
    }

    // Check for incomplete strings
    const quotes = chunk.match(/["'`]/g) || [];
    if (quotes.length % 2 !== 0) {
      result.issues.push('Unmatched quotes - chunk may split string literal');
      result.isValid = false;
    }

    // Check for incomplete comments
    const singleLineComments = (chunk.match(/\/\//g) || []).length;
    const multiLineOpen = (chunk.match(/\/\*/g) || []).length;
    const multiLineClose = (chunk.match(/\*\//g) || []).length;

    if (multiLineOpen > multiLineClose) {
      result.issues.push('Unclosed multi-line comment');
      result.isValid = false;
    }

    return result;
  }

  /**
   * Adjust line numbers in review comments based on chunk position
   * @param {Array<Object>} comments - Review comments
   * @param {Object} chunk - Chunk metadata
   * @param {number} originalContentLines - Total lines in original content
   * @returns {Array<Object>} - Adjusted comments
   */
  adjustCommentLineNumbers(comments, chunk, originalContentLines) {
    return comments.map(comment => {
      if (!comment.line_number) return comment;

      // Calculate relative line number within chunk
      const chunkLines = chunk.content.split('\n');
      let adjustedLine = chunk.startLine + comment.line_number - 1;

      // Ensure line number doesn't exceed file bounds
      adjustedLine = Math.max(1, Math.min(adjustedLine, originalContentLines));

      return {
        ...comment,
        line_number: adjustedLine
      };
    });
  }

  /**
   * Merge overlapping or adjacent chunks if beneficial
   * @param {Array<Object>} chunks - Array of chunks
   * @param {number} maxTotalSize - Maximum total size for merged chunks
   * @returns {Array<Object>} - Optimized chunks
   */
  optimizeChunks(chunks, maxTotalSize = 100000) {
    if (chunks.length <= 1) return chunks;

    const optimized = [];
    let currentGroup = [chunks[0]];

    for (let i = 1; i < chunks.length; i++) {
      const chunk = chunks[i];
      const groupSize = currentGroup.reduce((sum, c) => sum + c.content.length, 0);

      // If adding this chunk keeps us under limit, add it
      if (groupSize + chunk.content.length <= maxTotalSize) {
        currentGroup.push(chunk);
      } else {
        // Merge current group and start new one
        optimized.push(this.mergeChunkGroup(currentGroup));
        currentGroup = [chunk];
      }
    }

    // Merge final group
    if (currentGroup.length > 0) {
      optimized.push(this.mergeChunkGroup(currentGroup));
    }

    logger.debug(`Optimized ${chunks.length} chunks into ${optimized.length} merged chunks`);
    return optimized;
  }

  /**
   * Merge a group of chunks into a single chunk
   * @param {Array<Object>} chunkGroup - Group of chunks to merge
   * @returns {Object} - Merged chunk
   */
  mergeChunkGroup(chunkGroup) {
    if (chunkGroup.length === 1) return chunkGroup[0];

    const mergedContent = chunkGroup.map(c => c.content).join('\n...\n');
    const startLine = chunkGroup[0].startLine;
    const endLine = chunkGroup[chunkGroup.length - 1].endLine;

    return {
      content: mergedContent,
      startLine,
      endLine,
      chunkIndex: chunkGroup[0].chunkIndex,
      totalChunks: chunkGroup[0].totalChunks,
      merged: true
    };
  }
}

module.exports = FileChunker;