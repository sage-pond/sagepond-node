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



### Process a File

`processFile()` reads a text file, splits it into byte-limited chunks, prefers sentence endings as safe boundaries where possible, and sends those chunks sequentially to the selected endpoint.


## CLI Usage

Coming soon....

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
