"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  SagepondClient: () => SagepondClient,
  chunkText: () => chunkText
});
module.exports = __toCommonJS(index_exports);

// src/client.ts
var import_axios = __toESM(require("axios"));
var import_promises = __toESM(require("fs/promises"));
var import_zod = require("zod");

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
var SagepondOptionsSchema = import_zod.z.object({
  apiKey: import_zod.z.string().optional(),
  baseUrl: import_zod.z.string().url().optional()
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
    this.client = import_axios.default.create({
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
      if (import_axios.default.isAxiosError(error)) {
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
    const text = await import_promises.default.readFile(filePath, "utf-8");
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SagepondClient,
  chunkText
});
