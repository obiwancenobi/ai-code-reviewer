/**
 * File processing utilities for the AI code reviewer
 */

const fs = require('fs').promises;
const path = require('path');
const { minimatch } = require('minimatch');
const logger = require('./logger');

class FileProcessor {
  constructor() {
    this.defaultExclusions = [
      'node_modules/**',
      'build/**',
      'dist/**',
      '*.min.js',
      '*.lock',
      '.git/**',
      '*.log',
      'coverage/**',
      '.nyc_output/**',
      '*.tsbuildinfo'
    ];
  }

  /**
   * Check if a file should be excluded from processing
   * @param {string} filePath - Path to the file
   * @param {Array<string>} customExclusions - Additional exclusion patterns
   * @returns {boolean} - Whether the file should be excluded
   */
  shouldExcludeFile(filePath, customExclusions = []) {
    const allExclusions = [...this.defaultExclusions, ...customExclusions];

    return allExclusions.some(pattern => {
      try {
        return minimatch(filePath, pattern);
      } catch (error) {
        logger.warn(`Invalid exclusion pattern "${pattern}":`, error.message);
        return false;
      }
    });
  }

  /**
   * Get file size
   * @param {string} filePath - Path to the file
   * @returns {Promise<number>} - File size in bytes
   */
  async getFileSize(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      logger.error(`Failed to get file size for ${filePath}:`, error.message);
      return 0;
    }
  }

  /**
   * Read file content
   * @param {string} filePath - Path to the file
   * @returns {Promise<string>} - File content
   */
  async readFileContent(filePath) {
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      logger.error(`Failed to read file ${filePath}:`, error.message);
      throw error;
    }
  }

  /**
   * Detect programming language from file extension
   * @param {string} filePath - Path to the file
   * @returns {string} - Detected language
   */
  detectLanguage(filePath) {
    const ext = path.extname(filePath).toLowerCase();

    const languageMap = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.jsx': 'javascript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.php': 'php',
      '.rb': 'ruby',
      '.go': 'go',
      '.rs': 'rust',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala',
      '.sh': 'bash',
      '.sql': 'sql',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.less': 'less',
      '.json': 'json',
      '.xml': 'xml',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.md': 'markdown'
    };

    return languageMap[ext] || 'unknown';
  }

  /**
   * Split large file into chunks for AI processing
   * @param {string} content - File content
   * @param {number} maxChunkSize - Maximum chunk size in characters
   * @returns {Array<string>} - Array of content chunks
   */
  splitIntoChunks(content, maxChunkSize = 50000) {
    if (content.length <= maxChunkSize) {
      return [content];
    }

    const chunks = [];
    let start = 0;

    while (start < content.length) {
      let end = start + maxChunkSize;

      // Try to break at a reasonable boundary (end of line)
      if (end < content.length) {
        const lastNewline = content.lastIndexOf('\n', end);
        if (lastNewline > start + maxChunkSize * 0.8) {
          end = lastNewline + 1;
        }
      }

      chunks.push(content.slice(start, end));
      start = end;
    }

    return chunks;
  }

  /**
   * Validate file for processing
   * @param {string} filePath - Path to the file
   * @param {Object} config - Configuration object
   * @returns {Promise<Object>} - Validation result
   */
  async validateFile(filePath, config = {}) {
    const result = {
      isValid: true,
      reason: null,
      fileInfo: {
        path: filePath,
        size: 0,
        language: 'unknown'
      }
    };

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      result.isValid = false;
      result.reason = 'File does not exist';
      return result;
    }

    // Check exclusions
    if (this.shouldExcludeFile(filePath, config.excludePatterns)) {
      result.isValid = false;
      result.reason = 'File matches exclusion pattern';
      return result;
    }

    // Get file size
    const size = await this.getFileSize(filePath);
    result.fileInfo.size = size;

    // Check size limit
    if (config.maxFileSize && size > config.maxFileSize) {
      result.isValid = false;
      result.reason = `File size ${size} exceeds limit ${config.maxFileSize}`;
      return result;
    }

    // Detect language
    result.fileInfo.language = this.detectLanguage(filePath);

    // Check if it's a text file (basic check)
    try {
      const content = await this.readFileContent(filePath);
      // Simple check for binary content
      if (content.includes('\0')) {
        result.isValid = false;
        result.reason = 'File appears to be binary';
      }
    } catch (error) {
      result.isValid = false;
      result.reason = 'Cannot read file as text';
    }

    return result;
  }
}

module.exports = new FileProcessor();