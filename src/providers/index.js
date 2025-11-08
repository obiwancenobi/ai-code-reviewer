/**
 * AI provider abstraction layer for the AI code reviewer
 */

const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');
const errorHandler = require('../utils/errorHandler');

class AIProvider {
  constructor(provider, config) {
    this.provider = provider;
    this.config = config;
    this.client = this.initializeClient();
  }

  /**
   * Initialize the appropriate AI client based on provider
   * @returns {Object} - Initialized AI client
   */
  initializeClient() {
    const apiKey = this.getApiKey();

    switch (this.provider) {
      case 'openai':
        return new OpenAI({ apiKey });

      case 'anthropic':
        return new Anthropic({ apiKey });

      case 'google':
        return new GoogleGenerativeAI(apiKey);

      case 'deepseek':
        // DeepSeek uses OpenAI-compatible API
        return new OpenAI({
          apiKey,
          baseURL: 'https://api.deepseek.com'
        });

      case 'openrouter':
        // OpenRouter uses OpenAI-compatible API
        return new OpenAI({
          apiKey,
          baseURL: 'https://openrouter.ai/api/v1'
        });

      case 'xai':
        // xAI uses OpenAI-compatible API
        return new OpenAI({
          apiKey,
          baseURL: 'https://api.x.ai/v1'
        });

      case 'groq':
        // Groq uses OpenAI-compatible API
        return new OpenAI({
          apiKey,
          baseURL: 'https://api.groq.com/openai/v1'
        });

      case 'zai':
        // Z.ai uses OpenAI-compatible API
        return new OpenAI({
          apiKey,
          baseURL: 'https://api.z.ai/v1'
        });

      default:
        throw new Error(`Unsupported AI provider: ${this.provider}`);
    }
  }

  /**
   * Get API key from environment variables
   * @returns {string} - API key
   */
  getApiKey() {
    const keyMap = {
      openai: 'OPENAI_API_KEY',
      anthropic: 'ANTHROPIC_API_KEY',
      google: 'GOOGLE_AI_API_KEY',
      deepseek: 'DEEPSEEK_API_KEY',
      openrouter: 'OPENROUTER_API_KEY',
      xai: 'XAI_API_KEY',
      groq: 'GROQ_API_KEY',
      zai: 'ZAI_API_KEY'
    };

    const envVar = keyMap[this.provider];
    const apiKey = process.env[envVar];

    if (!apiKey) {
      throw new Error(`Missing API key for ${this.provider}. Set ${envVar} environment variable.`);
    }

    return apiKey;
  }

  /**
   * Generate code review comments using AI
   * @param {string} code - Code to review
   * @param {string} language - Programming language
   * @param {string} persona - Reviewer persona
   * @param {string} context - Additional context
   * @returns {Promise<Array>} - Array of review comments
   */
  async reviewCode(code, language, persona = 'senior-engineer', context = '') {
    const prompt = this.buildReviewPrompt(code, language, persona, context);

    return await errorHandler.withRetry(
      async () => {
        const response = await this.generateResponse(prompt);
        return this.parseReviewResponse(response);
      },
      3,
      `AI code review (${this.provider})`
    );
  }

  /**
   * Build the review prompt for the AI model
   * @param {string} code - Code to review
   * @param {string} language - Programming language
   * @param {string} persona - Reviewer persona
   * @param {string} context - Additional context
   * @returns {string} - Formatted prompt
   */
  buildReviewPrompt(code, language, persona, context) {
    const defaultPersonaPrompts = {
      'senior-engineer': 'You are a senior software engineer reviewing code for quality, maintainability, and best practices.',
      'security-expert': 'You are a security expert reviewing code for vulnerabilities, data protection, and secure coding practices.',
      'performance-specialist': 'You are a performance specialist reviewing code for efficiency, scalability, and optimization opportunities.',
      'accessibility-advocate': 'You are an accessibility advocate reviewing code for inclusive design and WCAG compliance.'
    };

    // Check if custom persona prompt is provided in config
    let systemPrompt;
    if (this.config.customPersonas && this.config.customPersonas[persona]) {
      systemPrompt = this.config.customPersonas[persona];
    } else {
      systemPrompt = defaultPersonaPrompts[persona] || defaultPersonaPrompts['senior-engineer'];
    }

    return `${systemPrompt}

Please review the following ${language} code and provide specific, actionable feedback. Focus on:
- Code quality and maintainability
- Potential bugs or issues
- Best practices and conventions
- Performance considerations
- Security implications

Code to review:
\`\`\`${language}
${code}
\`\`\`

${context ? `Additional context: ${context}` : ''}

Provide your review as a JSON array of comment objects with the following structure:
[
  {
    "type": "inline|general",
    "content": "Your review comment",
    "severity": "info|warning|error",
    "line_number": 42,
    "suggestion": "Optional improvement suggestion"
  }
]

Only return the JSON array, no additional text.`;
  }

  /**
   * Generate response from AI model
   * @param {string} prompt - Prompt to send to AI
   * @returns {Promise<string>} - AI response
   */
  async generateResponse(prompt) {
    switch (this.provider) {
      case 'openai':
      case 'deepseek':
      case 'openrouter':
      case 'xai':
      case 'groq':
      case 'zai':
        return await this.generateOpenAIResponse(prompt);

      case 'anthropic':
        return await this.generateAnthropicResponse(prompt);

      case 'google':
        return await this.generateGoogleResponse(prompt);

      default:
        throw new Error(`Unsupported provider: ${this.provider}`);
    }
  }

  /**
   * Generate response using OpenAI-compatible API
   * @param {string} prompt - Prompt to send
   * @returns {Promise<string>} - AI response
   */
  async generateOpenAIResponse(prompt) {
    const response = await this.client.chat.completions.create({
      model: this.config.model || 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.7
    });

    return response.choices[0].message.content;
  }

  /**
   * Generate response using Anthropic API
   * @param {string} prompt - Prompt to send
   * @returns {Promise<string>} - AI response
   */
  async generateAnthropicResponse(prompt) {
    const response = await this.client.messages.create({
      model: this.config.model || 'claude-3-sonnet-20240229',
      max_tokens: 2000,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }]
    });

    return response.content[0].text;
  }

  /**
   * Generate response using Google AI API
   * @param {string} prompt - Prompt to send
   * @returns {Promise<string>} - AI response
   */
  async generateGoogleResponse(prompt) {
    const model = this.client.getGenerativeModel({
      model: this.config.model || 'gemini-pro'
    });

    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  /**
   * Parse AI response into structured review comments
   * @param {string} response - Raw AI response
   * @returns {Array} - Parsed review comments
   */
  parseReviewResponse(response) {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback: try parsing the entire response as JSON
      return JSON.parse(response);
    } catch (error) {
      logger.warn('Failed to parse AI response as JSON, returning general comment:', error.message);
      return [{
        type: 'general',
        content: response.substring(0, 500), // Limit length
        severity: 'info'
      }];
    }
  }
}

module.exports = AIProvider;