import axios, { AxiosInstance, ResponseType } from 'axios';
import fs from 'fs/promises';
import { z } from 'zod';
import { chunkText } from './chunker';

// Define schemas for validation
const SagepondOptionsSchema = z.object({
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional(),
});

export type SagepondOptions = z.infer<typeof SagepondOptionsSchema>;

export interface SendOptions {
  stream?: boolean;
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
      },
    });

    // Explicitly clear axios defaults for this instance to minimize header footprint
    (this.client.defaults.headers as any).common = {};
  }

  /**
   * Send a request to the API with optional streaming support.
   * Returns AsyncIterable if stream is true, otherwise returns the JSON response.
   */
  async send(mode: string, content: string, options: SendOptions = {}): Promise<any | AsyncIterable<string>> {
    const isStream = options.stream === true;

    try {
      const payload = {
        text: content,
        stream: isStream
      };

      const response = await this.client.post(`/${mode}`, payload, {
        responseType: (isStream ? 'stream' : 'json') as ResponseType,
      });

      if (isStream) {
        return this.streamIterator(response.data);
      }

      return response.data;
    } catch (error: any) {
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
    const payload = { text: content, stream: isStream };

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
   * Process a text file sequentially, chunking at 4MB sentence boundaries.
   */
  async processFile(filePath: string, mode: string): Promise<any[]> {
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
    } catch (error) {
      process.stdout.write('\n'); // Ensure error message starts on a new line
      throw error;
    }

    return results;
  }
}
