# Translation Module

Provides a translation interface. Currently implemented as an offline passthrough for English or ASCII-dominant text.

## Exports
- `translateText(text: string, sourceLang: string, targetLang?: string): Promise<TranslationResult>`

`TranslationResult` is defined in `src/types/translation.ts`:
- `sourceLang: string`
- `targetLang: string`
- `translatedText: string`

## Behavior
- If `sourceLang` suggests English or the input is >90% ASCII, returns the input unchanged.
- Placeholder for future offline MT; keeps interface stable for the pipeline.

## Usage
```ts
import { translateText } from "./index.js";

const out = await translateText(text, "eng", "English");
console.log(out.translatedText);
```

## Notes
- Designed to keep the pipeline fully offline.
- Replace the implementation with a real translator while preserving the return shape.
