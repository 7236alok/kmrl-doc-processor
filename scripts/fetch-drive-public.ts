import fs from 'fs-extra';
import path from 'path';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();
// Prefer config file at ./config/drive-public.json (not committed with secrets)
const CONFIG_PATH = path.join(process.cwd(), 'config', 'drive-public.json');
// Local upload manifest path
const LOCAL_UPLOAD_MANIFEST = path.join(process.cwd(), 'storage', 'file-upload.json');

// OPTIONAL: If you want to hard-code values directly into this script, set them here.
// WARNING: Hard-coding secrets is risky. Do NOT commit this file to version control if
// you paste real keys here. Prefer using `config/drive-public.json` or environment vars.
// (Removed hardcoded API key & folder ID; use env vars or config file only)
const HARDCODED_API_KEY: string | undefined = undefined;
const HARDCODED_FOLDER_ID: string | undefined = undefined;

let API_KEY = process.env.GOOGLE_DRIVE_API_KEY as string | undefined;
let FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID as string | undefined;

// If hard-coded values are present (non-placeholder), prefer them.
if (HARDCODED_API_KEY && HARDCODED_API_KEY !== 'PASTE_YOUR_API_KEY_HERE') API_KEY = HARDCODED_API_KEY;
if (HARDCODED_FOLDER_ID && HARDCODED_FOLDER_ID !== 'PASTE_YOUR_FOLDER_ID_HERE') FOLDER_ID = HARDCODED_FOLDER_ID;

// If a config file exists, read values from it (overrides env)
try {
  if (fs.existsSync(CONFIG_PATH)) {
    const cfgRaw = fs.readFileSync(CONFIG_PATH, 'utf8');
    const cfg = JSON.parse(cfgRaw) as { GOOGLE_DRIVE_API_KEY?: string; GOOGLE_DRIVE_FOLDER_ID?: string };
    API_KEY = cfg.GOOGLE_DRIVE_API_KEY || API_KEY;
    FOLDER_ID = cfg.GOOGLE_DRIVE_FOLDER_ID || FOLDER_ID;
  }
} catch (err) {
  console.warn('Warning: failed to read config/drive-public.json:', (err as Error).message);
}
const OUT_DIR = path.join(process.cwd(), 'storage', 'documents', 'not-processed');
const STATE_FILE = path.join(process.cwd(), 'storage', '.drive-public-sync.json');
// Optional: destination folder env var to skip if encountered (avoid 403 attempts)
const DESTINATION_FOLDER_ID = process.env.GOOGLE_DRIVE_DEST_FOLDER_ID;

if (!API_KEY || !FOLDER_ID) {
  console.error('Missing GOOGLE_DRIVE_API_KEY or GOOGLE_DRIVE_FOLDER_ID.');
  console.error('Create a config file at `config/drive-public.json` with the following content (do NOT commit secrets):');
  console.error(JSON.stringify({ GOOGLE_DRIVE_API_KEY: 'YOUR_API_KEY', GOOGLE_DRIVE_FOLDER_ID: 'YOUR_FOLDER_ID' }, null, 2));
  console.error('\nOr set environment variables in your shell or a .env file.');
  process.exit(1);
}

function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|\r\n\t]+/g, '_').trim();
}

async function ensureOutDir() {
  await fs.ensureDir(OUT_DIR);
}

// --- Local upload manifest support ---
type LocalUploadItem = {
  // Absolute or relative path to the file on disk
  path: string;
  // Optional custom name for the destination file (extension will be preserved if omitted)
  name?: string;
  // If true, move (rename) instead of copy
  move?: boolean;
};

async function loadLocalUploadManifest(): Promise<LocalUploadItem[] | null> {
  try {
    if (!(await fs.pathExists(LOCAL_UPLOAD_MANIFEST))) return null;
    const raw = await fs.readFile(LOCAL_UPLOAD_MANIFEST, 'utf8');
    const json = JSON.parse(raw);
    // Accept either an array or an object with a `files` property
    const items: unknown = Array.isArray(json) ? json : json?.files;
    if (!Array.isArray(items)) {
      console.warn('Local upload manifest found but not an array or { files: [...] } shape. Skipping.');
      return null;
    }
    // Filter to objects with at least a path
    const uploads: LocalUploadItem[] = items
      .filter((x: any) => x && typeof x.path === 'string')
      .map((x: any) => ({ path: x.path, name: x.name, move: Boolean(x.move) }));
    return uploads.length ? uploads : null;
  } catch (err) {
    console.warn('Warning: failed to read local upload manifest:', (err as Error).message);
    return null;
  }
}

async function uploadLocalFile(item: LocalUploadItem): Promise<string> {
  const srcPath = path.isAbsolute(item.path) ? item.path : path.resolve(process.cwd(), item.path);
  const srcExists = await fs.pathExists(srcPath);
  if (!srcExists) throw new Error(`Source file not found: ${srcPath}`);

  const baseName = item.name ? sanitizeFileName(item.name) : sanitizeFileName(path.basename(srcPath));
  const ext = path.extname(baseName) || path.extname(srcPath) || '';
  const destBase = ext ? baseName : baseName + (path.extname(srcPath) || '');
  let destName = destBase;
  let destPath = path.join(OUT_DIR, destName);

  // If file exists, append a numeric suffix
  let counter = 1;
  while (await fs.pathExists(destPath)) {
    const nameNoExt = destBase.replace(new RegExp(`${ext.replace('.', '\\.')}$`, 'i'), '');
    destName = `${nameNoExt} (${counter})${ext}`;
    destPath = path.join(OUT_DIR, destName);
    counter++;
  }

  if (item.move) {
    await fs.move(srcPath, destPath, { overwrite: false });
  } else {
    await fs.copy(srcPath, destPath, { overwrite: false, errorOnExist: true });
  }
  return destPath;
}

