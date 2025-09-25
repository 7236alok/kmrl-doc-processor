import express from "express";
import multer from "multer";
import path from "path";
import { runPipeline } from "../modules/pipeline/pipeline-runner.js";

const router = express.Router();
const upload = multer({ dest: "storage/uploads/" });

// POST /api/process-document
router.post("/", upload.single("document"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No document uploaded" });

    const filePath = path.resolve(req.file.path);
    const docId = req.file.filename;

    const metadata = await runPipeline(filePath, docId);

    res.json({ message: "Document processed successfully", docId, metadata });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Pipeline failed" });
  }
});

export default router;
