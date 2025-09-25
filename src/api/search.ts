import express from "express";
import { searchDocuments } from "../db/local-adapter.js";

const router = express.Router();

// GET /api/search?keyword=...
router.get("/", (req, res) => {
  const keyword = req.query.keyword as string;
  if (!keyword) return res.status(400).json({ error: "Keyword is required" });

  const results = searchDocuments(keyword);
  res.json({ count: results.length, results });
});

export default router;
