// ESM test: run with
// node --loader ts-node/esm ./src/tests/ocr.test.ts
// Suppress experimental and deprecation warnings in test runs
process.removeAllListeners('warning');
process.on('warning', (w) => {
	if (w.name === 'ExperimentalWarning' || w.name === 'DeprecationWarning') return;
	console.warn(w.name, w.message);
});
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';

import { extractText } from '../modules/ocr/ocr-service.js';

async function testDirectTextExtraction() {
	const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ocr-direct-'));
	const filePath = path.join(tmpDir, 'sample.txt');
	const sampleText = 'Metro maintenance schedule: Inspect brakes at 10:00 AM.';
	fs.writeFileSync(filePath, sampleText, 'utf8');

	const res = await extractText(filePath, { preferredEngine: 'auto', languages: ['eng'] });
	assert.equal(res.engine, 'direct-text', 'Expected direct-text engine for .txt file');
	assert.ok(res.text.includes('Inspect brakes'), 'Extracted text should include original content');
	assert.ok(res.confidence >= 0.9, 'Direct extraction should yield high confidence');
	console.log('[ocr.test] direct text extraction passed');
}

async function testTesseractLowConfidenceFallback() {
	const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ocr-lowconf-'));
	const imgPath = path.join(tmpDir, 'blank.png');
	await sharp({ create: { width: 160, height: 60, channels: 3, background: '#ffffff' } }).png().toFile(imgPath);

	const res = await extractText(imgPath, { preferredEngine: 'tesseract', languages: ['eng'], confidenceThreshold: 0.1 });
	assert.equal(res.engine, 'tesseract', 'Expected tesseract engine for image');
	assert.ok(res.text.trim().length < 5, 'Blank image should yield almost no text');
	assert.ok(res.fallbackUsed === true, 'Fallback path should mark fallbackUsed true when confidence low and no better engine');
	console.log('[ocr.test] tesseract low confidence fallback path passed');
}

async function testHybridPdf() {
	const pdfPath = path.resolve('./storage/documents/not-processed/test.pdf');
	if (!fs.existsSync(pdfPath)) {
		// Auto-generate a tiny one-page PDF using sharp (render SVG -> PDF).
		try {
			fs.mkdirSync(path.dirname(pdfPath), { recursive: true });
			// Write a minimal PDF object with a single page containing the text.
			// This is not a full-featured PDF but is sufficient for pdfjs to parse and
			// extract some text for the purpose of our unit test.
			const pdfContent = `%PDF-1.1\n1 0 obj<< /Type /Catalog /Pages 2 0 R>>endobj\n2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1>>endobj\n3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj\n4 0 obj<< /Length 44>>stream\nBT /F1 24 Tf 72 720 Td (Test PDF for hybrid OCR) Tj ET\nendstream\nendobj\n5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\nxref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000208 00000 n \n0000000276 00000 n \ntrailer<< /Root 1 0 R /Size 6>>\nstartxref\n350\n%%EOF\n`;
			fs.writeFileSync(pdfPath, pdfContent, 'latin1');
			console.log('[ocr.test] Wrote minimal PDF for hybrid test at', pdfPath);
		} catch (genErr) {
			const msg = genErr instanceof Error ? genErr.message : String(genErr);
			console.warn('[ocr.test] Could not generate sample PDF, skipping hybrid test:', msg);
			return;
		}
	}
	const res = await extractText(pdfPath, { hybridPdf: true, languages: ['eng'] });
	assert.equal(res.engine, 'pdf-hybrid', 'Expected pdf-hybrid engine when hybridPdf flag set');
	assert.ok(res.text.length > 0, 'Hybrid PDF extraction should return some text');
	console.log('[ocr.test] hybrid pdf extraction passed (length=' + res.text.length + ')');
}

async function run() {
	try {
		await testDirectTextExtraction();
		await testTesseractLowConfidenceFallback();
		await testHybridPdf();
		console.log('[ocr.test] All OCR tests passed.');
	} catch (err) {
		console.error('[ocr.test] Failure:', err);
		process.exit(1);
	}
}

run();

