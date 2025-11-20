/**
 * Integration tests for line number accuracy in AI code review
 */

const AIReviewService = require('../../../src/services/aiReviewService');
const GitHubClient = require('../../../src/github/client');

// Mock AI provider that returns specific line numbers for testing
class MockAIProvider {
  constructor(provider, config) {
    this.provider = provider;
    this.config = config;
  }

  async reviewCode(code, language, persona, context) {
    const lines = code.split('\n');
    const comments = [];

    // Generate test comments at specific line numbers
    for (let i = 0; i < lines.length && comments.length < 3; i++) {
      const line = lines[i];
      
      // Look for patterns that would trigger comments
      if (line.includes('const') && line.includes('=')) {
        comments.push({
          type: 'inline',
          content: `Consider using let instead of const for variable: ${line.trim()}`,
          severity: 'warning',
          line_number: i + 1,
          suggestion: 'Use let for mutable bindings'
        });
      }
    }

    return comments;
  }
}

// Mock file processor
const mockFileProcessor = {
  shouldExcludeFile: () => false,
  detectLanguage: () => 'javascript'
};

// Mock GitHub client
const mockGitHubClient = {
  createReviewComment: jest.fn(),
  createIssueComment: jest.fn()
};

describe('AIReviewService Line Number Accuracy', () => {
  let service;
  let config;

  beforeEach(() => {
    config = {
      ai: {
        provider: 'mock',
        model: 'test-model',
        persona: 'senior-engineer'
      },
      processing: {
        chunkSize: 1000,
        maxFileSize: 1000000,
        excludePatterns: []
      }
    };

    // Replace real dependencies with mocks
    jest.doMock('../../../src/providers/index', () => MockAIProvider);
    jest.doMock('../../../src/utils/fileProcessor', () => mockFileProcessor);
    jest.doMock('../../../src/github/client', () => mockGitHubClient);

    service = new AIReviewService(config);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Patch Content Processing', () => {
    test('should correctly map patch line numbers to original file lines', async () => {
      // Simulate GitHub patch content
      const mockFile = {
        filename: 'src/test.js',
        status: 'modified',
        patch: `@@ -5,3 +5,3 @@
 function test() {
-  const old = "old value";
+  const new = "new value";
   console.log(result);
 }`,
        additions: 1,
        deletions: 1,
        size: 150,
        language: 'javascript'
      };

      const mockPrDetails = {
        number: 123,
        head: { sha: 'abc123' }
      };

      const result = await service.reviewFile(mockFile, mockPrDetails);

      // Verify that comments were generated
      expect(result.comments).toBeDefined();
      expect(result.comments.length).toBeGreaterThan(0);

      // Verify line numbers are within reasonable bounds
      result.comments.forEach(comment => {
        expect(comment.line).toBeDefined();
        expect(comment.line).toBeGreaterThan(0);
        expect(comment.line).toBeLessThan(20); // Should not exceed reasonable file size
        expect(comment.path).toBe('src/test.js');
      });

      // Verify that patch parsing was attempted
      expect(result.comments.some(c => c.path === 'src/test.js')).toBe(true);
    });

    test('should handle patch with multiple hunks correctly', async () => {
      const mockFile = {
        filename: 'src/multi-hunk.js',
        status: 'modified',
        patch: `@@ -10,2 +10,2 @@
-const removed = 1;
+const modified = 2;
 const same = 3;
@@ -20,2 +20,2 @@
-const oldFunc = () => {};
+const newFunc = () => {};
   return result;
 }`,
        additions: 2,
        deletions: 2,
        size: 200,
        language: 'javascript'
      };

      const mockPrDetails = {
        number: 124,
        head: { sha: 'def456' }
      };

      const result = await service.reviewFile(mockFile, mockPrDetails);

      expect(result.comments).toBeDefined();
      
      // Comments should have line numbers corresponding to original file lines
      result.comments.forEach(comment => {
        expect(comment.line).toBeGreaterThan(0);
        expect(comment.line).toBeLessThan(30); // File has lines 1-25 roughly
      });
    });

    test('should fallback to general comments for invalid line numbers', async () => {
      const mockFile = {
        filename: 'src/invalid.js',
        status: 'modified',
        patch: `@@ -1,1 +1,1 @@
+const x = 1;`,
        additions: 1,
        deletions: 0,
        size: 50,
        language: 'javascript'
      };

      const mockPrDetails = {
        number: 125,
        head: { sha: 'ghi789' }
      };

      // This would test the edge case where line mapping fails
      const result = await service.reviewFile(mockFile, mockPrDetails);

      // Should still produce comments but with validated line numbers
      expect(result.comments).toBeDefined();
      
      // If line mapping failed, comments should have null lines and be filtered out
      // or should fallback to general comments
      const hasValidComments = result.comments.some(c => c.line !== null);
      expect(hasValidComments || result.comments.length === 0).toBe(true);
    });
  });

  describe('Full Content Processing', () => {
    test('should handle full file content with accurate line numbers', async () => {
      const mockFile = {
        filename: 'src/full-content.js',
        status: 'modified',
        content: `function example() {
  const x = 1;
  const y = 2;
  const z = x + y;
  return z;
}`,
        patch: '', // Empty patch, should use full content
        additions: 4,
        deletions: 0,
        size: 100,
        language: 'javascript'
      };

      const mockPrDetails = {
        number: 126,
        head: { sha: 'jkl012' }
      };

      const result = await service.reviewFile(mockFile, mockPrDetails);

      expect(result.comments).toBeDefined();
      
      // Comments should have line numbers within file bounds (1-6 lines)
      result.comments.forEach(comment => {
        expect(comment.line).toBeGreaterThan(0);
        expect(comment.line).toBeLessThanOrEqual(6); // File has 6 lines
      });
    });
  });

  describe('Line Number Validation', () => {
    test('should validate line numbers against file boundaries', () => {
      const mockFile = {
        filename: 'src/validation.js',
        size: 500
      };

      // Test valid line numbers
      expect(service.validateCommentLineNumber(1, mockFile)).toBe(1);
      expect(service.validateCommentLineNumber(50, mockFile)).toBe(50);
      expect(service.validateCommentLineNumber(100, mockFile)).toBe(100);

      // Test invalid line numbers
      expect(service.validateCommentLineNumber(0, mockFile)).toBeNull();
      expect(service.validateCommentLineNumber(-1, mockFile)).toBeNull();
      expect(service.validateCommentLineNumber(2000, mockFile)).toBeNull(); // Too high for 500 byte file
    });

    test('should handle edge cases in line number validation', () => {
      const mockFile = {
        filename: 'src/edge.js'
      };

      expect(service.validateCommentLineNumber(null, mockFile)).toBeNull();
      expect(service.validateCommentLineNumber(undefined, mockFile)).toBeNull();
      expect(service.validateCommentLineNumber('', mockFile)).toBeNull();
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed patch gracefully', async () => {
      const mockFile = {
        filename: 'src/malformed.js',
        status: 'modified',
        patch: 'invalid patch content',
        additions: 1,
        deletions: 1,
        size: 100,
        language: 'javascript'
      };

      const mockPrDetails = {
        number: 127,
        head: { sha: 'mno345' }
      };

      const result = await service.reviewFile(mockFile, mockPrDetails);

      // Should handle error gracefully, possibly returning no comments
      expect(result).toBeDefined();
      expect(result.file).toBe('src/malformed.js');
      expect(Array.isArray(result.comments)).toBe(true);
    });

    test('should handle empty or missing content', async () => {
      const mockFile = {
        filename: 'src/empty.js',
        status: 'modified',
        patch: '',
        content: '',
        additions: 0,
        deletions: 0,
        size: 0,
        language: 'javascript'
      };

      const mockPrDetails = {
        number: 128,
        head: { sha: 'pqr678' }
      };

      const result = await service.reviewFile(mockFile, mockPrDetails);

      // Should skip file with no content
      expect(result.comments).toHaveLength(0);
    });
  });
});