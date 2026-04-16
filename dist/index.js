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
var SagepondClient = class {
  client;
  apiKey;
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.SP_KEY || "";
    if (!this.apiKey) {
      throw new Error("API key must be provided either in options or via the SP_KEY environment variable.");
    }
    this.client = import_axios.default.create({
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
      if (import_axios.default.isAxiosError(error)) {
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
