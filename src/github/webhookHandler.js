/**
 * GitHub webhook handler for processing pull request events
 */

const GitHubClient = require('./client');
const AIReviewService = require('../services/aiReviewService');
const DiscordService = require('../services/discordService');
const logger = require('../utils/logger');
const errorHandler = require('../utils/errorHandler');

class WebhookHandler {
  constructor(config) {
    this.config = config;
    this.githubClient = new GitHubClient(process.env.GITHUB_TOKEN, config.author);
    this.aiReviewService = new AIReviewService(config);
    this.discordService = config.notifications?.discordWebhookUrl ?
      new DiscordService(config.notifications.discordWebhookUrl) : null;
  }

  /**
   * Handle GitHub webhook payload
   * @param {Object} payload - Webhook payload
   * @returns {Promise<Object>} - Processing result
   */
  async handleWebhook(payload) {
    const workflowStartTime = Date.now();
    
    try {
      logger.info('Received webhook:', payload.action, payload.pull_request?.number);

      // Only process pull request events
      if (!payload.pull_request) {
        logger.debug('Ignoring non-PR webhook');
        return { status: 'ignored', reason: 'not a pull request event' };
      }

      const pr = payload.pull_request;
      const action = payload.action;

      // Only process relevant PR actions
      if (!['opened', 'synchronize', 'reopened'].includes(action)) {
        logger.debug(`Ignoring PR action: ${action}`);
        return { status: 'ignored', reason: `unsupported action: ${action}` };
      }

      // Send Discord notification for start
      if (this.discordService) {
        await this.discordService.sendNotification({
          type: 'review_start',
          prNumber: pr.number,
          repository: payload.repository.full_name,
          title: pr.title,
          author: pr.user?.login || 'Unknown',
          reviewer: 'AI Code Reviewer',
          aiModel: `${this.config.ai.provider}|${this.config.ai.model}`
        });
      }

      // Process the pull request
      const result = await this.processPullRequest(pr, payload.repository, workflowStartTime);

      // Send Discord notification for completion
      if (this.discordService) {
        await this.discordService.sendNotification({
          type: result.success ? 'review_success' : 'review_error',
          prNumber: pr.number,
          repository: payload.repository.full_name,
          commentCount: result.comments || 0,  // ← Fixed: was result.comments?.length, should be result.comments (number)
          error: result.error,
          duration: result.duration,
          aiModel: `${this.config.ai.provider}|${this.config.ai.model}`
        });
      }

      return result;

    } catch (error) {
      logger.error('Webhook processing failed:', error);

      // Send error notification
      if (this.discordService) {
        await this.discordService.sendNotification({
          type: 'review_error',
          prNumber: payload.pull_request?.number,
          repository: payload.repository?.full_name,
          error: error.message
        });
      }

      return errorHandler.handleError(error, 'webhook processing');
    }
  }

  /**
   * Process a pull request for AI review
   * @param {Object} pr - Pull request object
   * @param {Object} repository - Repository object
   * @returns {Promise<Object>} - Processing result
   */
  async processPullRequest(pr, repository, workflowStartTime) {
    logger.info(`Processing PR #${pr.number} in ${repository.full_name}`);

    try {
      // Get list of changed files
      const files = await this.githubClient.getPullRequestFiles(
        repository.owner.login,
        repository.name,
        pr.number
      );

      if (files.length === 0) {
        logger.warn(`No files found in PR #${pr.number}`);
        const duration = this.formatDuration(Date.now() - workflowStartTime);
        return {
          success: true,
          status: 'no_files',
          message: 'No files to review',
          duration
        };
      }

      // Perform AI review
      const reviewResult = await this.aiReviewService.reviewPullRequest(files, {
        number: pr.number,
        title: pr.title,
        author: pr.user.login,
        repository: repository.full_name
      });

      // Post review comments to GitHub
      const postedComments = await this.postReviewComments(
        repository.owner.login,
        repository.name,
        pr.number,
        reviewResult.comments
      );

      logger.info(`Review completed for PR #${pr.number}: ${postedComments} comments posted`);

      const duration = this.formatDuration(Date.now() - workflowStartTime);

      return {
        success: true,
        status: 'completed',
        comments: postedComments,
        processedFiles: reviewResult.processedFiles,
        skippedFiles: files.length - reviewResult.processedFiles,
        duration
      };

    } catch (error) {
      logger.error(`Failed to process PR #${pr.number}:`, error);
      const duration = this.formatDuration(Date.now() - workflowStartTime);
      return {
        success: false,
        error: error.message,
        duration
      };
    }
  }

