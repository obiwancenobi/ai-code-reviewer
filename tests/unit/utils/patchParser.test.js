/**
 * Test suite for PatchParser line number accuracy fixes
 */

const PatchParser = require('../../../src/utils/patchParser');

describe('PatchParser', () => {
  let parser;

  beforeEach(() => {
    parser = new PatchParser();
  });

  describe('parsePatch', () => {
    test('should parse basic patch with single hunk', () => {
      const patchContent = `@@ -1,3 +1,3 @@
 function test() {
-  const old = 1;
+  const new = 2;
   return result;
 }`;

      const result = parser.parsePatch(patchContent);

      expect(result.hunks).toHaveLength(1);
      expect(result.hunks[0].oldStartLine).toBe(1);
      expect(result.hunks[0].newStartLine).toBe(1);
      expect(result.hunks[0].addedLines).toBe(1);
      expect(result.hunks[0].removedLines).toBe(1);
      expect(result.originalLineCount).toBe(3);
      expect(result.modifiedLineCount).toBe(3);
    });

    test('should parse patch with multiple hunks', () => {
      const patchContent = `@@ -1,3 +1,3 @@
 function test() {
-  const old = 1;
+  const new = 2;
   return result;
 }
@@ -10,2 +10,2 @@
   return result;
 }
`;

      const result = parser.parsePatch(patchContent);

      expect(result.hunks).toHaveLength(2);
      expect(result.hunks[0].oldStartLine).toBe(1);
      expect(result.hunks[1].oldStartLine).toBe(10);
    });

    test('should handle empty patch', () => {
      const result = parser.parsePatch('');

      expect(result.hasContent).toBe(false);
      expect(result.hunks).toHaveLength(0);
      expect(result.originalLineCount).toBe(0);
    });
  });

  describe('mapPatchLineToOriginalFile', () => {
    test('should map patch line numbers to original file lines', () => {
      const patchContent = `@@ -5,3 +5,3 @@
-const oldValue = "old";
+const newValue = "new";
 const otherVariable = true;`;

      const parsedPatch = parser.parsePatch(patchContent);

      // Line 1: +const newValue = "new"; (modified line 5)
      const originalLine5 = parser.mapPatchLineToOriginalFile(1, parsedPatch);
      expect(originalLine5).toBe(5);

      // Line 2:  const otherVariable = true; (context line 6)
      const originalLine6 = parser.mapPatchLineToOriginalFile(2, parsedPatch);
      expect(originalLine6).toBe(6);
    });

    test('should return null for invalid line numbers', () => {
      const patchContent = `@@ -1,1 +1,1 @@
+const x = 1;`;

      const parsedPatch = parser.parsePatch(patchContent);

      expect(parser.mapPatchLineToOriginalFile(0, parsedPatch)).toBeNull();
      expect(parser.mapPatchLineToOriginalFile(-1, parsedPatch)).toBeNull();
      expect(parser.mapPatchLineToOriginalFile(999, parsedPatch)).toBeNull();
      expect(parser.mapPatchLineToOriginalFile(null, parsedPatch)).toBeNull();
    });
  });

  describe('extractReviewContent', () => {
    test('should extract content with context lines', () => {
      const patchContent = `@@ -1,5 +1,5 @@
-const old = 1;
+const new = 2;
 const shared = 3;
-const removed = 4;
+const modified = 5;
 const end = 6;`;

      const parsedPatch = parser.parsePatch(patchContent);
      const content = parser.extractReviewContent(parsedPatch, { includeContext: true });

      expect(content).toContain('+const new = 2;');
      expect(content).toContain('+const modified = 5;');
      expect(content).toContain(' const shared = 3;');
      expect(content).toContain('-const old = 1;');
      expect(content).toContain('-const removed = 4;');
    });

    test('should extract content without context lines', () => {
      const patchContent = `@@ -1,5 +1,5 @@
-const old = 1;
+const new = 2;
 const shared = 3;
-const removed = 4;
+const modified = 5;
 const end = 6;`;

      const parsedPatch = parser.parsePatch(patchContent);
      const content = parser.extractReviewContent(parsedPatch, { includeContext: false });

      expect(content).toContain('+const new = 2;');
      expect(content).toContain('+const modified = 5;');
      expect(content).toContain('-const old = 1;');
      expect(content).toContain('-const removed = 4;');
      expect(content).not.toContain(' const shared = 3;'); // Context line should be excluded
    });
  });

  describe('isValidLineNumber', () => {
    test('should validate line numbers correctly', () => {
      const patchContent = `@@ -1,5 +1,5 @@
+const x = 1;
 const y = 2;`;

      const parsedPatch = parser.parsePatch(patchContent);

      expect(parser.isValidLineNumber(1, parsedPatch, 'original')).toBe(true);
      expect(parser.isValidLineNumber(5, parsedPatch, 'original')).toBe(true);
      expect(parser.isValidLineNumber(6, parsedPatch, 'original')).toBe(false);
      
      expect(parser.isValidLineNumber(1, parsedPatch, 'modified')).toBe(true);
      expect(parser.isValidLineNumber(5, parsedPatch, 'modified')).toBe(true);
      expect(parser.isValidLineNumber(6, parsedPatch, 'modified')).toBe(false);
    });

    test('should reject invalid inputs', () => {
      const patchContent = `@@ -1,1 +1,1 @@
+const x = 1;`;
      const parsedPatch = parser.parsePatch(patchContent);

      expect(parser.isValidLineNumber(0, parsedPatch)).toBe(false);
      expect(parser.isValidLineNumber(-1, parsedPatch)).toBe(false);
      expect(parser.isValidLineNumber(null, parsedPatch)).toBe(false);
      expect(parser.isValidLineNumber(undefined, parsedPatch)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    test('should handle complex patch with overlapping ranges', () => {
      const patchContent = `@@ -10,10 +10,10 @@
 function complex() {
-  const a = 1;
-  const b = 2;
+  const a = 'one';
+  const b = 'two';
   const c = 3;
+  const d = 4;
   return a + b + c + d;
 }`;

      const parsedPatch = parser.parsePatch(patchContent);

      expect(parsedPatch.hunks).toHaveLength(1);
      expect(parsedPatch.hunks[0].addedLines).toBe(3);
      expect(parsedPatch.hunks[0].removedLines).toBe(2);
      expect(parsedPatch.originalLineCount).toBe(19); // 10 + 10 - 1
      expect(parsedPatch.modifiedLineCount).toBe(19); // 10 + 10 - 1

      // Map some patch lines to original lines
      expect(parser.mapPatchLineToOriginalFile(2, parsedPatch)).toBe(11); // +  const a = 'one';
      expect(parser.mapPatchLineToOriginalFile(3, parsedPatch)).toBe(12); // +  const b = 'two';
      expect(parser.mapPatchLineToOriginalFile(4, parsedPatch)).toBe(13); //   const c = 3;
    });

    test('should handle patch with only additions', () => {
      const patchContent = `@@ -0,0 +1,3 @@
+// New file content
+const newConst = 42;
+export default newConst;`;

      const parsedPatch = parser.parsePatch(patchContent);

      expect(parsedPatch.hunks).toHaveLength(1);
      expect(parsedPatch.hunks[0].addedLines).toBe(3);
      expect(parsedPatch.hunks[0].removedLines).toBe(0);
      expect(parsedPatch.originalLineCount).toBe(0);
      expect(parsedPatch.modifiedLineCount).toBe(3);

      // Added lines should map to modified file lines (not original)
      expect(parser.mapPatchLineToOriginalFile(1, parsedPatch)).toBeNull(); // No original lines
    });

    test('should handle patch with only deletions', () => {
      const patchContent = `@@ -1,3 +0,0 @@
-// File to be removed
-const toRemove = 'data';
-`;

      const parsedPatch = parser.parsePatch(patchContent);

      expect(parsedPatch.hunks).toHaveLength(1);
      expect(parsedPatch.hunks[0].addedLines).toBe(0);
      expect(parsedPatch.hunks[0].removedLines).toBe(2);
      expect(parsedPatch.originalLineCount).toBe(3);
      expect(parsedPatch.modifiedLineCount).toBe(0);

      // Removed lines should map to original file lines
      expect(parser.mapPatchLineToOriginalFile(1, parsedPatch)).toBe(1);
      expect(parser.mapPatchLineToOriginalFile(2, parsedPatch)).toBe(2);
    });
  });
});