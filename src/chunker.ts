/**
 * Chunks text based on a byte limit, ensuring splits only occur at sentence boundaries.
 * If a single sentence exceeds the limit, an error is thrown.
 */
export function chunkText(text: string, limitBytes: number = 2 * 1024 * 1024): string[] {
  const chunks: string[] = [];

  // Simple regex for sentence boundaries: . ! ? followed by space or end of string
  // This can be refined but serves as a solid baseline.
  const sentenceRegex = /[^.!?]+[.!?]+(?:\s|$)/g;
  const sentences = text.match(sentenceRegex) || [text];

  let currentChunk = "";
  let currentChunkBytes = 0;

  for (const sentence of sentences) {
    const sentenceBytes = Buffer.byteLength(sentence, 'utf-8');

    if (sentenceBytes > limitBytes) {
      throw new Error(`A single sentence exceeds the ${limitBytes / (1024 * 1024)}MB limit. Content: ${sentence.substring(0, 100)}...`);
    }

    if (currentChunkBytes + sentenceBytes > limitBytes) {
      chunks.push(currentChunk.trim().replace(/[\r\n\t\\r]/g, ' '));
      currentChunk = sentence;
      currentChunkBytes = sentenceBytes;
    } else {
      currentChunk += sentence;
      currentChunkBytes += sentenceBytes;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
