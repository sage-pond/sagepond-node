#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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

// src/cli.ts
var import_commander = require("commander");

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
  constructor(options) {
    this.apiKey = options.apiKey;
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

// src/cli.ts
var import_path = __toESM(require("path"));
var program = new import_commander.Command();
program.name("sagepond").description("CLI to interact with Sagepond API with automatic file chunking").version("1.0.0");
program.command("process").description("Process a text file through the Sagepond API").requiredOption("-f, --file <path>", "Path to the text file").requiredOption("-k, --key <apiKey>", "SAGE POND API Key").requiredOption("-m, --mode <mode>", "API endpoint mode (e.g. segment)").action(async (options) => {
  try {
    const filePath = import_path.default.resolve(process.cwd(), options.file);
    const client = new SagepondClient({ apiKey: options.key });
    console.log(`Processing file: ${filePath} in mode: ${options.mode}`);
    const results = await client.processFile(filePath, options.mode);
    console.log("Successfully processed chunks:");
    console.log(JSON.stringify(results, null, 2));
  } catch (error) {
    console.error("Error:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
});
program.parse(process.argv);
