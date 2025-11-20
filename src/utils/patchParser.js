/**
 * Patch content parser for handling GitHub diff format and line number mapping
 */

const logger = require('./logger');

class PatchParser {
  constructor() {
    this.hunkHeaderPattern = /^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/;
  }

  /**
   * Parse GitHub patch content into structured hunks with line number mappings
   * @param {string} patchContent - GitHub patch content (unified diff format)
   * @returns {Object} - Parsed patch with hunks and line mappings
   */
  parsePatch(patchContent) {
    const result = {
      hunks: [],
      totalLines: 0,
      originalLineCount: 0,
      modifiedLineCount: 0,
      hasContent: patchContent && patchContent.trim().length > 0
    };

    if (!result.hasContent) {
      return result;
    }

    const lines = patchContent.split('\n');
    let currentHunk = null;
    let originalLineNum = 1;
    let modifiedLineNum = 1;
    let hunkIndex = 0;

    for (const line of lines) {
      // Check for hunk header
      const headerMatch = line.match(this.hunkHeaderPattern);
      if (headerMatch) {
        // Save previous hunk if exists
        if (currentHunk) {
          result.hunks.push(this.finalizeHunk(currentHunk, hunkIndex++));
        }

        // Start new hunk
        const [, oldStart, oldCount, newStart, newCount] = headerMatch;
        currentHunk = {
          oldStartLine: parseInt(oldStart, 10),
          oldLineCount: parseInt(oldCount || '1', 10),
          newStartLine: parseInt(newStart, 10),
          newLineCount: parseInt(newCount || '1', 10),
          lines: [],
          content: []
        };

        // Update running totals
        originalLineNum = parseInt(oldStart, 10);
        modifiedLineNum = parseInt(newStart, 10);
        continue;
      }

      // Skip other metadata lines
      if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('Index:') || line.startsWith('diff --git')) {
        continue;
      }

      // Process content lines
      if (currentHunk && line.trim().length > 0) {
        const lineType = this.getLineType(line);
        const content = this.cleanLineContent(line);

        const processedLine = {
          originalLineNumber: null,
          modifiedLineNumber: null,
          content,
          type: lineType,
          rawLine: line
        };

        // Assign line numbers based on line type
        switch (lineType) {
          case 'context':
            processedLine.originalLineNumber = originalLineNum;
            processedLine.modifiedLineNumber = modifiedLineNum;
            originalLineNum++;
            modifiedLineNum++;
            break;
          case 'added':
            processedLine.modifiedLineNumber = modifiedLineNum;
            modifiedLineNum++;
            break;
          case 'removed':
            processedLine.originalLineNumber = originalLineNum;
            originalLineNum++;
            break;
          default:
            // Skip empty or whitespace lines
            break;
        }

        currentHunk.lines.push(processedLine);
        currentHunk.content.push(content);
      }
    }

    // Finalize last hunk
    if (currentHunk) {
      result.hunks.push(this.finalizeHunk(currentHunk, hunkIndex++));
    }

    // Calculate totals
    result.totalLines = lines.length;
    result.originalLineCount = Math.max(...result.hunks.map(h => h.oldStartLine + h.oldLineCount - 1), 0);
    result.modifiedLineCount = Math.max(...result.hunks.map(h => h.newStartLine + h.newLineCount - 1), 0);

    logger.debug(`Parsed patch with ${result.hunks.length} hunks, ${result.originalLineCount} original lines, ${result.modifiedLineCount} modified lines`);

