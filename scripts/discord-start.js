#!/usr/bin/env node

const https = require('https');

function parseArgs() {
  const args = process.argv.slice(2);
  const params = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    params[key] = args[i + 1];
  }
  return params;
}

async function sendDiscordNotification(webhookUrl, embed) {
  const payload = { embeds: [embed] };

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(webhookUrl, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          reject(new Error(`Discord API error: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(JSON.stringify(payload));
    req.end();
  });
}

async function main() {
  try {
    const { webhook_url, pr_number, pr_title, actor_name, repository } = parseArgs();

    if (!webhook_url || !pr_number || !pr_title || !actor_name || !repository) {
      console.error('Missing required parameters: webhook_url, pr_number, pr_title, actor_name, repository');
      process.exit(1);
    }

    const embed = {
      title: '🚀 AI Code Review Started',
      color: 3447003, // Blue
      fields: [
        { name: 'PR Number', value: pr_number.toString(), inline: true },
        { name: 'PR Title', value: pr_title, inline: true },
        { name: 'Actor', value: actor_name, inline: true },
        { name: 'Repository', value: repository, inline: true },
      ],
      timestamp: new Date().toISOString(),
      url: `https://github.com/${repository}/pull/${pr_number}`,
    };

    await sendDiscordNotification(webhook_url, embed);
    console.log('Discord start notification sent successfully');
  } catch (error) {
    console.error('Failed to send Discord notification:', error.message);
    // Don't exit with error to avoid failing the workflow
  }
}

main();