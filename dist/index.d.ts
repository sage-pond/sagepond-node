interface SagepondOptions {
    apiKey: string;
    baseUrl?: string;
}
declare class SagepondClient {
    private client;
    private apiKey;
    constructor(options: SagepondOptions);
    /**
     * Send a single chunk to the API
     */
    send(mode: string, content: string): Promise<any>;
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

export { SagepondClient, type SagepondOptions, chunkText };
