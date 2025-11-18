/**
 * Error handling utilities for the AI code reviewer
 */

const logger = require('./logger');

class ErrorHandler {
  constructor() {
    this.maxRetries = 3;
    this.baseDelay = 1000; // 1 second
  }

  /**
   * Execute a function with retry logic
   * @param {Function} fn - Function to execute
   * @param {number} retries - Number of retries
   * @param {string} context - Context for logging
   * @returns {Promise<any>} - Result of the function
   */
  async withRetry(fn, retries = this.maxRetries, context = 'operation') {
    let lastError;

    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Check if this error should not be retried
        if (!this.isRetryableError(error)) {
          logger.warn(`${context} failed with non-retryable error (attempt ${attempt}/${retries + 1}):`, error.message);
          throw error; // Don't retry non-retryable errors
        }

        if (attempt <= retries) {
          const delay = this.baseDelay * Math.pow(2, attempt - 1);
          logger.warn(`${context} failed (attempt ${attempt}/${retries + 1}), retrying in ${delay}ms:`, error.message);
          await this.delay(delay);
        }
      }
    }

    logger.error(`${context} failed after ${retries + 1} attempts:`, lastError.message);
    throw lastError;
  }

  /**
   * Check if an error is retryable
   * @param {Error} error - Error to check
   * @returns {boolean} - Whether the error is retryable
   */
  isRetryableError(error) {
    // Handle GitHub-specific errors
    if (error.status === 422) {
      const message = error.message?.toLowerCase() || '';
      
      // GitHub review comment rate limit - should be retried
      if (message.includes('was submitted too quickly')) {
        return true;
      }
      
      // Line resolution errors and other validation errors shouldn't be retried
      if (message.includes('could not be resolved') || message.includes('validation failed')) {
        return false;
      }
    }

    // Handle GitHub secondary rate limits (403 errors with specific message)
    if (error.status === 403) {
      const message = error.message?.toLowerCase() || '';
      // Secondary rate limits should not be retried (GitHub blocks for a period)
      if (message.includes('secondary rate limit') || message.includes('temporarily blocked from content creation')) {
        return false;
      }
    }

    // Network errors, rate limits, temporary server errors
    const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
    const retryableMessages = ['timeout', 'rate limit', 'server error', 'network'];

    if (error.status && retryableStatusCodes.includes(error.status)) {
      return true;
    }

    const message = error.message?.toLowerCase() || '';
    return retryableMessages.some(keyword => message.includes(keyword));
  }

  /**
   * Categorize an error
   * @param {Error} error - Error to categorize
   * @returns {string} - Error category
   */
  categorizeError(error) {
    if (error.status === 401 || error.status === 403) {
      return 'authentication';
    }
    if (error.status === 429) {
      return 'rate_limit';
    }
    if (error.status >= 500) {
      return 'server_error';
    }
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return 'network';
    }
    if (error.message?.includes('timeout')) {
      return 'timeout';
    }
    return 'unknown';
  }

  /**
   * Delay execution for a specified time
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Handle an error with appropriate logging and response
   * @param {Error} error - Error to handle
   * @param {string} context - Context for logging
   * @returns {Object} - Error response object
   */
  handleError(error, context = 'operation') {
    const category = this.categorizeError(error);
    const isRetryable = this.isRetryableError(error);

    logger.error(`${context} error (${category}):`, error.message);

    return {
      success: false,
      error: {
        message: error.message,
        category,
        retryable: isRetryable,
        status: error.status || null
      }
    };
  }
}

module.exports = new ErrorHandler();