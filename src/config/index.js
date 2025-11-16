/**
 * Configuration management for the AI code reviewer
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class ConfigManager {
  constructor() {
    this.config = {};
    this.configFile = 'ai-review-config.json';
  }

  /**
   * Load configuration from file and environment variables
   * @returns {Object} - Merged configuration
   */
  loadConfig() {
    let fileConfig = {};

    // Try to load from config file
    try {
      if (fs.existsSync(this.configFile)) {
        const configContent = fs.readFileSync(this.configFile, 'utf8');
        fileConfig = JSON.parse(configContent);
        logger.info('Loaded configuration from file:', this.configFile);
      } else {
        logger.warn('Configuration file not found:', this.configFile);
      }
    } catch (error) {
      logger.error('Failed to load configuration file:', error.message);
    }

    // Merge with environment variables
    const envConfig = this.loadFromEnvironment();

    // Deep merge configurations (environment takes precedence)
    this.config = this.deepMerge(fileConfig, envConfig);

    // Set defaults
    this.setDefaults();

    // Validate configuration
    this.validateConfig();

    return this.config;
  }

  /**
   * Load configuration from environment variables
   * @returns {Object} - Environment configuration
   */
  loadFromEnvironment() {
    const envConfig = {};

    // AI provider settings
    if (process.env.AI_PROVIDER) {
      envConfig.ai = envConfig.ai || {};
      envConfig.ai.provider = process.env.AI_PROVIDER;
    }

    if (process.env.AI_MODEL) {
      envConfig.ai = envConfig.ai || {};
      envConfig.ai.model = process.env.AI_MODEL;
    }

    if (process.env.AI_PERSONA) {
      envConfig.ai = envConfig.ai || {};
      envConfig.ai.persona = process.env.AI_PERSONA;
    }

    // Processing settings
    if (process.env.MAX_FILE_SIZE) {
      envConfig.processing = envConfig.processing || {};
      envConfig.processing.maxFileSize = parseInt(process.env.MAX_FILE_SIZE);
    }

    if (process.env.CHUNK_SIZE) {
      envConfig.processing = envConfig.processing || {};
      envConfig.processing.chunkSize = parseInt(process.env.CHUNK_SIZE);
    }

    // Discord webhook
    if (process.env.DISCORD_WEBHOOK_URL) {
      envConfig.notifications = envConfig.notifications || {};
      envConfig.notifications.discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
    }

    return envConfig;
  }

  /**
   * Set default configuration values
   */
  setDefaults() {
    // AI defaults
    this.config.ai = this.config.ai || {};
    this.config.ai.provider = this.config.ai.provider || 'openai';
    this.config.ai.model = this.config.ai.model || 'gpt-4';
    this.config.ai.persona = this.config.ai.persona || 'senior-engineer';

    // Processing defaults
    this.config.processing = this.config.processing || {};
    this.config.processing.maxFileSize = this.config.processing.maxFileSize || 1048576; // 1MB
    this.config.processing.chunkSize = this.config.processing.chunkSize || 50000; // 50KB
    this.config.processing.excludePatterns = this.config.processing.excludePatterns || [
      'node_modules/**',
      'build/**',
      'dist/**',
      '*.min.js',
      '*.lock',
      'coverage/**',
    ];

    // Notifications defaults (optional)
    this.config.notifications = this.config.notifications || {};
  }

  /**
   * Validate configuration
   * @throws {Error} - If configuration is invalid
   */
  validateConfig() {
    // Validate AI provider
    const validProviders = [
      'openai',
      'anthropic',
      'google',
      'deepseek',
      'openrouter',
      'xai',
      'groq',
      'zai',
      'together-ai',
      'fireworks-ai',
      'cerebras',
      'mistral-ai',
      'novita',
      'zenmux',
      'atlas-cloud',
      'cohere',
      'minimax',
      'moonshot',
      'upstage',
      'deepinfra'
    ];
    if (!validProviders.includes(this.config.ai.provider)) {
      throw new Error(
        `Invalid AI provider: ${this.config.ai.provider}. Must be one of: ${validProviders.join(', ')}`
      );
    }

    // Validate custom personas if provided
    if (this.config.ai.customPersonas) {
      if (typeof this.config.ai.customPersonas !== 'object') {
        throw new Error('ai.customPersonas must be an object');
      }
      for (const [personaName, prompt] of Object.entries(this.config.ai.customPersonas)) {
        if (typeof prompt !== 'string' || prompt.trim().length === 0) {
          throw new Error(`Custom persona "${personaName}" must have a non-empty string prompt`);
        }
      }
    }

    // Validate file size limits
    if (this.config.processing.maxFileSize <= 0) {
      throw new Error('maxFileSize must be a positive number');
    }

    if (this.config.processing.chunkSize <= 0) {
      throw new Error('chunkSize must be a positive number');
    }

    // Validate Discord webhook URL if provided
    if (this.config.notifications.discordWebhookUrl) {
      try {
        new URL(this.config.notifications.discordWebhookUrl);
      } catch (error) {
        throw new Error('Invalid Discord webhook URL format');
      }
    }

    logger.info('Configuration validation passed');
  }

  /**
   * Deep merge two objects
   * @param {Object} target - Target object
   * @param {Object} source - Source object
   * @returns {Object} - Merged object
   */
  deepMerge(target, source) {
    const result = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  /**
   * Get current configuration
   * @returns {Object} - Current configuration
   */
  getConfig() {
    return this.config;
  }

  /**
   * Save current configuration to file
   */
  saveConfig() {
    try {
      fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2));
      logger.info('Configuration saved to file:', this.configFile);
    } catch (error) {
      logger.error('Failed to save configuration:', error.message);
    }
  }
}

module.exports = ConfigManager;
