import type { ClassificationResult, ClassifiedCategory } from "../../types/classification.js";
import { pipeline } from "@xenova/transformers";

const categories = ["HR", "Safety", "Procurement", "Engineering", "Finance", "Operations", "Maintenance", "Project"] as const;
type Category = (typeof categories)[number];

function toKnownCategory(value: string): Category | null {
  const normalized = value.toLowerCase();
  const found = categories.find((c) => c.toLowerCase() === normalized);
  return found ?? null;
}

// 🧠 Load model once (cached globally)
let classifierPromise: ReturnType<typeof pipeline> | null = null;
async function getClassifier() {
  if (!classifierPromise) {
    // Use the locally available DistilBERT model for text classification
    // Note: This is a sentiment classifier, so we'll adapt it for category classification
    classifierPromise = pipeline("text-classification", "Xenova/distilbert-base-uncased-finetuned-sst-2-english");
  }
  return classifierPromise;
}

export async function classifyDocument(text: string): Promise<ClassificationResult> {
  const t = (text || "").toLowerCase();
  const modelScores: Record<Category, number> = {
    HR: 0,
    Safety: 0,
    Procurement: 0,
    Engineering: 0,
    Finance: 0,
    Operations: 0,
    Maintenance: 0,
    Project: 0,
  };

  // ------------------------------------------------------------------
  // 1. Transformer-based classification (adapted for sentiment-based categorization)
  // ------------------------------------------------------------------
  try {
    const classifier = await getClassifier();
    console.log(`[DEBUG] Classification model loaded successfully`);
    
    // Since DistilBERT gives sentiment, we'll use it to gauge document tone
    // and apply heuristics based on that + keyword matching
    const sentimentResult = await classifier(text);
    const positiveScore = Array.isArray(sentimentResult) ? 
      sentimentResult.find(r => r.label === 'POSITIVE')?.score || 0 : 
      sentimentResult.score || 0;
    
    console.log(`[DEBUG] Sentiment analysis result:`, sentimentResult);
    console.log(`[DEBUG] Positive sentiment score: ${positiveScore}`);
    
    // Use sentiment to boost certain categories
    // Positive sentiment might indicate successful operations, projects
    // Negative sentiment might indicate safety issues, maintenance needs
    if (positiveScore > 0.7) {
      modelScores.Operations += 0.2;
      modelScores.Project += 0.2;
    } else if (positiveScore < 0.3) {
      modelScores.Safety += 0.15;
      modelScores.Maintenance += 0.15;
    }
    
  } catch (err) {
    console.warn("⚠️ Transformer model unavailable, skipping model-based step.", err);
  }

  // ------------------------------------------------------------------
  // 2. Keyword scoring layer (boost model or add missing categories)
  // ------------------------------------------------------------------
  const keywordMap: Record<Category, RegExp[]> = {
    HR: [/\bhr\b|human\s+resources|employee|recruit|leave|payroll/i],
    Safety: [/\bsafety\b|hazard|incident|ppe|emergency|fire\s*drill/i],
    Procurement: [/purchase|procure|tender|vendor|rfp|invoice/i],
    Engineering: [/engineering|design|specification|train\s*set|depot|power/i],
    Finance: [/budget|finance|gst|audit|payment|accounts/i],
    Operations: [/operations|schedule|passenger|service|metro/i],
    Maintenance: [/maintenance|repair|inspection|upkeep|preventive/i],
    Project: [/project|construction|execution|milestone|contractor/i],
  };

  for (const [cat, patterns] of Object.entries(keywordMap) as [Category, RegExp[]][]) {
    for (const rx of patterns) {
      if (rx.test(t)) modelScores[cat] = (modelScores[cat] || 0) + 0.1;
    }
  }

  // ------------------------------------------------------------------
  // 3. Rule-based fallback – if no score >= 0.5
  // ------------------------------------------------------------------
  const ruleHeuristics: Array<[Category, RegExp]> = [
    ["Safety", /safety\s+alert|incident|hazard|ppe|emergency|critical|risk|high\s+priority/],
    ["Engineering", /rolling\s*stock|train\s*set|ts-\d+|depot|kalamassery|design|architecture/],
    ["Maintenance", /maintenance|repair|inspection|overhaul|preventive|brake\s+system/],
    ["Operations", /operations|ops|service|schedule|passenger|kmrl|metro/],
    ["HR", /payroll|recruit|employee|leave|benefit|human\s+resources|staff/],
    ["Procurement", /purchase|tender|vendor|rfp|invoice|supplier/],
    ["Finance", /budget|expense|ledger|audit|tax|gst|financial/],
    ["Project", /project|implementation|construction|execution|milestone|contractor/],
  ];

  const fallbackMatches: ClassifiedCategory[] = [];
  for (const [cat, rx] of ruleHeuristics) {
    if (rx.test(t)) {
      const strongMatch = /kmrl|rolling\s*stock|train\s*set|depot|kalamassery|safety\s+alert/i.test(t);
      fallbackMatches.push({
        category: cat,
        confidence: +(strongMatch ? 0.75 : 0.65).toFixed(2),
        score: +(strongMatch ? 0.75 : 0.65).toFixed(2),
      });
    }
  }

  // ------------------------------------------------------------------
  // 4. Final aggregation & filtering
  // ------------------------------------------------------------------
  let results: ClassifiedCategory[] = Object.entries(modelScores)
    .map(([category, confidence]) => ({
      category: category as Category,
      confidence: +confidence.toFixed(2),
      score: +confidence.toFixed(2),
    }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);

  // If transformer + keyword failed → use fallback
  const topConfidence = results[0]?.confidence ?? 0;
  if (results.length === 0 || topConfidence < 0.5) {
    if (fallbackMatches.length > 0) {
      results = fallbackMatches.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
    } else {
      results = [{ category: "Engineering", confidence: 0.45, score: 0 }];
    }
  }

  return results;
}
