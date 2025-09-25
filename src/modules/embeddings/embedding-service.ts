import { MODEL_CONFIG } from "../../config/model-config.js";
import type { EmbeddingResult } from "../../types/embedding.js";

export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  // Deterministic offline embedding using seeded hash-based PRNG
  const size = 1536;
  const seed = murmurhash3_32_gc((text || '').slice(0, 4096));
  const rng = mulberry32(seed);
  const vector = new Array<number>(size);
  for (let i = 0; i < size; i++) {
    vector[i] = rng() * 2 - 1; // [-1, 1)
  }

  return { vector, model: MODEL_CONFIG.embeddings.model };
}

// Lightweight seeded PRNG (Mulberry32)
function mulberry32(a: number) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// MurmurHash3 (32-bit) for seeding
function murmurhash3_32_gc(key: string, seed = 0) {
  let remainder = key.length & 3; // key.length % 4
  let bytes = key.length - remainder;
  let h1 = seed;
  const c1 = 0xcc9e2d51;
  const c2 = 0x1b873593;
  let i = 0;

  while (i < bytes) {
    let k1 = ((key.charCodeAt(i) & 0xff)) |
             ((key.charCodeAt(++i) & 0xff) << 8) |
             ((key.charCodeAt(++i) & 0xff) << 16) |
             ((key.charCodeAt(++i) & 0xff) << 24);
    ++i;

    k1 = Math.imul(k1, c1);
    k1 = (k1 << 15) | (k1 >>> 17);
    k1 = Math.imul(k1, c2);

    h1 ^= k1;
    h1 = (h1 << 13) | (h1 >>> 19);
    h1 = Math.imul(h1, 5) + 0xe6546b64;
  }

  let k1 = 0;

  switch (remainder) {
    case 3:
      k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16;
    case 2:
      k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8;
    case 1:
      k1 ^= (key.charCodeAt(i) & 0xff);
      k1 = Math.imul(k1, c1);
      k1 = (k1 << 15) | (k1 >>> 17);
      k1 = Math.imul(k1, c2);
      h1 ^= k1;
  }

  h1 ^= key.length;
  h1 ^= h1 >>> 16;
  h1  = Math.imul(h1, 0x85ebca6b);
  h1 ^= h1 >>> 13;
  h1  = Math.imul(h1, 0xc2b2ae35);
  h1 ^= h1 >>> 16;

  return h1 >>> 0;
}