    return result;
  }

  /**
   * Finalize a hunk with calculated ranges and mappings
   * @param {Object} hunk - Raw hunk data
   * @param {number} index - Hunk index
   * @returns {Object} - Finalized hunk with line mappings
   */
  finalizeHunk(hunk, index) {
    const contextLines = hunk.lines.filter(line => line.type === 'context');
    const addedLines = hunk.lines.filter(line => line.type === 'added');
    const removedLines = hunk.lines.filter(line => line.type === 'removed');

    // Calculate effective line ranges
    const originalLines = hunk.lines.filter(l => l.originalLineNumber).map(l => l.originalLineNumber);
    const modifiedLines = hunk.lines.filter(l => l.modifiedLineNumber).map(l => l.modifiedLineNumber);

    const originalRange = {
      start: Math.min(...originalLines, hunk.oldStartLine),
      end: Math.max(...originalLines, hunk.oldStartLine + hunk.oldLineCount - 1)
    };

    const modifiedRange = {
      start: Math.min(...modifiedLines, hunk.newStartLine),
      end: Math.max(...modifiedLines, hunk.newStartLine + hunk.newLineCount - 1)
    };

    return {
      ...hunk,
      index,
      contextLines: contextLines.length,
      addedLines: addedLines.length,
      removedLines: removedLines.length,
      originalRange,
      modifiedRange,
      hasChanges: addedLines.length > 0 || removedLines.length > 0
    };
  }

  /**
   * Determine the type of a patch line
   * @param {string} line - Patch line
   * @returns {string} - Line type ('added', 'removed', 'context', 'other')
   */
  getLineType(line) {
    if (line.startsWith('+')) {
      return 'added';
    } else if (line.startsWith('-')) {
      return 'removed';
    } else if (line.startsWith(' ')) {
      return 'context';
    } else {
      return 'other';
    }
  }

  /**
   * Clean line content by removing diff prefixes
   * @param {string} line - Line with diff prefix
   * @returns {string} - Cleaned content
   */
  cleanLineContent(line) {
    return line.replace(/^[+\- ]/, '');
  }

  /**
   * Convert AI line number (from patch content) to original file line number
   * @param {number} aiLineNumber - Line number from AI analysis of patch content
   * @param {Object} parsedPatch - Parsed patch data
   * @returns {number|null} - Original file line number or null if not found
   */
  mapPatchLineToOriginalFile(aiLineNumber, parsedPatch) {
    if (!parsedPatch || !parsedPatch.hunks.length) {
      return null;
    }

    // Find which hunk contains the AI line number
    for (const hunk of parsedPatch.hunks) {
      const lineInHunk = aiLineNumber;
      
      // Check if line is within the hunk's content
      if (lineInHunk <= hunk.content.length && lineInHunk > 0) {
        const patchLine = hunk.lines[lineInHunk - 1]; // Convert to 0-based index
        
        if (patchLine && patchLine.originalLineNumber) {
          return patchLine.originalLineNumber;
        }
      }
    }

    logger.warn(`Could not map patch line ${aiLineNumber} to original file line`);
    return null;
  }

  /**
   * Convert AI line number to modified file line number
   * @param {number} aiLineNumber - Line number from AI analysis of patch content
   * @param {Object} parsedPatch - Parsed patch data
   * @returns {number|null} - Modified file line number or null if not found
   */
  mapPatchLineToModifiedFile(aiLineNumber, parsedPatch) {
    if (!parsedPatch || !parsedPatch.hunks.length) {
      return null;
    }

    // Find which hunk contains the AI line number
    for (const hunk of parsedPatch.hunks) {
      const lineInHunk = aiLineNumber;
      
      // Check if line is within the hunk's content
      if (lineInHunk <= hunk.content.length && lineInHunk > 0) {
        const patchLine = hunk.lines[lineInHunk - 1]; // Convert to 0-based index
        
        if (patchLine && patchLine.modifiedLineNumber) {
          return patchLine.modifiedLineNumber;
        }
      }
    }

    logger.warn(`Could not map patch line ${aiLineNumber} to modified file line`);
    return null;
  }

  /**
   * Extract meaningful content for AI review from patch
   * @param {Object} parsedPatch - Parsed patch data
   * @param {Object} options - Extraction options
   * @returns {string} - Content suitable for AI review
   */
  extractReviewContent(parsedPatch, options = {}) {
    if (!parsedPatch || !parsedPatch.hunks.length) {
      return '';
    }

    const { includeContext = true, maxLines = 1000 } = options;
    const lines = [];

    for (const hunk of parsedPatch.hunks) {
      if (includeContext) {
        // Add all lines with clear indicators
        for (const line of hunk.lines) {
          if (lines.length >= maxLines) break;
          
          switch (line.type) {
            case 'added':
              lines.push(`+${line.content}`);
              break;
            case 'removed':
              lines.push(`-${line.content}`);
              break;
            case 'context':
              lines.push(` ${line.content}`);
              break;
          }
        }
      } else {
        // Only include changed lines with minimal context
        const changedLines = hunk.lines.filter(l => l.type !== 'context');
        for (const line of changedLines) {
          if (lines.length >= maxLines) break;
          
          switch (line.type) {
            case 'added':
              lines.push(`+${line.content}`);
              break;
            case 'removed':
              lines.push(`-${line.content}`);
              break;
          }
        }
      }

      if (lines.length >= maxLines) break;
    }

    return lines.join('\n');
  }

  /**
   * Validate if a line number is within valid bounds
   * @param {number} lineNumber - Line number to validate
   * @param {Object} parsedPatch - Parsed patch data
   * @param {string} fileType - 'original' or 'modified'
   * @returns {boolean} - Whether line number is valid
   */
  isValidLineNumber(lineNumber, parsedPatch, fileType = 'original') {
    if (!parsedPatch || !parsedPatch.hunks.length || !lineNumber || lineNumber <= 0) {
      return false;
    }

    if (fileType === 'original') {
      return lineNumber <= parsedPatch.originalLineCount;
    } else {
      return lineNumber <= parsedPatch.modifiedLineCount;
    }
  }
}

module.exports = PatchParser;