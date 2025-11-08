/**
 * Discord notification service for AI code review
 */

const { WebhookClient } = require('discord.js');
const logger = require('../utils/logger');
const errorHandler = require('../utils/errorHandler');

class DiscordService {
  constructor(webhookUrl) {
    this.webhookUrl = webhookUrl;
    this.webhookClient = null;

    if (webhookUrl) {
      try {
        this.webhookClient = new WebhookClient({ url: webhookUrl });
        logger.info('Discord webhook client initialized');
      } catch (error) {
        logger.error('Failed to initialize Discord webhook client:', error.message);
        this.webhookClient = null;
      }
    } else {
      logger.warn('No Discord webhook URL provided, notifications disabled');
    }
  }

  /**
   * Send a notification to Discord
   * @param {Object} notification - Notification data
   * @returns {Promise<boolean>} - Success status
   */
  async sendNotification(notification) {
    if (!this.webhookClient) {
      logger.debug('Discord notifications disabled, skipping');
      return false;
    }

    try {
      const embed = this.createEmbed(notification);
      await this.webhookClient.send({ embeds: [embed] });
      logger.info(`Discord notification sent: ${notification.type}`);
      return true;
    } catch (error) {
      logger.error('Failed to send Discord notification:', error.message);
      return false;
    }
  }

  /**
   * Create Discord embed from notification data
   * @param {Object} notification - Notification data
   * @returns {Object} - Discord embed object
   */
  createEmbed(notification) {
    const embed = {
      timestamp: new Date().toISOString(),
      footer: {
        text: 'AI Code Reviewer'
      }
    };

    switch (notification.type) {
      case 'review_start':
        embed.title = '🤖 AI Code Review Started';
        embed.description = `AI Code Reviewer has started reviewing pull request #${notification.prNumber}`;
        embed.color = 0x3498db; // Blue
        embed.fields = [
          {
            name: 'Repository',
            value: notification.repository,
            inline: true
          },
          {
            name: 'Pull Request',
            value: `[#${notification.prNumber}](${this.getPrUrl(notification.repository, notification.prNumber)})`,
            inline: true
          },
          {
            name: 'PR Author',
            value: notification.author,
            inline: true
          },
          {
            name: 'Title',
            value: notification.title,
            inline: false
          },
          {
            name: 'Reviewer',
            value: notification.reviewer || 'AI Code Reviewer',
            inline: true
          }
        ];
        break;

      case 'review_success':
        embed.title = '✅ AI Code Review Completed';
        embed.description = `Successfully reviewed pull request #${notification.prNumber}`;
        embed.color = 0x27ae60; // Green
        embed.fields = [
          {
            name: 'Repository',
            value: notification.repository,
            inline: true
          },
          {
            name: 'Pull Request',
            value: `[#${notification.prNumber}](${this.getPrUrl(notification.repository, notification.prNumber)})`,
            inline: true
          },
          {
            name: 'Comments Posted',
            value: notification.commentCount?.toString() || '0',
            inline: true
          }
        ];
        break;

      case 'review_error':
        embed.title = '❌ AI Code Review Failed';
        embed.description = `Review failed for pull request #${notification.prNumber}`;
        embed.color = 0xe74c3c; // Red
        embed.fields = [
          {
            name: 'Repository',
            value: notification.repository,
            inline: true
          },
          {
            name: 'Pull Request',
            value: `[#${notification.prNumber}](${this.getPrUrl(notification.repository, notification.prNumber)})`,
            inline: true
          },
          {
            name: 'Error',
            value: notification.error || 'Unknown error',
            inline: false
          }
        ];
        break;

      default:
        embed.title = '🤖 AI Code Review Notification';
        embed.description = 'Unknown notification type';
        embed.color = 0x95a5a6; // Gray
    }

    return embed;
  }

  /**
   * Generate pull request URL
   * @param {string} repository - Repository name (owner/repo)
   * @param {number} prNumber - Pull request number
   * @returns {string} - Pull request URL
   */
  getPrUrl(repository, prNumber) {
    return `https://github.com/${repository}/pull_request/${prNumber}`;
  }

  /**
   * Send batch notifications with rate limiting
   * @param {Array} notifications - Array of notification objects
   * @returns {Promise<Array>} - Array of results
   */
  async sendBatchNotifications(notifications) {
    const results = [];
    const delay = 1000; // 1 second between notifications

    for (const notification of notifications) {
      const result = await this.sendNotification(notification);
      results.push(result);

      if (notifications.length > 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return results;
  }

  /**
   * Test Discord webhook connectivity
   * @returns {Promise<boolean>} - Whether webhook is working
   */
  async testWebhook() {
    if (!this.webhookClient) {
      return false;
    }

    try {
      const testEmbed = {
        title: '🧪 Webhook Test',
        description: 'Testing Discord webhook connectivity',
        color: 0x9b59b6, // Purple
        timestamp: new Date().toISOString(),
        footer: {
          text: 'AI Code Reviewer'
        }
      };

      await this.webhookClient.send({
        content: 'Testing webhook connection...',
        embeds: [testEmbed]
      });

      logger.info('Discord webhook test successful');
      return true;
    } catch (error) {
      logger.error('Discord webhook test failed:', error.message);
      return false;
    }
  }

  /**
   * Check if Discord service is available
   * @returns {boolean} - Whether service is available
   */
  isAvailable() {
    return this.webhookClient !== null;
  }
}

module.exports = DiscordService;