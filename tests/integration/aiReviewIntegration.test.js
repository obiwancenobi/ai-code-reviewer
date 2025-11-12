// tests/integration/aiReviewIntegration.test.js

const AIReviewService = require('../../src/services/aiReviewService');
const ReviewConfig = require('../../src/config/reviewConfig');
const process = require('process');

jest.mock('../../src/providers/index');
jest.mock('../../src/utils/fileProcessor');
jest.mock('../../src/utils/logger');
jest.mock('../../src/utils/errorHandler');

const MockAIProvider = require('../../src/providers/index');
const MockFileProcessor = require('../../src/utils/fileProcessor');

describe('AIReviewService Integration', () => {
  let config;
  let service;
  let mockProvider;

  beforeEach(() => {
    config = ReviewConfig.mergeWithDefaults({
      ai: {
        provider: 'openai',
        model: 'gpt-4',
        persona: 'senior-engineer'
      },
      processing: {
        maxFileSize: 1048576,
        chunkSize: 50000,
        excludePatterns: []
      }
    });

    mockProvider = {
      reviewCode: jest.fn().mockResolvedValue([
        {
          type: 'inline',
          content: 'Test comment',
          severity: 'info',
          line_number: 10,
          suggestion: 'Test suggestion'
        }
      ])
    };

    MockAIProvider.mockImplementation(() => mockProvider);
    MockFileProcessor.shouldExcludeFile.mockReturnValue(false);
    MockFileProcessor.detectLanguage.mockReturnValue('javascript');
    MockFileProcessor.splitIntoChunks.mockReturnValue(['chunk1', 'chunk2']);

    service = new AIReviewService(config);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.TOGETHER_API_KEY;
    delete process.env.FIREWORKS_API_KEY;
    delete process.env.MISTRAL_API_KEY;
    delete process.env.CEREBRAS_API_KEY;
  });

  it('should process PR with new provider (together-ai)', async () => {
    const files = [
      {
        filename: 'test.js',
        status: 'added',
        additions: 10,
        deletions: 0,
        size: 1000,
        patch: 'console.log("test");'
      }
    ];
    const prDetails = { number: 123, head: { sha: 'abc123' } };

    config.ai.provider = 'together-ai';
    service = new AIReviewService(config);

    const result = await service.reviewPullRequest(files, prDetails);

    expect(result.processedFiles).toBe(1);
    expect(result.comments.length).toBeGreaterThan(0);
    expect(MockAIProvider).toHaveBeenCalledWith('together-ai', config.ai);
    expect(mockProvider.reviewCode).toHaveBeenCalled();
  });

  it('should process PR with Mistral AI', async () => {
    const files = [
      {
        filename: 'test.py',
        status: 'modified',
        additions: 5,
        deletions: 2,
        size: 500,
        patch: 'print("test")'
      }
    ];
    const prDetails = { number: 456, head: { sha: 'def456' } };

    config.ai.provider = 'mistral-ai';
    config.ai.model = 'mistral-large-latest';
    service = new AIReviewService(config);

    const result = await service.reviewPullRequest(files, prDetails);

    expect(result.processedFiles).toBe(1);
    expect(result.comments.length).toBeGreaterThan(0);
    expect(MockAIProvider).toHaveBeenCalledWith('mistral-ai', config.ai);
  });

  it('should handle large file chunking with new provider', async () => {
    const files = [
      {
        filename: 'large.js',
        status: 'added',
        additions: 100,
        deletions: 0,
        size: 60000,
        patch: 'a = 1;\n'.repeat(3000) // Simulate large content
      }
    ];
    const prDetails = { number: 789, head: { sha: 'ghi789' } };

    config.ai.provider = 'fireworks-ai';
    service = new AIReviewService(config);

    MockFileProcessor.splitIntoChunks.mockReturnValue(['chunk1', 'chunk2', 'chunk3']);

    const result = await service.reviewPullRequest(files, prDetails);

    expect(result.processedFiles).toBe(1);
    expect(mockProvider.reviewCode).toHaveBeenCalledTimes(3); // One call per chunk
  });

  it('should skip excluded files', async () => {
    const files = [
      {
        filename: 'node_modules/test.js',
        status: 'added',
        size: 1000,
        patch: 'console.log("test");'
      },
      {
        filename: 'src/app.js',
        status: 'added',
        size: 1000,
        patch: 'console.log("app");'
      }
    ];
    const prDetails = { number: 101, head: { sha: 'jkl101' } };

    config.processing.excludePatterns = ['node_modules/**'];
    MockFileProcessor.shouldExcludeFile.mockImplementation(filename => filename.startsWith('node_modules/'));

    const result = await service.reviewPullRequest(files, prDetails);

    expect(result.processedFiles).toBe(1); // Only app.js
    expect(result.skippedFiles).toBe(1);
  });

  it('should handle errors gracefully', async () => {
    const files = [
      {
        filename: 'error.js',
        status: 'added',
        size: 1000,
        patch: 'console.log("error");'
      }
    ];
    const prDetails = { number: 202, head: { sha: 'mno202' } };

    mockProvider.reviewCode.mockRejectedValue(new Error('API error'));

    const result = await service.reviewPullRequest(files, prDetails);

    expect(result.processedFiles).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should log provider and model on initialization', () => {
    const logSpy = jest.spyOn(require('../../src/utils/logger'), 'info').mockImplementation(() => {});
    service = new AIReviewService(config);
    expect(logSpy).toHaveBeenCalledWith('Initialized AIReviewService with provider: openai, model: gpt-4');
  });

  it('should log routing for new provider', async () => {
    const logSpy = jest.spyOn(require('../../src/utils/logger'), 'info').mockImplementation(() => {});
    const files = [{ filename: 'test.js', status: 'added', size: 1000, patch: 'test' }];
    const prDetails = { number: 303, head: { sha: 'pqr303' } };

    config.ai.provider = 'cerebras';
    service = new AIReviewService(config);

    await service.reviewPullRequest(files, prDetails);

    expect(logSpy).toHaveBeenCalledWith('Routing review for test.js to cerebras with model gpt-4');
  });
});