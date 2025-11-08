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
          author: pr.user.login
        });
      }

      // Process the pull request
      const result = await this.processPullRequest(pr, payload.repository);

      // Send Discord notification for completion
      if (this.discordService) {
        await this.discordService.sendNotification({
          type: result.success ? 'review_success' : 'review_error',
          prNumber: pr.number,
          repository: payload.repository.full_name,
          commentCount: result.comments || 0,  // ← Fixed: was result.comments?.length, should be result.comments (number)
          error: result.error
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
  async processPullRequest(pr, repository) {
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
        return {
          success: true,
          status: 'no_files',
          message: 'No files to review'
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

      return {
        success: true,
        status: 'completed',
        comments: postedComments,
        processedFiles: reviewResult.processedFiles,
        skippedFiles: files.length - reviewResult.processedFiles
      };

    } catch (error) {
      logger.error(`Failed to process PR #${pr.number}:`, error);
      throw error;
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

          // Only count if comment was actually posted (not null due to invalid line)
          if (result !== null) {
            postedCount++;
          }
        } else {
          // Post general comment
          await this.githubClient.createIssueComment(owner, repo, pullNumber, comment.body);
          postedCount++;
        }

        logger.debug(`Posted comment ${postedCount}/${comments.length}`);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        logger.error(`Failed to post comment:`, error);
        // Continue with other comments
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
}

module.exports = WebhookHandler;