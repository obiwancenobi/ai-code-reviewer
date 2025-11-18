/**
 * File processing utilities for the AI code reviewer
 */

const fs = require('fs').promises;
const path = require('path');
const { Minimatch } = require('minimatch');
const logger = require('./logger');

class FileProcessor {
  constructor() {
    this.defaultExclusions = [
      // Node.js/JavaScript/TypeScript
      'node_modules/**',
      'build/**',
      'dist/**',
      '*.min.js',
      '*.min.css',
      '*.lock',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      'coverage/**',
      '.nyc_output/**',
      '*.log',
      '.DS_Store',
      'Thumbs.db',
      '*.tmp',
      '*.swp',
      '.vscode/**',
      '.idea/**',
      '*.tsbuildinfo',
      '.env*',

      // Mobile platforms
      // iOS
      '*.xcuserdatad/**',
      'xcuserdata/**',
      '*.xcscmblueprint',
      '*.xccheckout',
      '*.moved-aside',
      'DerivedData/**',
      '*.hmap',
      '*.ipa',
      '*.dSYM/**',
      '*.framework/**',
      'Carthage/**',
      'Pods/**',
      '*.xcodeproj/xcuserdata/**',
      '*.xcodeproj/project.xcworkspace/xcuserdata/**',

      // Android
      '*.iml',
      '.gradle/**',
      'local.properties',
      '.idea/caches/**',
      '.idea/libraries/**',
      '.idea/modules.xml',
      '.idea/workspace.xml',
      '.idea/navEditor.xml',
      '.idea/assetWizardSettings.xml',
      '*.hprof',
      'captures/**',
      'build/**',
      'app/build/**',
      'gradle/wrapper/gradle-wrapper.jar',

      // React Native
      '.expo/**',
      '.expo-shared/**',

      // Flutter
      '.dart_tool/**',
      '.flutter-plugins',
      '.flutter-plugins-dependencies',
      '.packages',
      '.pub-cache/**',
      '.pub/**',
      'build/**',
      'android/app/build/**',
      'ios/Flutter/App.framework/**',
      'ios/Flutter/Flutter.framework/**',

      // Cordova/PhoneGap
      'platforms/**',
      'plugins/**',

      // Ionic
      'www/build/**',
      'www/platforms/**',
      'www/plugins/**',

      // Capacitor
      'android/app/src/main/assets/public/**',
      'ios/App/App/public/**',

      // Backend frameworks
      // Python
      '__pycache__/**',
      '*.pyc',
      '*.pyo',
      '*.pyd',
      '.Python',
      'env/**',
      'venv/**',
      'ENV/**',
      '.env',
      'pip-log.txt',
      'pip-delete-this-directory.txt',
      '.tox/**',
      '.coverage',
      'htmlcov/**',
      '.pytest_cache/**',
      'nosetests.xml',
      'coverage.xml',
      '*.cover',
      '.hypothesis/**',

      // Java
      'target/**',
      '*.class',
      '*.jar',
      '*.war',
      '*.ear',
      '*.nar',
      'hs_err_pid*',
      '.gradle/**',
      'gradle-app.setting',
      '.classpath',
      '.project',
      '.settings/**',
      'bin/**',

      // .NET/C#
      '[Bb]in/**',
      '[Oo]bj/**',
      '*.user',
      '*.suo',
      '*.cache',
      '*.log',
      '*.tmp',
      '*.temp',
      '*.tmp_proj',
      'packages/**',
      '.vs/**',
      '.vscode/**',

      // Go
      '*.exe',
      '*.exe~',
      '*.dll',
      '*.so',
      '*.dylib',
      '*.test',
      '*.out',
      'vendor/**',

      // Rust
      'target/**',
      'debug/**',
      'release/**',
      '**/*.rs.bk',
      '*.pdb',

      // PHP
      'vendor/**',
      'composer.lock',
      '*.log',
      'cache/**',
      'logs/**',

      // Ruby
      '.bundle/**',
      '.sass-cache/**',
      '.gem',
      'gemfiles/**',
      'vendor/bundle/**',
      'log/**',
      'tmp/**',

      // Frontend frameworks
      // React/Vue/Angular
      '.next/**',
      '.nuxt/**',
      'out/**',
      '.vuepress/dist/**',
      '.cache/**',
      '.parcel-cache/**',
      'dist/**',
      'build/**',
      '.storybook-out/**',
      'storybook-static/**',

      // General frontend
      '.DS_Store',
      'Thumbs.db',
      'node_modules/**',
      'npm-debug.log*',
      'yarn-debug.log*',
      'yarn-error.log*',
      '.npm',
      '.yarn-integrity',

      // General mobile
      '*.apk',
      '*.aab',
      '*.mobileprovision',
      '*.p12',
      '*.pem',
      'fastlane/**',
      'screenshots/**',

      // Git and version control
      '.git/**',

      // Documentation
      '*.md',
      'docs/',
      'README*',
      'CHANGELOG*',

      // Generated files
      'generated/',
      'migrations/',
      'coverage/',

      // Test outputs
      'test-results/',
      '*.test.js',
      '*.spec.js',

      // Config files
      '.env*',
      'config/local.*',

      // IDE files
      '.vscode/',
      '.idea/',
      '*.swp',
      '*.swo',

      // OS files
      '.DS_Store',
      'Thumbs.db',

      '*.json',
      '*.yml',
    ];
  }

