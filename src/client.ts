import axios, { AxiosInstance, ResponseType } from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { chunkText } from './chunker';
import './error-map';

// Define schemas for validation
const SagepondOptionsSchema = z.object({
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional(),
});

export type SagepondOptions = z.infer<typeof SagepondOptionsSchema>;

export interface SendOptions {
  stream?: boolean;
}

export interface ProcessFileOptions {
  outputCsvPath?: string;
}

export class SagepondClient {
  private client: AxiosInstance;
  private apiKey: string;

  // Resource-based namespacing
  public models = {
    list: (options?: SendOptions) => this.send('models/list', '', options),
  };

  constructor(options: SagepondOptions = {}) {
    // Validate options
    const validated = SagepondOptionsSchema.parse(options);

    this.apiKey = validated.apiKey || process.env.SP_KEY || '';

    if (!this.apiKey) {
      throw new Error('API key must be provided either in options or via the SP_KEY environment variable.');
    }

    this.client = axios.create({
      baseURL: validated.baseUrl || 'https://api.sagepond.com/v1',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Sagepond/1.0.0'
      },
    });

    // Explicitly clear axios defaults for this instance to minimize header footprint
    (this.client.defaults.headers as any).common = {};
  }

  /**
   * Logs an error to the .sp_logs directory.
   */
  private async logError(error: any): Promise<void> {
    try {
      const logsDir = path.join(process.cwd(), '.sp_logs');
      await fs.mkdir(logsDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const logFile = path.join(logsDir, `error-${timestamp}.log`);
      const errorContent = {
        timestamp: new Date().toISOString(),
        message: error.message,
        stack: error.stack,
        details: error
      };

      await fs.writeFile(logFile, JSON.stringify(errorContent, null, 2), 'utf-8');
      process.stderr.write(`\nError logged to: ${logFile}\n`);
    } catch (logErr) {
      // If logging itself fails, just print to stderr as a fallback
      process.stderr.write(`\nFailed to log error to disk: ${logErr}\n`);
    }
  }

  /**
   * Send a request to the API with optional streaming support.
   * Returns AsyncIterable if stream is true, otherwise returns the JSON response.
   */
  async send(mode: string, content: string, options: SendOptions = {}): Promise<any | AsyncIterable<string>> {
    const isStream = options.stream === true;

    try {
      const payload = JSON.parse(JSON.stringify({
        text: content,
        stream: isStream
      }));

      const response = await this.client.post(`/${mode}`, payload, {
        responseType: (isStream ? 'stream' : 'json') as ResponseType,
      });

      if (isStream) {
        return this.streamIterator(response.data);
      }

      return response.data;
    } catch (error: any) {
      await this.logError(error);
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const data = error.response?.data;
        const message = typeof data === 'object' ? JSON.stringify(data) : data;
        throw new Error(`SAGE POND API Error: ${status} - ${message}`);
      }
      throw error;
    }
  }

  /**
   * Helper to convert a Node.js Readable stream into an AsyncIterable
   */
  private async *streamIterator(stream: any): AsyncIterable<string> {
    for await (const chunk of stream) {
      const text = chunk.toString();
      // Handle potential Server-Sent Events (SSE) formatting if needed
      // For now, just yield the raw text chunks
      yield text;
    }
  }

  /**
   * Returns the underlying response as a ReadableStream (Web API)
   */
  async sendAsReadableStream(mode: string, content: string, options: SendOptions = {}): Promise<ReadableStream> {
    const isStream = options.stream === true;
    const payload = JSON.parse(JSON.stringify({ text: content, stream: isStream }));

    const response = await this.client.post(`/${mode}`, payload, {
      responseType: 'stream',
    });

    const nodeStream = response.data;

    return new ReadableStream({
      start(controller) {
        nodeStream.on('data', (chunk: any) => controller.enqueue(chunk));
        nodeStream.on('end', () => controller.close());
        nodeStream.on('error', (err: any) => controller.error(err));
      },
      cancel() {
        nodeStream.destroy();
      }
    });
  }

  /**
   * Helper to format results into a CSV string with a template header.
   */
  private formatToCsv(results: any[]): string {
    const header = 'no.,sentence';
    const rows = [header];
    let counter = 1;

    for (const result of results) {
      // Normalize result to an array (the API might return an array of strings or an object with sentences)
      const items = Array.isArray(result) ? result :
        (result && typeof result === 'object' && result.sentences) ? result.sentences :
          [result];

      for (const item of items) {
        if (item === undefined || item === null) continue;

        // Escape quotes for CSV and wrap in quotes
        const sentence = String(item).replace(/"/g, '""');
        rows.push(`${counter++},"${sentence}"`);
      }
    }

    return rows.join('\n');
  }

  /**
   * Process a text file sequentially, chunking at 4MB sentence boundaries.
   */
  async processFile(filePath: string, mode: string, options: ProcessFileOptions = {}): Promise<any[]> {
    const text = await fs.readFile(filePath, 'utf-8');
    const chunks = chunkText(text);
    const total = chunks.length;

    const results = [];
    try {
      for (let i = 0; i < total; i++) {
        // Show progress in the terminal
        process.stdout.write(`\rChunks: [Processing: 1] [Finished: ${i}] Total: ${total}`);

        // Wait for each response before sending the next chunk
        const result = await this.send(mode, chunks[i]);
        results.push(result);
      }
      // Final progress state
      process.stdout.write(`\rChunks: [Processing: 0] [Finished: ${total}] Total: ${total}\n`);

      // If mode is tokenize, write to CSV
      if (mode === 'tokenize') {
        const csvContent = this.formatToCsv(results);
        const parsedPath = path.parse(filePath);
        const outputFilePath = options.outputCsvPath
          ? path.resolve(options.outputCsvPath)
          : path.join(parsedPath.dir, `${parsedPath.name}.csv`);
        const outputDir = path.dirname(outputFilePath);

        await fs.mkdir(outputDir, { recursive: true });
        await fs.writeFile(outputFilePath, csvContent, 'utf-8');
        console.log(`\nTokenization complete. Output written to: ${outputFilePath}`);
      }
    } catch (error) {
      process.stdout.write('\n'); // Ensure error message starts on a new line
      throw error;
    }

    return results;
  }
}