async function processLocalUploads() {
  const items = await loadLocalUploadManifest();
  if (!items) return; // nothing to do
  console.log(`Processing ${items.length} local upload item(s) from storage/file-upload.json ...`);
  for (const item of items) {
    try {
      const out = await uploadLocalFile(item);
      console.log(`Local upload saved -> ${out}`);
    } catch (err) {
      console.error(`Local upload failed for ${item.path}:`, (err as Error).message);
    }
  }
}

async function loadState(): Promise<Record<string, { id: string; modifiedTime?: string }>> {
  try {
    const raw = await fs.readFile(STATE_FILE, 'utf8');
    return JSON.parse(raw) as Record<string, { id: string; modifiedTime?: string }>;
  } catch (err) {
    return {};
  }
}

async function saveState(state: Record<string, { id: string; modifiedTime?: string }>) {
  await fs.ensureDir(path.dirname(STATE_FILE));
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

async function listFiles(pageToken?: string) {
  const params = new URLSearchParams({
    q: `'${FOLDER_ID}' in parents and trashed = false`,
    fields: 'nextPageToken, files(id,name,mimeType,modifiedTime,size)',
    pageSize: '100'
  });
  if (pageToken) params.set('pageToken', pageToken);
  if (API_KEY) params.set('key', API_KEY);

  const url = `https://www.googleapis.com/drive/v3/files?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`listFiles failed: ${res.status} ${res.statusText}`);
  return (await res.json()) as { nextPageToken?: string; files?: Array<any> };
}

async function downloadFile(file: { id: string; name: string; mimeType: string }) {
  const safeName = sanitizeFileName(file.name || `${file.id}`);
  // try to preserve extension when possible
  const ext = path.extname(safeName) || '';
  let outName = safeName;

  // For Google Docs types, export as plain text
  if (file.mimeType?.startsWith('application/vnd.google-apps')) {
    const exportMime = file.mimeType === 'application/vnd.google-apps.spreadsheet' ? 'text/csv' : 'text/plain';
    const url = `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=${encodeURIComponent(exportMime)}&key=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`export failed for ${file.id}: ${res.status} ${res.statusText}`);
    const extMap: Record<string, string> = { 'text/plain': '.txt', 'text/csv': '.csv', 'application/pdf': '.pdf' };
    outName = safeName + (extMap[exportMime] || '.txt');
    const outPath = path.join(OUT_DIR, outName);
    const buffer = await res.arrayBuffer();
    await fs.writeFile(outPath, Buffer.from(buffer));
    return outPath;
  }

  // regular file download
  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${API_KEY}`;
  const res = await fetch(downloadUrl);
  if (!res.ok) throw new Error(`download failed for ${file.id}: ${res.status} ${res.statusText}`);
  if (!ext) {
    // try to glean from response headers
    const ctype = res.headers.get('content-type') || '';
    if (ctype.includes('pdf')) outName = `${safeName}.pdf`;
    if (ctype.includes('msword') || ctype.includes('officedocument')) outName = `${safeName}.docx`;
    if (ctype.includes('text')) outName = `${safeName}.txt`;
  }
  // Avoid double extension
  if (outName.toLowerCase().endsWith('.pdf.pdf')) outName = outName.replace(/\.pdf\.pdf$/i, '.pdf');
  const outPath = path.join(OUT_DIR, outName);
  const stream = fs.createWriteStream(outPath);
  await new Promise<void>((resolve, reject) => {
    const body = res.body;
    if (!body) return reject(new Error('No response body'));
    body.pipe(stream);
    body.on('error', reject);
    stream.on('finish', () => resolve());
  });
  try { const sz = (await fs.stat(outPath)).size; console.log('Downloaded size:', sz, 'bytes'); } catch {}
  return outPath;
}

export async function run() {
  await ensureOutDir();
  // Process any local uploads declared in storage/file-upload.json first
  await processLocalUploads();
  const state = await loadState();
  console.log('Current processed IDs:', Object.keys(state).length);

  let pageToken: string | undefined = undefined;
  do {
    const data = await listFiles(pageToken);
    const files = data.files || [];
    for (const f of files) {
      if (DESTINATION_FOLDER_ID && f.id === DESTINATION_FOLDER_ID) { console.log('Skipping destination folder reference'); continue; }
      try {
        const prev = state[f.id];
        if (prev !== undefined && prev.modifiedTime === f.modifiedTime) {
          console.log(`Skipping unchanged file: ${f.name}`);
          continue;
        }
        console.log(`Downloading: ${f.name} (${f.id})`);
        const out = await downloadFile(f);
        console.log(`Saved -> ${out}`);
        state[f.id] = { id: f.id, modifiedTime: f.modifiedTime };
        await saveState(state);
      } catch (err) {
        console.error(`Error processing ${f.name}:`, (err as Error).message);
      }
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  console.log('Done.');
}

// If executed directly, run immediately. If imported, callers can call `run()`.
if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
