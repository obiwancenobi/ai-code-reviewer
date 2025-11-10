/**
 * Review configuration schema and validation
 */

const logger = require('../utils/logger');

class ReviewConfig {
  constructor() {
    this.schema = {
      ai: {
        provider: { type: 'string', required: true, enum: ['openai', 'anthropic', 'google', 'deepseek', 'openrouter', 'xai', 'groq', 'zai', 'together-ai', 'fireworks-ai', 'mistral-ai', 'cerebras-ai'] },
        model: { type: 'string', required: true },
        persona: { type: 'string', required: false, default: 'senior-engineer' }
      },
      processing: {
        maxFileSize: { type: 'number', required: false, default: 1048576 },
        chunkSize: { type: 'number', required: false, default: 50000 },
        excludePatterns: { type: 'array', required: false, default: ['node_modules/**', 'build/**', 'dist/**', '*.min.js', '*.lock', 'DerivedData/**', '.gradle/**', 'Pods/**', 'Carthage/**', 'xcuserdata/**', '*.xcuserdatad/**', '*.iml', '.dart_tool/**', 'platforms/**', 'plugins/**', '__pycache__/**', '*.pyc', 'target/**', '*.class', '[Bb]in/**', '[Oo]bj/**', '*.exe', 'vendor/**', '.next/**', '.nuxt/**', 'out/**', '.cache/**', '.bundle/**', 'tmp/**', 'log/**'] }
      },
      notifications: {
        discordWebhookUrl: { type: 'string', required: false, format: 'url' }
      }
    };
  }

  /**
   * Validate configuration against schema
   * @param {Object} config - Configuration to validate
   * @returns {Object} - Validation result
   */
  validate(config) {
    const errors = [];
    const warnings = [];

    // Validate AI section
    if (!config.ai) {
      errors.push('Missing required "ai" configuration section');
    } else {
      if (!config.ai.provider) {
        errors.push('Missing required "ai.provider"');
      } else if (!this.schema.ai.provider.enum.includes(config.ai.provider)) {
        errors.push(`Invalid ai.provider "${config.ai.provider}". Must be one of: ${this.schema.ai.provider.enum.join(', ')}`);
      }

      if (!config.ai.model) {
        errors.push('Missing required "ai.model"');
      }

      if (config.ai.persona && !this.schema.ai.persona.enum.includes(config.ai.persona)) {
        warnings.push(`Unknown ai.persona "${config.ai.persona}". Using default persona.`);
      }
    }

    // Validate processing section
    if (config.processing) {
      if (config.processing.maxFileSize && (typeof config.processing.maxFileSize !== 'number' || config.processing.maxFileSize <= 0)) {
        errors.push('processing.maxFileSize must be a positive number');
      }

      if (config.processing.chunkSize && (typeof config.processing.chunkSize !== 'number' || config.processing.chunkSize <= 0)) {
        errors.push('processing.chunkSize must be a positive number');
      }

      if (config.processing.excludePatterns && !Array.isArray(config.processing.excludePatterns)) {
        errors.push('processing.excludePatterns must be an array');
      }
    }

    // Validate notifications section
    if (config.notifications && config.notifications.discordWebhookUrl) {
      try {
        new URL(config.notifications.discordWebhookUrl);
      } catch (error) {
        errors.push('notifications.discordWebhookUrl must be a valid URL');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get default configuration
   * @returns {Object} - Default configuration
   */
  getDefaults() {
    return {
      ai: {
        provider: 'openai',
        model: 'gpt-4',
        persona: 'senior-engineer'
      },
      processing: {
        maxFileSize: 1048576,
        chunkSize: 50000,
        excludePatterns: [
          'node_modules/**',
          'build/**',
          'dist/**',
          '*.min.js',
          '*.lock',
          'coverage/**'
        ]
      },
      notifications: {}
    };
  }

  /**
   * Merge configuration with defaults
   * @param {Object} config - User configuration
   * @returns {Object} - Merged configuration
   */
  mergeWithDefaults(config) {
    const defaults = this.getDefaults();

    return {
      ai: { ...defaults.ai, ...(config.ai || {}) },
      processing: { ...defaults.processing, ...(config.processing || {}) },
      notifications: { ...defaults.notifications, ...(config.notifications || {}) }
    };
  }

  /**
   * Get available AI providers
   * @returns {Array<string>} - List of supported providers
   */
  getAvailableProviders() {
    return this.schema.ai.provider.enum;
  }

  /**
   * Get available reviewer personas
   * @returns {Array<string>} - List of available personas
   */
  getAvailablePersonas() {
    return ['senior-engineer', 'security-expert', 'performance-specialist', 'accessibility-advocate'];
  }

  /**
   * Get model recommendations for a provider
   * @param {string} provider - AI provider
   * @returns {Array<string>} - Recommended models
   */
  getRecommendedModels(provider) {
    const recommendations = {
      openai: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      anthropic: ['claude-3-sonnet', 'claude-3-haiku'],
      google: ['gemini-pro', 'gemini-pro-vision'],
      deepseek: ['deepseek-chat', 'deepseek-coder'],
      openrouter: ['openrouter-model'],
      xai: ['grok-1', 'grok-beta'],
      groq: ['llama2-70b', 'mixtral-8x7b'],
      zai: ['z-model-1'],
      'together-ai': ['meta-llama/Llama-2-70b-chat-hf', 'codellama/CodeLlama-7b-Instruct-hf'],
      'fireworks-ai': ['accounts/fireworks/models/llama-v3p1-405b', 'accounts/fireworks/models/mixtral-8x7b-instruct'],
      'mistral-ai': ['mistral-large-latest', 'open-mistral-7b'],
      'cerebras-ai': ['llama-3.1-8b', 'mixtral-8x7b']
    };

    return recommendations[provider] || [];
  }
}

module.exports = new ReviewConfig();