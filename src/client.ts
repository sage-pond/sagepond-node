import axios, { AxiosInstance } from 'axios';
import fs from 'fs/promises';
import { chunkText } from './chunker';

export interface SagepondOptions {
  apiKey?: string;
  baseUrl?: string;
}

export class SagepondClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(options: SagepondOptions = {}) {
    this.apiKey = options.apiKey || process.env.SP_KEY || '';

    if (!this.apiKey) {
      throw new Error('API key must be provided either in options or via the SP_KEY environment variable.');
    }

    this.client = axios.create({
      baseURL: options.baseUrl || 'https://api.sagepond.com/v1',
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
   * Send a single chunk to the API
   */
  async send(mode: string, content: string): Promise<any> {
    try {
      // Manually stringify the data to ensure it's a string before sending
      const data = JSON.stringify({
        text: content
      });
      // Send the text content in the body with the key "text"
      const response = await this.client.post(`/${mode}`, data);
      return response.data;
    } catch (error: any) {
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
