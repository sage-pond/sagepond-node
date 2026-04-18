import { describe, it, expect } from 'vitest';
import { chunkText } from '../src/chunker';

describe('chunkText Stress Test (Large Content)', () => {
  it('should correctly chunk a massive text file into 5MB parts at sentence boundaries', () => {
    // Each repeat is 4 sentences, roughly 100 characters.
    // 50,000 repeats * 100 chars = ~5MB. 
    // Let's go with 100,000 repeats to ensure we get multiple ~5MB chunks.
    const baseText = "Sentence one. Sentence two. Sentence three. Sentence four? ";
    const largeText = baseText.repeat(100000);

    const limit4MB = 4 * 1024 * 1024;
    const chunks = chunkText(largeText, limit4MB);

    console.log(`Generated text size: ${(Buffer.byteLength(largeText) / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`Number of chunks: ${chunks.length}`);

    expect(chunks.length).toBeGreaterThan(1);

    // Verify each chunk (except possibly the last) is close to but under 4MB
    for (let i = 0; i < chunks.length; i++) {
      const chunkBytes = Buffer.byteLength(chunks[i], 'utf-8');
      expect(chunkBytes).toBeLessThanOrEqual(limit4MB);

      // Ensure it ends with a sentence boundary
      expect(chunks[i]).toMatch(/[.!?]$/);
    }

    // Verify the total content remains the same (ignoring trimmed whitespace)
    const combined = chunks.join(' ');
    expect(combined.length).toBeGreaterThan(largeText.length * 0.99);
  });

  it('should skip a single block that is too big even after all separators', () => {
    const hugeWord = "A".repeat(1024 * 1024 * 5); // 5MB word
    const text = "Small sentence. " + hugeWord + " Another small sentence.";
    const limit4MB = 4 * 1024 * 1024;
    
    const chunks = chunkText(text, limit4MB);
    
    // It should have skipped the hugeWord but kept the small sentences
    expect(chunks.length).toBe(2);
    expect(chunks[0]).toBe("Small sentence.");
    expect(chunks[1]).toBe("Another small sentence.");
  });

  it('should use hierarchical splitting (prefer paragraphs, then sentences)', () => {
    const text = "Para 1 sentence 1. Para 1 sentence 2.\n\nPara 2 sentence 1.";
    // Limit that fits one paragraph but not both
    const limit = Buffer.byteLength("Para 1 sentence 1. Para 1 sentence 2.\n\n");
    
    const chunks = chunkText(text, limit);
    
    expect(chunks[0]).toBe("Para 1 sentence 1. Para 1 sentence 2.");
    expect(chunks[1]).toBe("Para 2 sentence 1.");
  });
});
