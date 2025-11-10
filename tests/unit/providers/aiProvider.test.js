// tests/unit/providers/aiProvider.test.js

const AIProvider = require('../../src/providers/index');
const process = require('process');

jest.mock('openai');
jest.mock('@anthropic-ai/sdk');
jest.mock('@google/generative-ai');
jest.mock('@mistralai/mistralai');
jest.mock('../../src/utils/logger');
jest.mock('../../src/utils/errorHandler');

const MockOpenAI = require('openai');
const MockAnthropic = require('@anthropic-ai/sdk');
const MockGoogleGenerativeAI = require('@google/generative-ai');
const MockMistral = require('@mistralai/mistralai');

describe('AIProvider', () => {
  const config = {
    ai: {
      provider: 'openai',
      model: 'gpt-4',
      persona: 'senior-engineer'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    process.env.GOOGLE_AI_API_KEY = 'test-google-key';
    process.env.TOGETHER_API_KEY = 'test-together-key';
    process.env.FIREWORKS_API_KEY = 'test-fireworks-key';
    process.env.MISTRAL_API_KEY = 'test-mistral-key';
    process.env.CEREBRAS_API_KEY = 'test-cerebras-key';
  });

  describe('initializeClient', () => {
    it('should initialize OpenAI client', () => {
      const provider = new AIProvider('openai', config);
      expect(provider.client).toBeInstanceOf(MockOpenAI);
      expect(MockOpenAI).toHaveBeenCalledWith({ apiKey: 'test-openai-key' });
    });

    it('should initialize Anthropic client', () => {
      const newConfig = { ...config, ai: { ...config.ai, provider: 'anthropic' } };
      const provider = new AIProvider('anthropic', newConfig);
      expect(provider.client).toBeInstanceOf(MockAnthropic);
      expect(MockAnthropic).toHaveBeenCalledWith({ apiKey: 'test-anthropic-key' });
    });

    it('should initialize Google client', () => {
      const newConfig = { ...config, ai: { ...config.ai, provider: 'google' } };
      const provider = new AIProvider('google', newConfig);
      expect(provider.client).toBeInstanceOf(MockGoogleGenerativeAI);
      expect(MockGoogleGenerativeAI).toHaveBeenCalledWith('test-google-key');
    });

    it('should initialize Together AI client with OpenAI SDK', () => {
      const newConfig = { ...config, ai: { ...config.ai, provider: 'together-ai' } };
      const provider = new AIProvider('together-ai', newConfig);
      expect(provider.client).toBeInstanceOf(MockOpenAI);
      expect(MockOpenAI).toHaveBeenCalledWith({
        apiKey: 'test-together-key',
        baseURL: 'https://api.together.xyz/v1'
      });
    });

    it('should initialize Fireworks AI client with OpenAI SDK', () => {
      const newConfig = { ...config, ai: { ...config.ai, provider: 'fireworks-ai' } };
      const provider = new AIProvider('fireworks-ai', newConfig);
      expect(provider.client).toBeInstanceOf(MockOpenAI);
      expect(MockOpenAI).toHaveBeenCalledWith({
        apiKey: 'test-fireworks-key',
        baseURL: 'https://api.fireworks.ai/inference/v1'
      });
    });

    it('should initialize Cerebras AI client with OpenAI SDK', () => {
      const newConfig = { ...config, ai: { ...config.ai, provider: 'cerebras-ai' } };
      const provider = new AIProvider('cerebras-ai', newConfig);
      expect(provider.client).toBeInstanceOf(MockOpenAI);
      expect(MockOpenAI).toHaveBeenCalledWith({
        apiKey: 'test-cerebras-key',
        baseURL: 'https://api.cerebras.ai/v1'
      });
    });

    it('should initialize Mistral AI client', () => {
      const newConfig = { ...config, ai: { ...config.ai, provider: 'mistral-ai' } };
      const provider = new AIProvider('mistral-ai', newConfig);
      expect(provider.client).toBeInstanceOf(MockMistral);
      expect(MockMistral).toHaveBeenCalledWith({ apiKey: 'test-mistral-key' });
    });

    it('should throw error for unsupported provider', () => {
      const newConfig = { ...config, ai: { ...config.ai, provider: 'unsupported' } };
      expect(() => new AIProvider('unsupported', newConfig)).toThrow('Unsupported AI provider: unsupported');
    });
  });

  describe('getApiKey', () => {
    it('should return API key for existing providers', () => {
      const provider = new AIProvider('openai', config);
      expect(provider.getApiKey()).toBe('test-openai-key');
    });

    it('should return API key for new providers', () => {
      const newConfig = { ...config, ai: { ...config.ai, provider: 'together-ai' } };
      const provider = new AIProvider('together-ai', newConfig);
      expect(provider.getApiKey()).toBe('test-together-key');
    });

    it('should throw error for missing API key', () => {
      delete process.env.TOGETHER_API_KEY;
      const newConfig = { ...config, ai: { ...config.ai, provider: 'together-ai' } };
      const provider = new AIProvider('together-ai', newConfig);
      expect(() => provider.getApiKey()).toThrow('Missing API key for together-ai. Set TOGETHER_API_KEY environment variable.');
    });
  });

  describe('generateResponse', () => {
    beforeEach(() => {
      MockOpenAI.prototype.chat.completions.create = jest.fn().mockResolvedValue({
        choices: [{ message: { content: 'test response' } }]
      });
      MockAnthropic.prototype.messages.create = jest.fn().mockResolvedValue({
        content: [{ text: 'test response' }]
      });
      MockGoogleGenerativeAI.prototype.getGenerativeModel = jest.fn().mockReturnValue({
        generateContent: jest.fn().mockResolvedValue({ response: { text: () => 'test response' } })
      });
      MockMistral.prototype.chat.completions.create = jest.fn().mockResolvedValue({
        choices: [{ message: { content: 'test response' } }]
      });
    });

    it('should generate OpenAI-compatible response for new providers', async () => {
      const newConfig = { ...config, ai: { ...config.ai, provider: 'fireworks-ai' } };
      const provider = new AIProvider('fireworks-ai', newConfig);
      const response = await provider.generateResponse('test prompt');
      expect(response).toBe('test response');
      expect(MockOpenAI.prototype.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'test prompt' }],
        temperature: 0.7
      });
    });

    it('should generate Mistral response', async () => {
      const newConfig = { ...config, ai: { ...config.ai, provider: 'mistral-ai' } };
      const provider = new AIProvider('mistral-ai', newConfig);
      const response = await provider.generateResponse('test prompt');
      expect(response).toBe('test response');
      expect(MockMistral.prototype.chat.completions.create).toHaveBeenCalledWith({
        model: 'mistral-large-latest',
        messages: [{ role: 'user', content: 'test prompt' }],
        temperature: 0.7
      });
    });
  });

  describe('reviewCode', () => {
    it('should review code with new provider', async () => {
      const newConfig = { ...config, ai: { ...config.ai, provider: 'together-ai' } };
      const provider = new AIProvider('together-ai', newConfig);
      const mockResponse = [{ type: 'inline', content: 'test comment', severity: 'info', line_number: 10 }];
      jest.spyOn(provider, 'generateResponse').mockResolvedValue(JSON.stringify(mockResponse));
      jest.spyOn(provider, 'parseReviewResponse').mockReturnValue(mockResponse);

      const comments = await provider.reviewCode('test code', 'js', 'senior-engineer');
      expect(comments).toEqual(mockResponse);
    });
  });
});