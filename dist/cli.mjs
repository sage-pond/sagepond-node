#!/usr/bin/env node
import {
  SagepondClient
} from "./chunk-HWUOJSXM.mjs";

// src/cli.ts
import { Command } from "commander";
import path from "path";
var program = new Command();
program.name("sagepond").description("CLI to interact with Sagepond API with automatic file chunking").version("1.0.0");
program.command("process").description("Process a text file through the Sagepond API").requiredOption("-f, --file <path>", "Path to the text file").requiredOption("-k, --key <apiKey>", "SAGE POND API Key").requiredOption("-m, --mode <mode>", "API endpoint mode (e.g. segment)").action(async (options) => {
  try {
    const filePath = path.resolve(process.cwd(), options.file);
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
