/**
 * Chunks text based on a byte limit using a hierarchical approach similar to Langchain's RecursiveCharacterTextSplitter.
 * It splits by paragraphs, then sentences, then spaces, moving to the next separator only when a chunk exceeds the limit.
 * If a chunk is still larger than the limit after trying all separators, it is skipped.
 */
export function chunkText(
  text: string,
  limitBytes: number = 2 * 1024 * 1024,
  separators: string[] = ["\n\n", "\n", ". ", "! ", "? ", " "]
): string[] {
  if (!text) return [];

  function splitRecursive(input: string, separatorIndex: number): string[] {
    const inputBytes = Buffer.byteLength(input, 'utf-8');
    
    // If it already fits, return it as a single piece
    if (inputBytes <= limitBytes) {
      return [input];
    }

    // If we've run out of separators and it's still too big, skip it
    if (separatorIndex >= separators.length) {
      // User requested to skip if the chunk is larger than the limit set and cannot be split further
      console.warn(`Skipping a chunk of ${inputBytes} bytes as it exceeds the limit of ${limitBytes} and cannot be split further by the provided separators.`);
      return [];
    }

    const separator = separators[separatorIndex];
    let parts: string[];

    if (separator === "") {
      parts = input.split("");
    } else {
      // Split and keep the separator at the end of each part using lookbehind
      // This ensures we don't lose the periods, spaces, or newlines
      const escapedSeparator = separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      parts = input.split(new RegExp(`(?<=${escapedSeparator})`));
    }
    
    // If splitting didn't actually split anything, try the next separator
    if (parts.length === 1 && parts[0] === input) {
      return splitRecursive(input, separatorIndex + 1);
    }

    const result: string[] = [];
    let currentBatch: string[] = [];
    let currentBatchBytes = 0;

    for (const part of parts) {
      if (!part) continue;
      const partBytes = Buffer.byteLength(part, 'utf-8');

      if (partBytes > limitBytes) {
        // This part is too big on its own, try splitting it further with remaining separators
        // First, push whatever we have collected so far in currentBatch
        if (currentBatch.length > 0) {
          result.push(currentBatch.join(""));
          currentBatch = [];
          currentBatchBytes = 0;
        }

        const subParts = splitRecursive(part, separatorIndex + 1);
        result.push(...subParts);
      } else {
        // Check if adding this part would exceed the limit
        if (currentBatchBytes + partBytes > limitBytes) {
          if (currentBatch.length > 0) {
            result.push(currentBatch.join(""));
          }
          currentBatch = [part];
          currentBatchBytes = partBytes;
        } else {
          currentBatch.push(part);
          currentBatchBytes += partBytes;
        }
      }
    }

    if (currentBatch.length > 0) {
      result.push(currentBatch.join(""));
    }

    return result;
  }

  const chunks = splitRecursive(text, 0);
  
  // Final cleanup: trim and filter empty chunks
  return chunks
    .map(c => c.trim())
    .filter(c => c.length > 0);
}