  /**
   * Check if a file should be excluded from processing
   * @param {string} filePath - Path to the file
   * @param {Array<string>} customExclusions - Additional exclusion patterns
   * @returns {boolean} - Whether the file should be excluded
   */
  shouldExcludeFile(filePath, customExclusions = []) {
    const normalizedPath = filePath.replace(/\\/g, '/'); // handle Windows paths
    const allExclusions = [...this.defaultExclusions, ...customExclusions];

    return allExclusions.some((pattern) => {
      try {
        const mm = new Minimatch(pattern, { dot: true });
        const match = mm.match(normalizedPath);
        if (match) {
          logger.info(`Excluded "${normalizedPath}" by pattern "${pattern}"`);
          return true;
        }
        return false;
      } catch (error) {
        logger.warn(`Invalid exclusion pattern "${pattern}":`, error.message);
        return false;
      }
    });
  }

  /**
   * Check if file exists
   * @param {string} filePath - Path to the file
   * @returns {Promise<boolean>} - Whether file exists
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get file size
   * @param {string} filePath - Path to the file
   * @returns {Promise<number>} - File size in bytes
   */
  async getFileSize(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      logger.error(`Failed to get file size for ${filePath}:`, error.message);
      return 0;
    }
  }

  /**
   * Read file content
   * @param {string} filePath - Path to the file
   * @returns {Promise<string>} - File content
   */
  async readFileContent(filePath) {
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      logger.error(`Failed to read file ${filePath}:`, error.message);
      throw error;
    }
  }

  /**
   * Detect programming language from file extension
   * @param {string} filePath - Path to the file
   * @returns {string} - Detected language
   */
  detectLanguage(filePath) {
    const ext = path.extname(filePath).toLowerCase();

    const languageMap = {
      // Web/Frontend
      '.js': 'javascript',
      '.ts': 'typescript',
      '.jsx': 'javascript',
      '.tsx': 'typescript',
      '.vue': 'vue',
      '.svelte': 'svelte',
      '.astro': 'astro',

      // Backend
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.php': 'php',
      '.rb': 'ruby',
      '.go': 'go',
      '.rs': 'rust',
      '.scala': 'scala',
      '.dart': 'dart',

      // Mobile
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.m': 'objective-c',
      '.mm': 'objective-c++',

      // Systems/Other
      '.sh': 'bash',
      '.ps1': 'powershell',
      '.pl': 'perl',
      '.lua': 'lua',
      '.r': 'r',
      '.hs': 'haskell',
      '.clj': 'clojure',
      '.elm': 'elm',
      '.ex': 'elixir',
      '.exs': 'elixir',

      // Data/Config
      '.sql': 'sql',
      '.graphql': 'graphql',
      '.proto': 'protobuf',

      // Web
      '.html': 'html',
      '.htm': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.sass': 'sass',
      '.less': 'less',

      // Data Formats
      '.json': 'json',
      '.xml': 'xml',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.toml': 'toml',
      '.ini': 'ini',

      // Documentation
      '.md': 'markdown',
      '.rst': 'restructuredtext',
      '.tex': 'latex',

      // Other
      '.dockerfile': 'dockerfile',
      '.makefile': 'makefile',
      '.cmake': 'cmake',
    };

    return languageMap[ext] || 'unknown';
  }

  /**
   * Split large file into chunks for AI processing
   * @param {string} content - File content
   * @param {number} maxChunkSize - Maximum chunk size in characters
   * @returns {Array<string>} - Array of content chunks
   */
  splitIntoChunks(content, maxChunkSize = 50000) {
    if (content.length <= maxChunkSize) {
      return [content];
    }

    const chunks = [];
    let start = 0;

    while (start < content.length) {
      let end = start + maxChunkSize;

      // Try to break at a reasonable boundary (end of line)
      if (end < content.length) {
        const lastNewline = content.lastIndexOf('\n', end);
        if (lastNewline > start + maxChunkSize * 0.8) {
          end = lastNewline + 1;
        }
      }

      chunks.push(content.slice(start, end));
      start = end;
    }

    return chunks;
  }

  /**
   * Validate file for processing
   * @param {string} filePath - Path to the file
   * @param {Object} config - Configuration object
   * @returns {Promise<Object>} - Validation result
   */
  async validateFile(filePath, config = {}) {
    const result = {
      isValid: true,
      reason: null,
      fileInfo: {
        path: filePath,
        size: 0,
        language: 'unknown',
      },
    };

    // Check if file exists
    if (!(await this.fileExists(filePath))) {
      result.isValid = false;
      result.reason = 'File does not exist';
      return result;
    }

    // Check exclusions
    if (this.shouldExcludeFile(filePath, config.excludePatterns)) {
      result.isValid = false;
      result.reason = 'File matches exclusion pattern';
      return result;
    }

    // Get file size
    const size = await this.getFileSize(filePath);
    result.fileInfo.size = size;

    // Check size limit
    if (config.maxFileSize && size > config.maxFileSize) {
      result.isValid = false;
      result.reason = `File size ${size} exceeds limit ${config.maxFileSize}`;
      return result;
    }

    // Detect language
    result.fileInfo.language = this.detectLanguage(filePath);

    // Check if it's a text file (basic check)
    try {
      const content = await this.readFileContent(filePath);
      // Simple check for binary content
      if (content.includes('\0')) {
        result.isValid = false;
        result.reason = 'File appears to be binary';
      }
    } catch (error) {
      result.isValid = false;
      result.reason = 'Cannot read file as text';
    }

    return result;
  }
}

module.exports = new FileProcessor();
