import express from "express";
import { loadDocument, loadMetadata } from "../db/local-adapter.js";
// ESM resolution: explicit .js extension for local imports

const router = express.Router();

// GET /api/get-document/:docId
router.get("/:docId", (req, res) => {
  const { docId } = req.params;

  const text = loadDocument(docId);
  const metadata = loadMetadata(docId);

  if (!text || !metadata) return res.status(404).json({ error: "Document not found" });

  res.json({ docId, text, metadata });
});

export default router;
