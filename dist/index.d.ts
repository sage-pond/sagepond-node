import { z } from 'zod';

declare const SagepondOptionsSchema: z.ZodObject<{
    apiKey: z.ZodOptional<z.ZodString>;
    baseUrl: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
type SagepondOptions = z.infer<typeof SagepondOptionsSchema>;
interface SendOptions {
    stream?: boolean;
}
declare class SagepondClient {
    private client;
    private apiKey;
    models: {
        list: (options?: SendOptions) => Promise<any>;
    };
    constructor(options?: SagepondOptions);
    /**
     * Send a request to the API with optional streaming support.
     * Returns AsyncIterable if stream is true, otherwise returns the JSON response.
     */
    send(mode: string, content: string, options?: SendOptions): Promise<any | AsyncIterable<string>>;
    /**
     * Helper to convert a Node.js Readable stream into an AsyncIterable
     */
    private streamIterator;
    /**
     * Returns the underlying response as a ReadableStream (Web API)
     */
    sendAsReadableStream(mode: string, content: string, options?: SendOptions): Promise<ReadableStream>;
    /**
     * Process a text file sequentially, chunking at 4MB sentence boundaries.
     */
    processFile(filePath: string, mode: string): Promise<any[]>;
}

/**
 * Chunks text based on a byte limit, ensuring splits only occur at sentence boundaries.
 * If a single sentence exceeds the limit, an error is thrown.
 */
declare function chunkText(text: string, limitBytes?: number): string[];

export { SagepondClient, type SagepondOptions, type SendOptions, chunkText };
