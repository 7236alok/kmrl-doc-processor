# Embeddings Module

Generates a deterministic, offline embedding vector for the input text. Suitable for local testing and avoiding network usage.

## Exports
- `generateEmbedding(text: string): Promise<EmbeddingResult>`

`EmbeddingResult` is defined in `src/types/embedding.ts`:
- `vector: number[]` (length 1536)
- `model: string` (from `MODEL_CONFIG.embeddings.model`)

## How It Works
- Uses a deterministic 32-bit MurmurHash of the input (first 4096 chars) to seed a Mulberry32 PRNG.
- Fills a 1536-length vector with values in [-1, 1).
- Model name is taken from `src/config/model-config.ts`.

## Usage
```ts
import { generateEmbedding } from "./index.js";

const { vector, model } = await generateEmbedding(text);
console.log(vector.length, model);
```

## Notes
- This is a stand-in for real embeddings and is not semantically meaningful.
- Keeps runs reproducible and fully offline for testing.
- Replace with a true embedding backend when needed; preserve the `EmbeddingResult` shape.
