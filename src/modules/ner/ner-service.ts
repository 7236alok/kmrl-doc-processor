import type { NEROutput } from "../../types/ner.js";

const LOCATION_PATTERNS = [
  /\bKalamassery(?:\s+Station)?\b/i,
  /\bMaintenance\s+Depot\b/i,
  /\bDepot\b/i,
];

const ORG_PATTERNS = [
  /\bKMRL(?:\s+Metro)?\b/i,
  /\bRDSO\b/i,
  /\bEngineering(?:\s+Operations)?\b/i,
  /\bMaintenance\s+Team(?:\s+Lead)?\b/i,
];

const DATE_PATTERNS: RegExp[] = [
  /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{1,2},\s+\d{4}\b/gi,
  /\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{4}\b/gi,
  /\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/g,
];

export async function extractEntities(text: string): Promise<NEROutput> {
  const persons: string[] = [];
  const organizations: string[] = [];
  const locations: string[] = [];
  const dates: string[] = [];

  // normalize text spacing
  text = text.replace(/\s+/g, " ");

  // Improved person name detection
  const rawNames = text.match(/\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b/g) || [];
  const blocklist = ["Department", "Languages", "Frameworks", "Training", "Visualization", "Tools", "Programming"];
  persons.push(
    ...rawNames.filter(
      (name) => !blocklist.some((bad) => name.toLowerCase().includes(bad.toLowerCase()))
    )
  );

  // Organizations
  for (const rx of ORG_PATTERNS) {
    const m = text.match(rx);
    if (m) organizations.push(...m.map((x) => x.trim()));
  }

  // Locations
  for (const rx of LOCATION_PATTERNS) {
    const m = text.match(rx);
    if (m) locations.push(...m.map((x) => x.trim()));
  }

  // Dates
  for (const rx of DATE_PATTERNS) {
    const m = text.match(rx);
    if (m) dates.push(...m.map((x) => x.trim()));
  }

  const uniq = (arr: string[]) => Array.from(new Set(arr.filter(Boolean)));

  return {
    persons: uniq(persons),
    organizations: uniq(organizations),
    locations: uniq(locations),
    dates: uniq(dates),
  } as NEROutput;
}
