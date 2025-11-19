/**
 * AI provider abstraction layer for the AI code reviewer
 */

const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Mistral = require('@mistralai/mistralai');
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
        return new OpenAI({
          apiKey,
          defaultHeaders: {
            'HTTP-Referer': 'https://riffcompiler.com',
            'X-Title': 'BugBeaver',
          },
        });

      case 'anthropic':
        return new Anthropic({
          apiKey,
          defaultHeaders: {
            'HTTP-Referer': 'https://riffcompiler.com',
            'X-Title': 'BugBeaver',
          },
        });

      case 'google':
        return new GoogleGenerativeAI(apiKey, {
          defaultHeaders: {
            'HTTP-Referer': 'https://riffcompiler.com',
            'X-Title': 'BugBeaver',
          },
        });

      case 'deepseek':
        // DeepSeek uses OpenAI-compatible API
        return new OpenAI({
          apiKey,
          baseURL: 'https://api.deepseek.com',
          defaultHeaders: {
            'HTTP-Referer': 'https://riffcompiler.com',
            'X-Title': 'BugBeaver',
          },
        });

      case 'openrouter':
        // OpenRouter uses OpenAI-compatible API
        return new OpenAI({
          apiKey,
          baseURL: 'https://openrouter.ai/api/v1',
          defaultHeaders: {
            'HTTP-Referer': 'https://riffcompiler.com',
            'X-Title': 'BugBeaver',
          },
        });

      case 'xai':
        // xAI uses OpenAI-compatible API
        return new OpenAI({
          apiKey,
          baseURL: 'https://api.x.ai/v1',
          defaultHeaders: {
            'HTTP-Referer': 'https://riffcompiler.com',
            'X-Title': 'BugBeaver',
          },
        });

      case 'groq':
        // Groq uses OpenAI-compatible API
        return new OpenAI({
          apiKey,
          baseURL: 'https://api.groq.com/openai/v1',
          defaultHeaders: {
            'HTTP-Referer': 'https://riffcompiler.com',
            'X-Title': 'BugBeaver',
          },
        });

      case 'zai':
        // Z.ai uses OpenAI-compatible API
        return new OpenAI({
          apiKey,
          baseURL: 'https://api.z.ai/api/paas/v4',
          defaultHeaders: {
            'HTTP-Referer': 'https://riffcompiler.com',
            'X-Title': 'BugBeaver',
          },
        });

      case 'together-ai':
        // Together AI uses OpenAI-compatible API
        return new OpenAI({
          apiKey,
          baseURL: 'https://api.together.xyz/v1',
          defaultHeaders: {
            'HTTP-Referer': 'https://riffcompiler.com',
            'X-Title': 'BugBeaver',
          },
        });

      case 'fireworks-ai':
        // Fireworks AI uses OpenAI-compatible API
        return new OpenAI({
          apiKey,
          baseURL: 'https://api.fireworks.ai/inference/v1',
          defaultHeaders: {
            'HTTP-Referer': 'https://riffcompiler.com',
            'X-Title': 'BugBeaver',
          },
        });

      case 'cerebras':
        // Cerebras uses OpenAI-compatible API
        return new OpenAI({
          apiKey,
          baseURL: 'https://api.cerebras.ai/v1',
          defaultHeaders: {
            'HTTP-Referer': 'https://riffcompiler.com',
            'X-Title': 'BugBeaver',
          },
        });

      case 'mistral-ai':
        return new Mistral({
          apiKey,
          defaultHeaders: {
            'HTTP-Referer': 'https://riffcompiler.com',
            'X-Title': 'BugBeaver',
          },
        });

      case 'novita':
        return new OpenAI({
          apiKey,
          baseURL: 'https://api.novita.ai/openai',
          defaultHeaders: {
            'HTTP-Referer': 'https://riffcompiler.com',
            'X-Title': 'BugBeaver',
          },
        });

      case 'zenmux':
        return new OpenAI({
          apiKey,
          baseURL: 'https://zenmux.ai/api/v1/chat/completions',
          defaultHeaders: {
            'HTTP-Referer': 'https://riffcompiler.com',
            'X-Title': 'BugBeaver',
          },
        });

      case 'atlas-cloud':
        return new OpenAI({
          apiKey,
          baseURL: 'https://api.atlascloud.ai/api/v1/chat/completions',
          defaultHeaders: {
            'HTTP-Referer': 'https://riffcompiler.com',
            'X-Title': 'BugBeaver',
          },
        });

      case 'cohere':
        return new OpenAI({
          apiKey,
          baseURL: 'https://api.cohere.ai/compatibility/v1',
          defaultHeaders: {
            'HTTP-Referer': 'https://riffcompiler.com',
            'X-Title': 'BugBeaver',
          },
        });

      case 'minimax':
        return new OpenAI({
          apiKey,
          baseURL: 'https://api.minimax.io/v1',
          defaultHeaders: {
            'HTTP-Referer': 'https://riffcompiler.com',
            'X-Title': 'BugBeaver',
          },
        });

      case 'moonshot':
        return new OpenAI({
          apiKey,
          baseURL: 'https://api.moonshot.ai/v1',
          defaultHeaders: {
            'HTTP-Referer': 'https://riffcompiler.com',
            'X-Title': 'BugBeaver',
          },
        });

      case 'upstage':
        return new OpenAI({
          apiKey,
          baseURL: 'https://api.upstage.ai/v1',
          defaultHeaders: {
            'HTTP-Referer': 'https://riffcompiler.com',
            'X-Title': 'BugBeaver',
          },
        });

      case 'deepinfra':
        return new OpenAI({
          apiKey,
          baseURL: 'https://api.deepinfra.com/v1/openai',
          defaultHeaders: {
            'HTTP-Referer': 'https://riffcompiler.com',
            'X-Title': 'BugBeaver',
          },
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
      zai: 'ZAI_API_KEY',
      'together-ai': 'TOGETHER_API_KEY',
      'fireworks-ai': 'FIREWORKS_API_KEY',
      'mistral-ai': 'MISTRAL_API_KEY',
      cerebras: 'CEREBRAS_API_KEY',
      novita: 'NOVITA_API_KEY',
      zenmux: 'ZENMUX_API_KEY',
      'atlas-cloud': 'ATLAS_CLOUD_API_KEY',
      cohere: 'COHERE_API_KEY',
      minimax: 'MINIMAX_API_KEY',
      moonshot: 'MOONSHOT_API_KEY',
      upstage: 'UPSTAGE_API_KEY',
      deepinfra: 'DEEPINFRA_API_KEY',
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
    const userPrompt = this.buildUserReviewPrompt(code, context);
    const systemPrompt = this.buildSystemReviewPrompt(language, persona);

    return await errorHandler.withRetry(
      async () => {
        const response = await this.generateResponse(systemPrompt, userPrompt);
        let comments = this.parseReviewResponse(response);
        
        // Apply comment filtering and limits
        comments = this.filterAndLimitComments(comments);
        
        return comments;
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
  buildSystemReviewPrompt(language, persona) {
    const defaultPersonaPrompts = {
      'senior-engineer':
        'You are a senior software engineer reviewing code for critical issues only.',
      'security-expert':
        'You are a security expert reviewing code for security vulnerabilities only.',
      'performance-specialist':
        'You are a performance specialist reviewing code for performance issues only.',
      'accessibility-advocate':
        'You are an accessibility advocate reviewing code for accessibility issues only.',
    };

    // Check if custom persona prompt is provided in config
    let systemPrompt;
    if (this.config.customPersonas && this.config.customPersonas[persona]) {
      systemPrompt = this.config.customPersonas[persona];
    } else {
      systemPrompt = defaultPersonaPrompts[persona] || defaultPersonaPrompts['senior-engineer'];
    }

    return `${systemPrompt}

You are reviewing ${language} code. Be extremely selective and only comment on the most critical issues.

CRITICAL LIMITS:
- Maximum 3-5 comments per review
- Only comment on NEW code (lines with "+")
- Only comment on REMOVED code if it causes problems
- DO NOT comment on: styling, documentation, testing, obvious changes, or positive feedback

SEVERITY RULES:
- "error": Security vulnerabilities, critical bugs, data corruption, breaking changes
- "warning": Performance issues, potential bugs, maintainability problems
- "info": NEVER use "info" severity

Example output format:
[
  {
    "type": "inline|general",
    "content": "Specific issue description",
    "severity": "warning|error", 
    "line_number": 42,
    "suggestion": "How to fix it"
  }
]

Focus on issues that would:
1. Cause security problems
2. Break functionality
3. Cause significant performance issues
4. Introduce maintainability problems

Return ONLY the JSON array, no additional text.`;
  }

  /**
   * Build the review prompt for the AI model
   * @param {string} code - Code to review
   * @param {string} context - Additional context
   * @returns {string} - Formatted prompt
   */
  buildUserReviewPrompt(code, context) {
    return `

Code to review:
\`\`\`
${code}
\`\`\`

${context ? `Additional context: ${context}` : ''}
`;
  }

  /**
   * Generate response from AI model
   * @param {string} systemPrompt - System Prompt to send to AI
   * @param {string} userPrompt - User Prompt to send to AI
   * @returns {Promise<string>} - AI response
   */
  async generateResponse(systemPrompt, userPrompt) {
    switch (this.provider) {
      case 'openai':
      case 'deepseek':
      case 'openrouter':
      case 'xai':
      case 'groq':
      case 'zai':
      case 'together-ai':
      case 'fireworks-ai':
      case 'cerebras':
      case 'novita':
      case 'zenmux':
      case 'atlas-cloud':
      case 'cohere':
      case 'minimax':
      case 'moonshot':
      case 'upstage':
      case 'deepinfra':
        return await this.generateOpenAIResponse(systemPrompt, userPrompt);

      case 'anthropic':
        return await this.generateAnthropicResponse(systemPrompt, userPrompt);

      case 'google':
        return await this.generateGoogleResponse(systemPrompt, userPrompt);

      case 'mistral-ai':
        return await this.generateMistralResponse(systemPrompt, userPrompt);

      default:
        throw new Error(`Unsupported provider: ${this.provider}`);
    }
  }

  /**
   * Generate response using OpenAI-compatible API
   * @param {string} systemPrompt - System Prompt to send to AI
   * @param {string} userPrompt - User Prompt to send to AI
   * @returns {Promise<string>} - AI response
   */
  async generateOpenAIResponse(systemPrompt, userPrompt) {
    const response = await this.client.chat.completions.create({
      model: this.config.model || 'gpt-4',
      messages: [
        { role: 'user', content: userPrompt },
        { role: 'system', content: systemPrompt },
      ],
      temperature: 0.7,
    });

    return response.choices[0].message.content;
  }

  /**
   * Generate response using Anthropic API
   * @param {string} systemPrompt - System Prompt to send to AI
   * @param {string} userPrompt - User Prompt to send to AI
   * @returns {Promise<string>} - AI response
   */
  async generateAnthropicResponse(systemPrompt, userPrompt) {
    const response = await this.client.messages.create({
      model: this.config.model || 'claude-3-sonnet-20240229',
      temperature: 0.7,
      messages: [
        { role: 'user', content: userPrompt },
        { role: 'system', content: systemPrompt },
      ],
    });

    return response.content[0].text;
  }

  /**
   * Generate response using Google AI API
   * @param {string} systemPrompt - System Prompt to send to AI
   * @param {string} userPrompt - User Prompt to send to AI
   * @returns {Promise<string>} - AI response
   */
  async generateGoogleResponse(systemPrompt, userPrompt) {
    const model = this.client.getGenerativeModel({
      model: this.config.model || 'gemini-pro',
    });

    const result = await model.generateContent(`${systemPrompt}\n\n${userPrompt}`);
    return result.response.text();
  }

  /**
   * Generate response using Mistral AI API
   * @param {string} systemPrompt - System Prompt to send to AI
   * @param {string} userPrompt - User Prompt to send to AI
   * @returns {Promise<string>} - AI response
   */
  async generateMistralResponse(systemPrompt, userPrompt) {
    const response = await this.client.chat.completions.create({
      model: this.config.model || 'mistral-large-latest',
      messages: [
        { role: 'user', content: userPrompt },
        { role: 'system', content: systemPrompt },
      ],
      temperature: 0.7,
    });

    return response.choices[0].message.content;
  }

  /**
   * Parse AI response into structured review comments
   * @param {string} response - Raw AI response
   * @returns {Array} - Parsed review comments
   */
  parseReviewResponse(response) {
    try {
      // Clean the response by removing markdown code blocks and extra text
      let cleanResponse = response.trim();

      // Remove markdown code blocks if present
      cleanResponse = cleanResponse.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');

      // Remove any leading/trailing text before/after JSON
      const jsonStart = cleanResponse.indexOf('[');
      const jsonEnd = cleanResponse.lastIndexOf(']');

      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanResponse = cleanResponse.substring(jsonStart, jsonEnd + 1);
      }

      // Try multiple parsing strategies
      const comments = this.tryParseJSON(cleanResponse);
      if (comments) {
        return comments;
      }

      // If no valid comments found, create a general comment
      return this.createFallbackComment(response);
    } catch (error) {
      logger.warn('Failed to parse AI response as JSON, returning general comment:', error.message);
      logger.debug('Raw AI response length:', response.length);

      return this.createFallbackComment(response);
    }
  }

  /**
   * Try multiple strategies to parse JSON from response
   * @param {string} cleanResponse - Cleaned response text
   * @returns {Array|null} - Parsed comments or null if all strategies fail
   */
  tryParseJSON(cleanResponse) {
    const strategies = [
      // Strategy 1: Extract JSON array with regex
      () => {
        const jsonMatch = cleanResponse.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        return null;
      },

      // Strategy 2: Try to fix common JSON issues and parse
      () => {
        let fixed = cleanResponse
          .replace(/,\s*}/g, '}') // Remove trailing commas
          .replace(/,\s*]/g, ']') // Remove trailing commas in arrays
          .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":') // Quote unquoted keys
          .replace(/:\s*'([^']*)'/g, ': "$1"'); // Convert single quotes to double quotes

        return JSON.parse(fixed);
      },

      // Strategy 3: Try to extract individual JSON objects and combine them
      () => {
        const objectMatches = cleanResponse.match(/{[^{}]*}/g);
        if (objectMatches && objectMatches.length > 0) {
          return objectMatches
            .map((match) => {
              try {
                const obj = JSON.parse(match);
                // Ensure required fields are present
                return {
                  type: obj.type || 'general',
                  content: obj.content || 'No content provided',
                  severity: obj.severity || 'info',
                  line_number: obj.line_number || null,
                  suggestion: obj.suggestion || null,
                };
              } catch {
                return null;
              }
            })
            .filter(Boolean);
        }
        return null;
      },
    ];

    for (const strategy of strategies) {
      try {
        const result = strategy();
        if (result && Array.isArray(result) && result.length > 0) {
          return result;
        }
      } catch (error) {
        logger.debug('JSON parsing strategy failed:', error.message);
        continue;
      }
    }

    return null;
  }

  /**
   * Create a fallback comment when JSON parsing fails
   * @param {string} response - Original AI response
   * @returns {Array} - Array with single fallback comment
   */
  createFallbackComment(response) {
    // Clean and truncate the response
    const cleanResponse = response
      .replace(/^```(?:json)?\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim();

    const maxLength = 800; // Increased from 500 for better context
    const truncatedResponse = cleanResponse.substring(0, maxLength);
    const truncated = cleanResponse.length > maxLength;

    // Split into paragraphs and filter out empty lines
    const paragraphs = truncatedResponse
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => line.trim());

    const content =
      paragraphs.length > 0
        ? `AI Review Feedback:\n\n${paragraphs.join('\n\n')}${truncated ? '\n\n[Response truncated]' : ''}`
        : `AI Review Feedback:\n\n${truncatedResponse}${truncated ? '\n\n[Response truncated]' : ''}`;

    return [
      {
        type: 'general',
        content,
        severity: 'info',
        line_number: null,
      },
    ];
  }

  /**
   * Filter and limit comments based on configuration and quality criteria
   * @param {Array} comments - Raw comments from AI
   * @returns {Array} - Filtered and limited comments
   */
  filterAndLimitComments(comments) {
    if (!comments || !Array.isArray(comments) || comments.length === 0) {
      return [];
    }

    // Get limits from config (with defaults)
    const maxComments = this.config?.commentLimits?.maxComments || 5;
    const maxCommentsPerChunk = this.config?.commentLimits?.maxCommentsPerChunk || 2;
    
    // Step 1: Remove info severity comments (not allowed)
    let filtered = comments.filter(comment => 
      comment.severity && comment.severity.toLowerCase() !== 'info'
    );

    // Step 2: Remove duplicate comments (same content)
    filtered = this.removeDuplicateComments(filtered);

    // Step 3: Remove low-quality comments
    filtered = this.removeLowQualityComments(filtered);

    // Step 4: Sort by severity priority
    filtered = this.sortCommentsByPriority(filtered);

    // Step 5: Limit total comments
    filtered = filtered.slice(0, maxComments);

    // Step 6: Apply chunk-specific limits (for future chunk-level filtering)
    return filtered.slice(0, maxCommentsPerChunk);
  }

  /**
   * Remove duplicate comments based on content similarity
   * @param {Array} comments - Comments to deduplicate
   * @returns {Array} - Deduplicated comments
   */
  removeDuplicateComments(comments) {
    const seen = new Set();
    return comments.filter(comment => {
      // Create a simplified hash of the content
      const contentHash = comment.content
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 50); // First 50 chars of cleaned content

      if (seen.has(contentHash)) {
        return false;
      }
      seen.add(contentHash);
      return true;
    });
  }

  /**
   * Remove low-quality comments that don't provide value
   * @param {Array} comments - Comments to filter
   * @returns {Array} - High-quality comments only
   */
  removeLowQualityComments(comments) {
    const lowQualityPatterns = [
      /ensure.*thorough.*testing/i,
      /consider.*discuss.*team/i,
      /might.*affect.*functionality/i,
      /may.*interfere.*existing/i,
      /consider.*adding.*comment/i,
      /the.*change.*improves/i,
      /the.*change.*alters/i,
      /the.*change.*affects/i
    ];

    return comments.filter(comment => {
      const content = comment.content || '';
      return !lowQualityPatterns.some(pattern => pattern.test(content));
    });
  }

  /**
   * Sort comments by priority (error first, then warning)
   * @param {Array} comments - Comments to sort
   * @returns {Array} - Sorted comments
   */
  sortCommentsByPriority(comments) {
    return comments.sort((a, b) => {
      const severityOrder = { 'error': 0, 'warning': 1 };
      const aOrder = severityOrder[a.severity?.toLowerCase()] ?? 2;
      const bOrder = severityOrder[b.severity?.toLowerCase()] ?? 2;
      
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      
      // If same severity, sort by line number (earlier lines first)
      return (a.line_number || 0) - (b.line_number || 0);
    });
  }
}

module.exports = AIProvider;