  /**
   * Post review comments to GitHub
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {number} pullNumber - Pull request number
   * @param {Array} comments - Array of review comments
   * @returns {Promise<number>} - Number of comments posted
   */
  async postReviewComments(owner, repo, pullNumber, comments) {
    if (!comments || comments.length === 0) {
      logger.info('No comments to post');
      return 0;
    }

    let postedCount = 0;
    const generalComments = []; // Collect comments that need to fallback to general

    for (const comment of comments) {
      try {
        if (comment.type === 'inline' && comment.line) {
          // Post inline comment
          const result = await this.githubClient.createReviewComment(owner, repo, pullNumber, {
            body: comment.body,
            commitId: comment.commit_id,
            path: comment.path,
            line: comment.line,
            side: comment.side || 'RIGHT'
          });

          // If inline comment succeeded, count it
          if (result !== null) {
            postedCount++;
            logger.debug(`Posted inline comment ${postedCount}/${comments.length}`);
          } else {
            // Line couldn't be resolved, add to general comments fallback
            logger.info(`Line ${comment.line} in ${comment.path} could not be resolved, will post as general comment`);
            generalComments.push(comment);
          }
        } else {
          // This is already a general comment
          generalComments.push(comment);
        }

        // Delay to avoid GitHub review comment rate limits (was submitted too quickly)
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay between comments

      } catch (error) {
        logger.error(`Failed to post inline comment for ${comment.path}:${comment.line}:`, error.message);
        
        // Fallback to general comment if inline comment fails
        logger.info(`Falling back to general comment for ${comment.path}:${comment.line}`);
        generalComments.push(comment);
        
        // Longer delay after error to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay after errors
      }
    }

    // Post general comments as fallback
    for (let i = 0; i < generalComments.length; i++) {
      const comment = generalComments[i];
      try {
        await this.githubClient.createIssueComment(owner, repo, pullNumber,
          `**AI Review Comment** (${comment.path}${comment.line ? `:${comment.line}` : ''}):\n\n${comment.body}`);
        postedCount++;
        logger.debug(`Posted general comment fallback ${postedCount}/${comments.length}`);

        // Conservative delay to avoid GitHub secondary rate limits
        // Increase delay based on how many comments we've posted
        const delay = Math.min(3000 + (i * 1000), 10000); // Start at 3s, increase by 1s, max 10s
        await new Promise(resolve => setTimeout(resolve, delay));

      } catch (error) {
        logger.error(`Failed to post general comment fallback:`, error.message);
        
        // If it's a secondary rate limit, stop trying to post more comments
        if (error.status === 403 && error.message?.toLowerCase().includes('secondary rate limit')) {
          logger.warn('GitHub secondary rate limit hit, stopping further comment attempts');
          break;
        }
        
        // For other errors, wait longer before trying next comment
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    return postedCount;
  }

  /**
   * Validate webhook payload
   * @param {Object} payload - Webhook payload
   * @returns {boolean} - Whether payload is valid
   */
  validatePayload(payload) {
    return payload &&
           payload.action &&
           payload.pull_request &&
           payload.repository;
  }

  /**
   * Format duration in milliseconds to human-readable format
   * @param {number} durationMs - Duration in milliseconds
   * @returns {string} - Formatted duration (e.g., "2m 30s")
   */
  formatDuration(durationMs) {
    const totalSeconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes === 0) {
      return `${seconds}s`;
    } else if (seconds === 0) {
      return `${minutes}m`;
    } else {
      return `${minutes}m ${seconds}s`;
    }
  }
}

module.exports = WebhookHandler;