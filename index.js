#!/usr/bin/env node

/**
 * AI Code Reviewer CLI
 * Main entry point for the AI code review workflow
 */

const { Command } = require('commander');
const WebhookHandler = require('./src/github/webhookHandler');
const ConfigManager = require('./src/config/index');
const ConfigValidator = require('./src/config/validator');
const logger = require('./src/utils/logger');

const program = new Command();

program
  .name('ai-code-reviewer')
  .description('AI-powered code review for GitHub pull requests')
  .version('1.0.10');

// Review command for GitHub Actions
program
  .command('review')
  .description('Run AI code review on a pull request')
  .option('--pr <number>', 'Pull request number', parseInt)
  .option('--repo <repo>', 'Repository name (owner/repo)')
  .option('--config <file>', 'Configuration file path', 'ai-review-config.json')
  .action(async (options) => {
    try {
      logger.info('Starting AI code review...');

      // Load and validate configuration
      const configManager = new ConfigManager();
      configManager.configFile = options.config;
      const config = configManager.loadConfig();

      const validator = new ConfigValidator();
      const validation = validator.validate(config);
      if (!validation.isValid) {
        logger.error('Configuration validation failed:');
        validation.errors.forEach(error => logger.error(`- ${error}`));
        process.exit(1);
      }

      // Validate environment
      const envValidation = validator.validateEnvironment();
      if (!envValidation.isValid) {
        logger.error('Environment validation failed:');
        envValidation.errors.forEach(error => logger.error(`- ${error}`));
        process.exit(1);
      }

      // Create webhook handler and simulate PR event
      const webhookHandler = new WebhookHandler(config);

      // Simulate webhook payload for GitHub Actions
      const payload = {
        action: 'opened',
        pull_request: {
          number: options.pr,
          title: `PR #${options.pr}`,
          user: { login: 'unknown' }
        },
        repository: {
          full_name: options.repo,
          owner: { login: options.repo.split('/')[0] },
          name: options.repo.split('/')[1]
        }
      };

      const result = await webhookHandler.handleWebhook(payload);

      if (result.success) {
        logger.info('AI code review completed successfully');
        process.exit(0);
      } else {
        logger.error('AI code review failed:', result.error);
        process.exit(1);
      }

    } catch (error) {
      logger.error('Review command failed:', error);
      process.exit(1);
    }
  });

// Webhook command for direct webhook handling
program
  .command('webhook')
  .description('Handle GitHub webhook payload')
  .option('--payload <json>', 'Webhook payload as JSON string')
  .option('--config <file>', 'Configuration file path', 'ai-review-config.json')
  .action(async (options) => {
    try {
      logger.info('Processing webhook...');

      // Load configuration
      const configManager = new ConfigManager();
      configManager.configFile = options.config;
      const config = configManager.loadConfig();

      // Parse payload
      const payload = JSON.parse(options.payload);

      // Create webhook handler
      const webhookHandler = new WebhookHandler(config);

      const result = await webhookHandler.handleWebhook(payload);

      console.log(JSON.stringify(result, null, 2));

    } catch (error) {
      logger.error('Webhook command failed:', error);
      console.error(JSON.stringify({ success: false, error: error.message }, null, 2));
      process.exit(1);
    }
  });

// Validate command
program
  .command('validate')
  .description('Validate configuration')
  .option('--config <file>', 'Configuration file path', 'ai-review-config.json')
  .action(async (options) => {
    try {
      logger.info('Validating configuration...');

      // Load configuration
      const configManager = new ConfigManager();
      configManager.configFile = options.config;
      const config = configManager.loadConfig();

      // Validate configuration
      const validator = new ConfigValidator();
      const validation = validator.validate(config);
      const envValidation = validator.validateEnvironment();

      const allErrors = [...validation.errors, ...envValidation.errors];
      const allWarnings = [...validation.warnings, ...envValidation.warnings];

      if (allErrors.length > 0) {
        console.log('❌ Validation failed:');
        allErrors.forEach(error => console.log(`  - ${error}`));
        process.exit(1);
      } else {
        console.log('✅ Configuration is valid');

        if (allWarnings.length > 0) {
          console.log('⚠️  Warnings:');
          allWarnings.forEach(warning => console.log(`  - ${warning}`));
        }

        process.exit(0);
      }

    } catch (error) {
      logger.error('Validate command failed:', error);
      process.exit(1);
    }
  });

// Test Discord webhook
program
  .command('test-discord')
  .description('Test Discord webhook connectivity')
  .option('--webhook-url <url>', 'Discord webhook URL')
  .action(async (options) => {
    try {
      const DiscordService = require('./src/services/discordService');
      const discord = new DiscordService(options.webhookUrl);

      const success = await discord.testWebhook();

      if (success) {
        console.log('✅ Discord webhook test successful');
        process.exit(0);
      } else {
        console.log('❌ Discord webhook test failed');
        process.exit(1);
      }

    } catch (error) {
      logger.error('Test Discord command failed:', error);
      process.exit(1);
    }
  });

program.parse();