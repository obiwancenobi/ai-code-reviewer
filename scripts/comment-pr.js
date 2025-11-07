#!/usr/bin/env node

const https = require('https');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const params = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];
    if (key === 'comments') {
      params[key] = JSON.parse(value);
    } else {
      params[key] = value;
    }
  }

  return params;
}

// Validate required parameters
function validateParams(params) {
  const required = ['pr_number', 'repository', 'github_token', 'comments'];
  for (const param of required) {
    if (!params[param]) {
      throw new Error(`Missing required parameter: ${param}`);
    }
  }
  if (!Array.isArray(params.comments)) {
    throw new Error('comments must be a JSON array');
  }
}

// Prepare review data for GitHub API
function prepareReviewData(comments) {
  const reviewComments = [];
  let hasIssues = false;

  comments.forEach(comment => {
    if (comment.file && comment.message) {
      reviewComments.push({
        path: comment.file,
        position: comment.line || 1, // Default to line 1 if not specified
        body: `${comment.message}${comment.severity ? ` (Severity: ${comment.severity})` : ''}`
      });
      if (comment.type === 'issue' && comment.severity === 'high') {
        hasIssues = true;
      }
    }
  });

  // Determine review event
  let event = 'COMMENT';
  if (hasIssues) {
    event = 'REQUEST_CHANGES';
  } else if (comments.length === 0 || comments.every(c => c.type === 'suggestion' || c.type === 'improvement')) {
    event = 'APPROVE';
  }

  return {
    body: 'AI Code Review Comments',
    event: event,
    comments: reviewComments
  };
}

// Make HTTPS request to GitHub API
function makeGitHubRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response);
          } else {
            reject(new Error(`GitHub API Error: ${res.statusCode} - ${response.message || body}`));
          }
        } catch (error) {
          reject(new Error(`Parse Error: ${error.message} - Body: ${body}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Main function
async function main() {
  try {
    const params = parseArgs();
    validateParams(params);

    console.log('Posting PR comments...');

    const [owner, repo] = params.repository.split('/');
    if (!owner || !repo) {
      throw new Error('Invalid repository format. Use owner/repo');
    }

    const reviewData = prepareReviewData(params.comments);

    const options = {
      hostname: 'api.github.com',
      port: 443,
      path: `/repos/${owner}/${repo}/pulls/${params.pr_number}/reviews`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${params.github_token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'AI-Code-Reviewer/1.0'
      }
    };

    const response = await makeGitHubRequest(options, reviewData);

    console.log('PR review posted successfully');
    console.log(`Review ID: ${response.id}`);

  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { parseArgs, validateParams, prepareReviewData, makeGitHubRequest };