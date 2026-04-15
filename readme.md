# SAGE POND API SDK

TypeScript/JavaScript SDK and CLI for talking to the SAGE POND API.

## Status

This project is still not yet ready. The package is in active development, the API contract may still change, and the current implementation should be treated as experimental rather than production-stable.

## What It Includes

- A `SagepondClient` for programmatic API access
- Sentence-aware text chunking to keep requests under a byte limit
- CommonJS, ESM, and TypeScript type output in `dist/`

## Installation

```
Coming soon....
```

For local development inside this repository:

```bash
npm install
npm run build
```



### Process a File

`processFile()` reads a text file, splits it into byte-limited chunks, prefers sentence endings as safe boundaries where possible, and sends those chunks sequentially to the selected endpoint.


## CLI Usage

Coming soon....

## Chunking Behavior

The SDK exports `chunkText()` for byte-limited chunking with sentence-ending fallback boundaries:

Current behavior:

- Default chunk limit is `2 MB`
- The byte limit is the main rule for chunking
- Sentence endings such as `.`, `!`, and `?` are used as preferred safe split boundaries
- If a single sentence exceeds the configured limit, an error is thrown
- File processing sends chunks sequentially, not in parallel

## Development

Available scripts:

```bash
npm run build
npm run dev
npm run test
```

## Current Limitations

- The sentence-ending detection is intentionally simple and may not handle every language or edge case correctly
- CLI input currently expects the API key as a flag rather than from environment variables
- Error handling is basic and returns raw API error payloads inside thrown messages
- The README examples reflect the current code, not a finalized public API guarantee

## License

Apache 2.0
