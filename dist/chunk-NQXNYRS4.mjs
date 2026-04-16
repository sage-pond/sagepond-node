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
      chunks.push(currentChunk.trim().replace(/[\r\n\t\r]/g, " "));
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
import { z } from "zod";
var SagepondOptionsSchema = z.object({
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional()
});
var SagepondClient = class {
  client;
  apiKey;
  // Resource-based namespacing
  models = {
    list: (options) => this.send("models/list", "", options)
  };
  constructor(options = {}) {
    const validated = SagepondOptionsSchema.parse(options);
    this.apiKey = validated.apiKey || process.env.SP_KEY || "";
    if (!this.apiKey) {
      throw new Error("API key must be provided either in options or via the SP_KEY environment variable.");
    }
    this.client = axios.create({
      baseURL: validated.baseUrl || "https://api.sagepond.com/v1",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      }
    });
    this.client.defaults.headers.common = {};
  }
  /**
   * Send a request to the API with optional streaming support.
   * Returns AsyncIterable if stream is true, otherwise returns the JSON response.
   */
  async send(mode, content, options = {}) {
    const isStream = options.stream === true;
    try {
      const payload = {
        text: content,
        stream: isStream
      };
      const response = await this.client.post(`/${mode}`, payload, {
        responseType: isStream ? "stream" : "json"
      });
      if (isStream) {
        return this.streamIterator(response.data);
      }
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const data = error.response?.data;
        const message = typeof data === "object" ? JSON.stringify(data) : data;
        throw new Error(`SAGE POND API Error: ${status} - ${message}`);
      }
      throw error;
    }
  }
  /**
   * Helper to convert a Node.js Readable stream into an AsyncIterable
   */
  async *streamIterator(stream) {
    for await (const chunk of stream) {
      const text = chunk.toString();
      yield text;
    }
  }
  /**
   * Returns the underlying response as a ReadableStream (Web API)
   */
  async sendAsReadableStream(mode, content, options = {}) {
    const isStream = options.stream === true;
    const payload = { text: content, stream: isStream };
    const response = await this.client.post(`/${mode}`, payload, {
      responseType: "stream"
    });
    const nodeStream = response.data;
    return new ReadableStream({
      start(controller) {
        nodeStream.on("data", (chunk) => controller.enqueue(chunk));
        nodeStream.on("end", () => controller.close());
        nodeStream.on("error", (err) => controller.error(err));
      },
      cancel() {
        nodeStream.destroy();
      }
    });
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
