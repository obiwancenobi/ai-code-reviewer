#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Chunking logic for handling large code changes.
 * Input: JSON array of file changes [{ path: string, content: string }]
 * Output: JSON array of chunks, each chunk is array of file changes
 */

const THRESHOLD = 1000; // Max lines per chunk

// File exclusion patterns - common build artifacts and dependencies
const EXCLUDE_PATTERNS = [
  // Dependencies
  /^node_modules\//,
  /^vendor\//,
  /^packages\//,

  // Build outputs
  /^build\//,
  /^dist\//,
  /^out\//,
  /^target\//,
  /^bin\//,
  /^obj\//,
  /^\.next\//,
  /^\.nuxt\//,
  /^\.vuepress\//,

  // Framework-specific
  /^android\/app\/build\//,
  /^ios\/build\//,
  /^cmake-build-\w+\//,

  // Cache and temp files
  /^__pycache__\//,
  /^\.pytest_cache\//,
  /^\.gradle\//,
  /^Cargo\.lock$/,
  /^package-lock\.json$/,
  /^yarn\.lock$/,

  // Generated/minified files
  /\.min\.(js|css)$/,
  /\.(log|tmp|cache)$/,

  // Git and docs
  /^\.git\//,
  /^docs\//,
  /^generated\//,
  /^migrations\//,

  // Mobile artifacts
  /\.(apk|aab|ipa|aar|framework)$/,

  // Test files (optional - can be enabled)
  /\.test\.(js|ts|py|java)$/,
  /\.spec\.(js|ts|py|java)$/,
  /^test-results\//
];

function loadCustomExclusions() {
  const ignoreFile = '.ai-review-ignore';
  const customPatterns = [];

  try {
    if (fs.existsSync(ignoreFile)) {
      const content = fs.readFileSync(ignoreFile, 'utf-8');
      const lines = content.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));

      for (const line of lines) {
        // Convert glob patterns to regex
        const regex = line
          .replace(/\*/g, '.*')
          .replace(/\?/g, '.')
          .replace(/\//g, '\\/');
        customPatterns.push(new RegExp(`^${regex}`));
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not read ${ignoreFile}: ${error.message}`);
  }

  return customPatterns;
}

function shouldExcludeFile(filePath) {
  // Check built-in patterns
  if (EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath))) {
    return true;
  }

  // Check custom patterns from .ai-review-ignore
  const customPatterns = loadCustomExclusions();
  return customPatterns.some(pattern => pattern.test(filePath));
}

function countLines(content) {
  return content.split('\n').length;
}

function getDirectory(filePath) {
  return path.dirname(filePath);
}

function getExtension(filePath) {
  return path.extname(filePath);
}

function groupFilesByDirectory(files) {
  const groups = {};
  files.forEach(file => {
    const dir = getDirectory(file.path);
    if (!groups[dir]) groups[dir] = [];
    groups[dir].push(file);
  });
  return Object.values(groups);
}

function groupFilesByExtension(files) {
  const groups = {};
  files.forEach(file => {
    const ext = getExtension(file.path);
    if (!groups[ext]) groups[ext] = [];
    groups[ext].push(file);
  });
  return Object.values(groups);
}

function chunkFiles(files, maxLines) {
  const chunks = [];
  let currentChunk = [];
  let currentLines = 0;

  // Sort files by line count descending for greedy packing
  files.sort((a, b) => countLines(b.content) - countLines(a.content));

  for (const file of files) {
    const fileLines = countLines(file.content);
    if (currentLines + fileLines <= maxLines) {
      currentChunk.push(file);
      currentLines += fileLines;
    } else {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = [];
        currentLines = 0;
      }
      // If single file exceeds limit, put it in its own chunk
      if (fileLines > maxLines) {
        chunks.push([file]);
      } else {
        currentChunk.push(file);
        currentLines = fileLines;
      }
    }
  }
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }
  return chunks;
}

function main() {
  try {
    const input = fs.readFileSync(0, 'utf-8'); // Read from stdin
    const files = JSON.parse(input);

    if (!Array.isArray(files)) {
      throw new Error('Input must be a JSON array');
    }

    // Validate structure
    files.forEach((file, index) => {
      if (!file.path || typeof file.content !== 'string') {
        throw new Error(`Invalid file at index ${index}: must have 'path' and 'content'`);
      }
    });

    // Filter out excluded files
    const filteredFiles = files.filter(file => {
      if (shouldExcludeFile(file.path)) {
        console.log(`Excluding file: ${file.path}`);
        return false;
      }
      return true;
    });

    console.log(`Filtered ${files.length - filteredFiles.length} excluded files`);

    if (filteredFiles.length === 0) {
      console.log('No files to review after filtering');
      console.log(JSON.stringify([]));
      return;
    }

    const totalLines = filteredFiles.reduce((sum, file) => sum + countLines(file.content), 0);
    console.log(`Total lines: ${totalLines}`);

    if (totalLines <= THRESHOLD) {
      console.log('No chunking needed');
      console.log(JSON.stringify([filteredFiles], null, 2));
      return;
    }

    // Group by directory first, then by extension if needed
    let groups = groupFilesByDirectory(filteredFiles);
    if (groups.length === 1) {
      groups = groupFilesByExtension(filteredFiles);
    }

    const allChunks = [];
    for (const group of groups) {
      const groupLines = group.reduce((sum, file) => sum + countLines(file.content), 0);
      if (groupLines <= THRESHOLD) {
        allChunks.push(group);
      } else {
        // Chunk within group
        const subChunks = chunkFiles(group, THRESHOLD);
        allChunks.push(...subChunks);
      }
    }

    console.log(`Split into ${allChunks.length} chunks`);
    console.log(JSON.stringify(allChunks, null, 2));

  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { countLines, chunkFiles, groupFilesByDirectory, groupFilesByExtension };