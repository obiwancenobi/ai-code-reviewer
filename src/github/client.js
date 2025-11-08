/**
 * GitHub API client wrapper for the AI code reviewer
 */

const { Octokit } = require('@octokit/rest');
const logger = require('../utils/logger');
const errorHandler = require('../utils/errorHandler');

class GitHubClient {
  constructor(token) {
    this.octokit = new Octokit({
      auth: token,
      userAgent: 'ai-code-reviewer'
    });
  }

  /**
   * Get pull request details
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {number} pullNumber - Pull request number
   * @returns {Promise<Object>} - Pull request data
   */
  async getPullRequest(owner, repo, pullNumber) {
    return await errorHandler.withRetry(
      async () => {
        const response = await this.octokit.pulls.get({
          owner,
          repo,
          pull_number: pullNumber
        });
        return response.data;
      },
      3,
      `Get PR ${owner}/${repo}#${pullNumber}`
    );
  }

  /**
   * Get list of files changed in a pull request
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {number} pullNumber - Pull request number
   * @returns {Promise<Array>} - Array of file objects
   */
  async getPullRequestFiles(owner, repo, pullNumber) {
    return await errorHandler.withRetry(
      async () => {
        const response = await this.octokit.pulls.listFiles({
          owner,
          repo,
          pull_number: pullNumber,
          per_page: 100
        });
        return response.data;
      },
      3,
      `Get PR files ${owner}/${repo}#${pullNumber}`
    );
  }

  /**
   * Create a review comment on a pull request
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {number} pullNumber - Pull request number
   * @param {Object} comment - Comment data
   * @returns {Promise<Object>} - Created comment
   */
  async createReviewComment(owner, repo, pullNumber, comment) {
    return await errorHandler.withRetry(
      async () => {
        // Skip comments without valid line numbers
        if (!comment.line || comment.line <= 0) {
          logger.warn(`Skipping comment for ${comment.path}: invalid line number ${comment.line}`);
          return null;
        }

        // Get PR details to get the head commit
        const prResponse = await this.octokit.pulls.get({
          owner,
          repo,
          pull_number: pullNumber
        });

        const commitId = prResponse.data.head.sha;

        const response = await this.octokit.pulls.createReviewComment({
          owner,
          repo,
          pull_number: pullNumber,
          body: comment.body,
          commit_id: commitId,
          path: comment.path,
          line: comment.line,
          side: 'RIGHT'
        });
        return response.data;
      },
      3,
      `Create review comment ${owner}/${repo}#${pullNumber}`
    );
  }

  /**
   * Create a general comment on a pull request
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {number} pullNumber - Pull request number
   * @param {string} body - Comment body
   * @returns {Promise<Object>} - Created comment
   */
  async createIssueComment(owner, repo, pullNumber, body) {
    return await errorHandler.withRetry(
      async () => {
        const response = await this.octokit.issues.createComment({
          owner,
          repo,
          issue_number: pullNumber,
          body
        });
        return response.data;
      },
      3,
      `Create issue comment ${owner}/${repo}#${pullNumber}`
    );
  }

  /**
   * Get repository information
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<Object>} - Repository data
   */
  async getRepository(owner, repo) {
    return await errorHandler.withRetry(
      async () => {
        const response = await this.octokit.repos.get({
          owner,
          repo
        });
        return response.data;
      },
      3,
      `Get repository ${owner}/${repo}`
    );
  }

  /**
   * Get file content from repository
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} path - File path
   * @param {string} ref - Git reference (branch/commit)
   * @returns {Promise<string>} - File content
   */
  async getFileContent(owner, repo, path, ref = 'HEAD') {
    return await errorHandler.withRetry(
      async () => {
        const response = await this.octokit.repos.getContent({
          owner,
          repo,
          path,
          ref
        });

        if (response.data.type !== 'file') {
          throw new Error(`Path ${path} is not a file`);
        }

        // GitHub API returns base64 encoded content
        return Buffer.from(response.data.content, 'base64').toString('utf8');
      },
      3,
      `Get file content ${owner}/${repo}/${path}`
    );
  }
}

module.exports = GitHubClient;