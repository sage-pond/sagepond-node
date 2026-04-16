// src/chunker.ts
function chunkText(text, limitBytes = 2 * 1024 * 1024) {
  const chunks = [];
  const sentenceRegex = /[^.!?]+[.!?]+(?:\s|$)/g;
  const sentences = text.match(sentenceRegex) || [text];
  let currentChunk = "";
  let currentChunkBytes = 0;
  for (const sentence of sentences) {
    const sentenceBytes = Buffer.byteLength(sentence, "utf-8");
    if (sentenceBytes > limitBytes) {
      throw new Error(`A single sentence exceeds the ${limitBytes / (1024 * 1024)}MB limit. Content: ${sentence.substring(0, 100)}...`);
    }
    if (currentChunkBytes + sentenceBytes > limitBytes) {
      chunks.push(currentChunk.trim().replace(/[\r\n\t\\r]/g, " "));
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

// src/client.ts
import axios from "axios";
import fs from "fs/promises";
var SagepondClient = class {
  client;
  apiKey;
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.SP_KEY || "";
    if (!this.apiKey) {
      throw new Error("API key must be provided either in options or via the SP_KEY environment variable.");
    }
    this.client = axios.create({
      baseURL: options.baseUrl || "https://api.sagepond.com/v1",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      }
    });
    this.client.defaults.headers.common = {};
  }
  /**
   * Send a single chunk to the API
   */
  async send(mode, content) {
    try {
      const data = JSON.stringify({
        text: content
      });
      const response = await this.client.post(`/${mode}`, data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const data = JSON.stringify(error.response?.data || {});
        throw new Error(`SAGE POND API Error: ${status} - ${data}`);
      }
      throw error;
    }
  }
  /**
   * Process a text file sequentially, chunking at 4MB sentence boundaries.
   */
  async processFile(filePath, mode) {
    const text = await fs.readFile(filePath, "utf-8");
    const chunks = chunkText(text);
    const total = chunks.length;
    const results = [];
    try {
      for (let i = 0; i < total; i++) {
        process.stdout.write(`\rChunks: [Processing: 1] [Finished: ${i}] Total: ${total}`);
        const result = await this.send(mode, chunks[i]);
        results.push(result);
      }
      process.stdout.write(`\rChunks: [Processing: 0] [Finished: ${total}] Total: ${total}
`);
    } catch (error) {
      process.stdout.write("\n");
      throw error;
    }
    return results;
  }
};

export {
  chunkText,
  SagepondClient
};
