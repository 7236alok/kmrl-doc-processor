# Classification Module

Classifies a document's text into one of a small set of categories using deterministic, offline heuristics. No network calls or external models are required.

## Exports
- `classifyDocument(text: string): Promise<ClassificationResult>`

`ClassificationResult` is defined in `src/types/classification.ts`:
- `category: "HR" | "Safety" | "Procurement" | "Engineering" | "Finance"`
- `confidence: number` (0-1)

## How It Works
- Scores categories based on regex keyword matches and weights.
- Picks the highest scoring category with a confidence scaled by the margin.
- Falls back to simple heuristics with default category when no signal is present.

## Usage
```ts
import { classifyDocument } from "./index.js";

const result = await classifyDocument(text);
console.log(result.category, result.confidence);
```

## Notes
- Purely deterministic and offline.
- Tuned for KMRL domain documents with keywords across HR, Safety, Procurement, Engineering, Finance.
- If you expand categories, update the `categories` list and `keywordMap` in `classifier.ts` accordingly.
