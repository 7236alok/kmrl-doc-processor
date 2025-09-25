# NER Module

Extracts simple named entities (persons, organizations, locations, dates) from text using deterministic regex and heuristics tailored for KMRL domain.

## Exports
- `extractEntities(text: string): Promise<NEROutput>`

`NEROutput` is defined in `src/types/ner.ts`:
- `persons: string[]`
- `organizations: string[]`
- `locations: string[]`
- `dates: string[]`

## How It Works
- Persons: capitalized two-token names (e.g., `John Doe`).
- Organizations: matches `KMRL`, `RDSO`, `Engineering Operations`, `Maintenance Team (Lead)`.
- Locations: `Kalamassery`, `Maintenance Depot`, `Depot`.
- Dates: common English formats like `Jan 12, 2025`, `12 Jan 2025`, and `dd/mm/yyyy`.
- Deduplicates and trims results.

## Usage
```ts
import { extractEntities } from "./index.js";

const ner = await extractEntities(text);
console.log(ner.organizations, ner.locations);
```

## Notes
- Fully offline and lightweight; not a full NER model.
- Extend patterns in `ner-service.ts` for more domain coverage.
