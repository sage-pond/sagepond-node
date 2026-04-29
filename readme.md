# SAGE POND API SDK

TypeScript/JavaScript SDK and CLI for talking to the SAGE POND API.

## Status

This project is still not yet ready. The package is in active development, the API contract may still change, and the current implementation should be treated as experimental rather than production-stable.

## What It Includes

- A `SagepondClient` for programmatic API access
- Hierarchical text chunking (Paragraphs -> Sentences -> Words) to keep requests under a byte limit
- CommonJS, ESM, and TypeScript type output in `dist/`

## Installation

```
npm i @sage-pond/sdk
```

For local development inside this repository:

```bash
git clone https://github.com/sage-pond/sagepond-node.git
npm install
npm run build
```

## Usage

### Initialize the Client

```javascript
const { SagepondClient } = require('@sage-pond/sdk');

const client = new SagepondClient({
  apiKey: 'your_api_key_here',
  baseUrl: 'https://api.sagepond.com/v1' // Optional
});
```

You can also set the API key via the `SP_KEY` environment variable.

### Basic Usage

```javascript
const client = new SagepondClient({ apiKey: 'your_api_key' });

// Process a text file
const results = await client.processFile('path/to/file.txt', 'tokenize');
console.log(results);
```

To write tokenized CSV output to a custom location:

```javascript
const results = await client.processFile('path/to/file.txt', 'tokenize', {
  outputCsvPath: 'path/to/output/results.csv'
});
console.log(results);
```

`processFile()` reads a text file, splits it into byte-limited chunks, prefers sentence endings as safe boundaries where possible, and sends those chunks sequentially to the selected endpoint.

When `mode` is `tokenize`, the SDK writes CSV output. By default it writes beside the input file using the same base name with a `.csv` extension. You can override that with `outputCsvPath`.

Method signature:

```ts
processFile(
  filePath: string,
  mode: string,
  options?: { outputCsvPath?: string }
): Promise<any[]>
```


## CLI Usage

```bash
sagepond process --file ./input.txt --mode tokenize --output ./exports/output.csv
```

If `--output` is omitted in `tokenize` mode, the CSV is written next to the input file.

## Chunking Behavior

The SDK exports `chunkText()` for byte-limited chunking using a hierarchical approach.

- **Hierarchy of Separators**: It attempts to split by paragraphs (`\n\n`), then lines (`\n`), then sentences (`. `, `! `, `? `), and finally spaces (` `).
- **Adaptive Splitting**: It only moves to a smaller separator if a chunk still exceeds the limit.
- **Byte Limit**: Default chunk limit is `2 MB`.
- **Oversized Chunks**: If a block of text exceeds the limit and cannot be split further by any separator (e.g., a single massive string with no spaces), it is skipped with a warning to ensure the process continues.
- **Sequential Processing**: File processing sends chunks one after another to maintain order.

## Development

Available scripts:

```bash
npm run build
npm run dev
npm run test
```

## Current Limitations

- Chunks that cannot be split below the byte limit using the defined separators are skipped.
- CLI input currently expects the API key as a flag rather than from environment variables.
- Error handling is basic and returns raw API error payloads inside thrown messages.
- The README examples reflect the current code, not a finalized public API guarantee.


## License

Apache 2.0
