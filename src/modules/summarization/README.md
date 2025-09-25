# Summarization Module

Summarizes text and extracts action items using a strict offline Transformers pipeline (no fallback). A local model must be present under `./models`.

## Exports
- `summarizeText(text: string, lang?: string): Promise<SummaryResult>`

`SummaryResult` is defined in `src/types/summary.ts` and includes `summary`, `departments`, `department`, and `actionItems`.

## How It Works
- Loads a local Transformers summarization pipeline (`@xenova/transformers`) using models in `./models`.
  - Prefers `SUMMARY_CONFIG.longDocModel` for long English docs.
  - Uses `SUMMARY_CONFIG.langModels[lang]` when available.
  - Otherwise uses `SUMMARY_CONFIG.defaultModel`/`modelId`.
- If no local model is available or loading fails, the summarizer throws an error (no fallback path).
- Action items:
  - ML classifier (local) if available; otherwise regex-based heuristics.
- Department extraction using multilingual patterns and normalization.

## Configuration
See `src/config/summary.ts` for:
- `modelId`, `defaultModel`, `longDocModel`, `langModels`, `chunkSize`, `fallbackSentences`.

Models must be downloaded locally into `./models/<model-id>` for `@xenova/transformers` to load.

## Usage
```ts
import { summarizeText } from "./index.js";

const res = await summarizeText(text, "english");
console.log(res.summary);
console.log(res.actionItems);
```

## Notes
- Fully offline when models exist locally; otherwise the summarizer will error.
- For best results, cache `Xenova/distilbart-cnn-6-6` under `./models`.

### Windows paths
- Prefer passing the repository ID (e.g., `Xenova/distilbart-cnn-6-6`) to `pipeline()` and set `env.localModelPath = './models'` and `env.cacheDir = './models'`. This avoids issues with `file:///C:/...` URIs being misinterpreted.
- Ensure `env.allowRemoteModels = false` to prevent any network access.
