/**
 * Configuration validation utilities
 */

const reviewConfig = require('./reviewConfig');
const logger = require('../utils/logger');

class ConfigValidator {
  constructor() {
    this.validators = {
      ai: this.validateAIConfig.bind(this),
      processing: this.validateProcessingConfig.bind(this),
      notifications: this.validateNotificationsConfig.bind(this)
    };
  }

  /**
   * Validate entire configuration
   * @param {Object} config - Configuration to validate
   * @returns {Object} - Validation result
   */
  validate(config) {
    const result = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Validate each section
    for (const [section, validator] of Object.entries(this.validators)) {
      if (config[section]) {
        const sectionResult = validator(config[section]);
        result.errors.push(...sectionResult.errors);
        result.warnings.push(...sectionResult.warnings);
      }
    }

    // Cross-section validations
    const crossResult = this.validateCrossSection(config);
    result.errors.push(...crossResult.errors);
    result.warnings.push(...crossResult.warnings);

    result.isValid = result.errors.length === 0;

    if (!result.isValid) {
      logger.error('Configuration validation failed:', result.errors);
    } else if (result.warnings.length > 0) {
      logger.warn('Configuration warnings:', result.warnings);
    } else {
      logger.info('Configuration validation passed');
    }

    return result;
  }

  /**
   * Validate AI configuration section
   * @param {Object} aiConfig - AI configuration
   * @returns {Object} - Validation result
   */
  validateAIConfig(aiConfig) {
    const result = { errors: [], warnings: [] };

    if (!aiConfig.provider) {
      result.errors.push('AI provider is required');
    } else if (!reviewConfig.getAvailableProviders().includes(aiConfig.provider)) {
      result.errors.push(`Invalid AI provider: ${aiConfig.provider}`);
    }

    if (!aiConfig.model) {
      result.errors.push('AI model is required');
    }

    // Check if persona is a built-in persona or a custom persona
    const availablePersonas = reviewConfig.getAvailablePersonas();
    const isBuiltInPersona = availablePersonas.includes(aiConfig.persona);
    const isCustomPersona = aiConfig.customPersonas && aiConfig.customPersonas[aiConfig.persona];

    if (aiConfig.persona && !isBuiltInPersona && !isCustomPersona) {
      result.warnings.push(`Unknown AI persona: ${aiConfig.persona}`);
    }

    return result;
  }

  /**
   * Validate processing configuration section
   * @param {Object} processingConfig - Processing configuration
   * @returns {Object} - Validation result
   */
  validateProcessingConfig(processingConfig) {
    const result = { errors: [], warnings: [] };

    if (processingConfig.maxFileSize !== undefined) {
      if (typeof processingConfig.maxFileSize !== 'number' || processingConfig.maxFileSize <= 0) {
        result.errors.push('maxFileSize must be a positive number');
      } else if (processingConfig.maxFileSize > 10 * 1024 * 1024) { // 10MB
        result.warnings.push('maxFileSize is very large, may impact performance');
      }
    }

    if (processingConfig.chunkSize !== undefined) {
      if (typeof processingConfig.chunkSize !== 'number' || processingConfig.chunkSize <= 0) {
        result.errors.push('chunkSize must be a positive number');
      } else if (processingConfig.chunkSize < 1000) {
        result.warnings.push('chunkSize is very small, may result in too many chunks');
      } else if (processingConfig.chunkSize > 100000) {
        result.warnings.push('chunkSize is very large, may exceed AI context limits');
      }
    }

    if (processingConfig.excludePatterns) {
      if (!Array.isArray(processingConfig.excludePatterns)) {
        result.errors.push('excludePatterns must be an array');
      } else {
        processingConfig.excludePatterns.forEach((pattern, index) => {
          if (typeof pattern !== 'string') {
            result.errors.push(`excludePatterns[${index}] must be a string`);
          }
        });
      }
    }

    return result;
  }

  /**
   * Validate notifications configuration section
   * @param {Object} notificationsConfig - Notifications configuration
   * @returns {Object} - Validation result
   */
  validateNotificationsConfig(notificationsConfig) {
    const result = { errors: [], warnings: [] };

    if (notificationsConfig.discordWebhookUrl) {
      try {
        new URL(notificationsConfig.discordWebhookUrl);
        if (!notificationsConfig.discordWebhookUrl.includes('discord.com/api/webhooks')) {
          result.warnings.push('discordWebhookUrl does not appear to be a Discord webhook URL');
        }
      } catch (error) {
        result.errors.push('discordWebhookUrl must be a valid URL');
      }
    }

    return result;
  }

  /**
   * Validate cross-section relationships
   * @param {Object} config - Full configuration
   * @returns {Object} - Validation result
   */
  validateCrossSection(config) {
    const result = { errors: [], warnings: [] };

    // Check if chunkSize is larger than maxFileSize
    if (config.processing?.chunkSize && config.processing?.maxFileSize) {
      if (config.processing.chunkSize > config.processing.maxFileSize) {
        result.warnings.push('chunkSize is larger than maxFileSize, which may cause issues');
      }
    }

    // Check if AI provider supports the specified model
    if (config.ai?.provider && config.ai?.model) {
      const recommendedModels = reviewConfig.getRecommendedModels(config.ai.provider);
      if (recommendedModels.length > 0 && !recommendedModels.includes(config.ai.model)) {
        result.warnings.push(`Model "${config.ai.model}" is not in the recommended list for provider "${config.ai.provider}"`);
      }
    }

    return result;
  }

  /**
   * Validate environment variables for sensitive data
   * @returns {Object} - Validation result
   */
  validateEnvironment() {
    const result = { errors: [], warnings: [], isValid: true };
    const requiredEnvVars = ['GITHUB_TOKEN'];

    // Check required environment variables
    requiredEnvVars.forEach(envVar => {
      if (!process.env[envVar]) {
        result.errors.push(`Required environment variable ${envVar} is not set`);
      }
    });

    // Check AI provider specific variables
    const aiProvider = process.env.AI_PROVIDER || 'openai';
    const providerEnvVars = {
      openai: ['OPENAI_API_KEY'],
      anthropic: ['ANTHROPIC_API_KEY'],
      google: ['GOOGLE_AI_API_KEY'],
      deepseek: ['DEEPSEEK_API_KEY'],
      openrouter: ['OPENROUTER_API_KEY'],
      xai: ['XAI_API_KEY'],
      groq: ['GROQ_API_KEY'],
      zai: ['ZAI_API_KEY']
    };

    const requiredVars = providerEnvVars[aiProvider];
    if (requiredVars) {
      requiredVars.forEach(envVar => {
        if (!process.env[envVar]) {
          result.errors.push(`Required environment variable ${envVar} is not set for provider ${aiProvider}`);
        }
      });
    }

    // Check optional variables
    if (process.env.DISCORD_WEBHOOK_URL) {
      try {
        new URL(process.env.DISCORD_WEBHOOK_URL);
      } catch (error) {
        result.errors.push('DISCORD_WEBHOOK_URL is not a valid URL');
      }
    }

    // Set isValid based on errors
    result.isValid = result.errors.length === 0;

    return result;
  }

  /**
   * Get validation summary
   * @param {Object} result - Validation result
   * @returns {string} - Summary message
   */
  getSummary(result) {
    const parts = [];

    if (result.errors.length > 0) {
      parts.push(`${result.errors.length} errors`);
    }

    if (result.warnings.length > 0) {
      parts.push(`${result.warnings.length} warnings`);
    }

    if (parts.length === 0) {
      return 'Configuration is valid';
    }

    return `Configuration has ${parts.join(' and ')}`;
  }
}

module.exports = ConfigValidator;