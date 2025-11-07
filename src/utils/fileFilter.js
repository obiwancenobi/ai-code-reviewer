/**
 * File filtering utilities for AI code review
 */

const { minimatch } = require('minimatch');
const fileProcessor = require('./fileProcessor');
const logger = require('./logger');

class FileFilter {
  constructor(config) {
    this.config = config;
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
      '!.env.example',

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
      '!gradle-wrapper.jar',
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
      'screenshots/**'
    ];
  }

  /**
   * Filter files based on configuration
   * @param {Array} files - Array of file objects from PR
   * @returns {Promise<Array>} - Filtered array of files
   */
  async filterFiles(files) {
    const filteredFiles = [];

    for (const file of files) {
      if (await this.shouldIncludeFile(file)) {
        filteredFiles.push(file);
      } else {
        logger.debug(`Filtered out file: ${file.filename}`);
      }
    }

    logger.info(`Filtered ${files.length} files down to ${filteredFiles.length} for review`);
    return filteredFiles;
  }

  /**
   * Determine if a file should be included in review
   * @param {Object} file - File object from PR
   * @returns {Promise<boolean>} - Whether to include the file
   */
  async shouldIncludeFile(file) {
    // Check exclusion patterns
    if (this.matchesExclusionPattern(file.filename)) {
      return false;
    }

    // Check file size limits
    if (this.config.processing?.maxFileSize) {
      const size = await fileProcessor.getFileSize(file.filename);
      if (size > this.config.processing.maxFileSize) {
        logger.debug(`File too large: ${file.filename} (${size} bytes)`);
        return false;
      }
    }

    // Check file type (only include text files)
    if (!this.isTextFile(file.filename)) {
      logger.debug(`Skipping binary file: ${file.filename}`);
      return false;
    }

    // Check if file has actual changes (not just whitespace/metadata)
    if (!this.hasMeaningfulChanges(file)) {
      logger.debug(`Skipping file with no meaningful changes: ${file.filename}`);
      return false;
    }

    return true;
  }

  /**
   * Check if file matches exclusion patterns
   * @param {string} filePath - File path
   * @returns {boolean} - Whether file matches exclusion
   */
  matchesExclusionPattern(filePath) {
    const exclusions = [
      ...this.defaultExclusions,
      ...(this.config.processing?.excludePatterns || [])
    ];

    return exclusions.some(pattern => {
      try {
        return minimatch(filePath, pattern);
      } catch (error) {
        logger.warn(`Invalid exclusion pattern "${pattern}":`, error.message);
        return false;
      }
    });
  }

  /**
   * Check if file is likely a text file
   * @param {string} filePath - File path
   * @returns {boolean} - Whether file is text-based
   */
  isTextFile(filePath) {
    const textExtensions = [
      '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.h', '.hpp',
      '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.sh',
      '.sql', '.html', '.css', '.scss', '.less', '.json', '.xml', '.yaml',
      '.yml', '.md', '.txt', '.config', '.ini', '.toml', '.lock', '.gitignore'
    ];

    const ext = fileProcessor.detectLanguage(filePath);
    if (ext !== 'unknown') {
      return true;
    }

    // Check file extension
    const extension = filePath.split('.').pop()?.toLowerCase();
    return textExtensions.some(ext => filePath.toLowerCase().endsWith(ext));
  }

  /**
   * Check if file has meaningful changes
   * @param {Object} file - File object from PR
   * @returns {boolean} - Whether file has meaningful changes
   */
  hasMeaningfulChanges(file) {
    // Skip files with no additions or deletions
    if (file.additions === 0 && file.deletions === 0) {
      return false;
    }

    // Skip files that are entirely whitespace changes
    if (file.patch) {
      const lines = file.patch.split('\n');
      const hasCodeChanges = lines.some(line =>
        (line.startsWith('+') || line.startsWith('-')) &&
        line.substring(1).trim().length > 0 &&
        !this.isOnlyWhitespaceOrComments(line.substring(1), file.filename)
      );

      if (!hasCodeChanges) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if a line contains only whitespace or comments
   * @param {string} line - Code line
   * @param {string} filePath - File path for language detection
   * @returns {boolean} - Whether line is only whitespace/comments
   */
  isOnlyWhitespaceOrComments(line, filePath) {
    const trimmed = line.trim();

    if (!trimmed) return true;

    const language = fileProcessor.detectLanguage(filePath);

    // Language-specific comment patterns
    const commentPatterns = {
      javascript: ['//', '/*'],
      typescript: ['//', '/*'],
      python: ['#'],
      java: ['//', '/*'],
      c: ['//', '/*'],
      cpp: ['//', '/*'],
      csharp: ['//', '/*'],
      php: ['//', '#', '/*'],
      ruby: ['#'],
      go: ['//', '/*'],
      rust: ['//', '/*'],
      swift: ['//', '/*'],
      kotlin: ['//', '/*'],
      scala: ['//', '/*'],
      bash: ['#'],
      sql: ['--', '/*'],
      html: ['<!--'],
      css: ['/*'],
      scss: ['/*', '//'],
      less: ['/*', '//']
    };

    const patterns = commentPatterns[language] || ['//', '#', '/*'];

    return patterns.some(pattern => trimmed.startsWith(pattern));
  }

  /**
   * Get file priority for review ordering
   * @param {Object} file - File object
   * @returns {number} - Priority score (higher = review first)
   */
  getFilePriority(file) {
    let priority = 0;

    // Prioritize source code over tests
    if (file.filename.includes('/src/') || file.filename.includes('/lib/')) {
      priority += 10;
    } else if (file.filename.includes('/test/') || file.filename.includes('.test.')) {
      priority += 5;
    }

    // Prioritize files with more changes
    priority += Math.min(file.additions + file.deletions, 100) / 10;

    // Prioritize certain file types
    const highPriorityExts = ['.js', '.ts', '.py', '.java'];
    if (highPriorityExts.some(ext => file.filename.endsWith(ext))) {
      priority += 5;
    }

    return priority;
  }

  /**
   * Sort files by review priority
   * @param {Array} files - Array of file objects
   * @returns {Array} - Sorted array of files
   */
  sortByPriority(files) {
    return files.sort((a, b) => this.getFilePriority(b) - this.getFilePriority(a));
  }

  /**
   * Get filtering statistics
   * @param {Array} originalFiles - Original file array
   * @param {Array} filteredFiles - Filtered file array
   * @returns {Object} - Statistics object
   */
  getFilterStats(originalFiles, filteredFiles) {
    const excludedCount = originalFiles.length - filteredFiles.length;
    const exclusionReasons = {};

    for (const file of originalFiles) {
      if (!filteredFiles.find(f => f.filename === file.filename)) {
        const reason = this.getExclusionReason(file);
        exclusionReasons[reason] = (exclusionReasons[reason] || 0) + 1;
      }
    }

    return {
      originalCount: originalFiles.length,
      filteredCount: filteredFiles.length,
      excludedCount,
      exclusionReasons
    };
  }

  /**
   * Get reason why a file was excluded
   * @param {Object} file - File object
   * @returns {string} - Exclusion reason
   */
  getExclusionReason(file) {
    if (this.matchesExclusionPattern(file.filename)) {
      return 'exclusion_pattern';
    }

    if (!this.isTextFile(file.filename)) {
      return 'binary_file';
    }

    if (!this.hasMeaningfulChanges(file)) {
      return 'no_changes';
    }

    return 'other';
  }
}

module.exports = FileFilter;