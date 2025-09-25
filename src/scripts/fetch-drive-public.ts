import fs from 'fs-extra';
import path from 'path';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { getDriveClient } from '../utils/drive-client.js';
import { Readable, pipeline } from 'stream';
import { promisify } from 'util';

const pipelineAsync = promisify(pipeline);

dotenv.config();

// CLI flags / env toggles
const DRY_RUN = process.argv.includes('--dry-run') || process.env.DRIVE_FETCH_DRY === '1';
const SKIP_UPLOAD = process.argv.includes('--skip-upload') || process.env.DRIVE_FETCH_SKIP_UPLOAD === '1';
const SKIP_DELETE = process.argv.includes('--skip-delete') || process.env.DRIVE_FETCH_SKIP_DELETE === '1';

if (DRY_RUN) console.log('[drive-public] Running in dry-run mode: uploads/deletes/state updates will be skipped');
// --- Constants / Configuration -------------------------------------------------
const CONFIG_PATH = path.join(process.cwd(), 'config', 'drive-public.json');
const OUT_DIR = path.join(process.cwd(), 'storage', 'documents', 'not-processed');
const STATE_FILE = path.join(process.cwd(), 'storage', '.drive-public-sync.json');
const DEBUG = process.env.DRIVE_FETCH_DEBUG === '1';
// Local upload manifest path
const LOCAL_UPLOAD_MANIFEST = path.join(process.cwd(), 'storage', 'file-upload.json');

// Folder IDs (provided by user)
const SOURCE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '1TBQENMDd2SndtXeQu810MhJRggGSMsjk';
const DESTINATION_FOLDER_ID = process.env.GOOGLE_DRIVE_DEST_FOLDER_ID || '1y9x3fbkZS5leVQ5H_bQdSYtgBFFybOox';

// API Key
let API_KEY = process.env.GOOGLE_DRIVE_API_KEY as string | undefined;
try {
  if (fs.existsSync(CONFIG_PATH)) {
    const cfgRaw = await fs.readFile(CONFIG_PATH, 'utf8');
    const cfg = JSON.parse(cfgRaw);
    API_KEY = cfg.GOOGLE_DRIVE_API_KEY || API_KEY;
  }
} catch (e) {
  console.warn('[drive-public] Failed reading config/drive-public.json:', (e as Error).message);
}

if (!API_KEY || !SOURCE_FOLDER_ID) {
  console.error('[drive-public] Missing API key or source folder id.');
  process.exit(1);
}

// --- Helpers -------------------------------------------------------------------
function sanitizeFileName(name: string) {
  return name.replace(/[\\/:*?"<>|\r\n\t]+/g, '_').trim();
}

async function ensureOutDir() { await fs.ensureDir(OUT_DIR); }

// --- Local upload manifest support ------------------------------------------------
type LocalUploadItem = {
  // Absolute or relative path on disk
  path: string;
  // Optional destination name when uploading to Drive (and used for local copy base if provided)
  name?: string;
  // If true, move (rename) instead of copy into OUT_DIR
  move?: boolean;
};

async function loadLocalUploadManifest(): Promise<LocalUploadItem[] | null> {
  try {
    if (!(await fs.pathExists(LOCAL_UPLOAD_MANIFEST))) return null;
    const raw = await fs.readFile(LOCAL_UPLOAD_MANIFEST, 'utf8');
    const json = JSON.parse(raw);
    const items: unknown = Array.isArray(json) ? json : json?.files;
    if (!Array.isArray(items)) {
      console.warn('[drive-public] file-upload.json found but not an array or { files: [...] }');
      return null;
    }
    const uploads: LocalUploadItem[] = items
      .filter((x: any) => x && typeof x.path === 'string')
      .map((x: any) => ({ path: x.path, name: x.name, move: Boolean(x.move) }));
    return uploads.length ? uploads : null;
  } catch (e) {
    console.warn('[drive-public] Failed reading storage/file-upload.json:', (e as Error).message);
    return null;
  }
}

async function placeIntoOutDir(item: LocalUploadItem): Promise<{ outPath: string; finalName: string }> {
  const srcPath = path.isAbsolute(item.path) ? item.path : path.resolve(process.cwd(), item.path);
  const exists = await fs.pathExists(srcPath);
  if (!exists) throw new Error(`Source file not found: ${srcPath}`);

  const requestedName = item.name ? sanitizeFileName(item.name) : sanitizeFileName(path.basename(srcPath));
  const srcExt = path.extname(srcPath);
  const hasExt = path.extname(requestedName) !== '';
  const baseWithExt = hasExt ? requestedName : requestedName + srcExt;

  let finalName = baseWithExt;
  let destPath = path.join(OUT_DIR, finalName);
  let counter = 1;
  while (await fs.pathExists(destPath)) {
    const ext = path.extname(baseWithExt);
    const stem = baseWithExt.slice(0, baseWithExt.length - ext.length);
    finalName = `${stem} (${counter})${ext}`;
    destPath = path.join(OUT_DIR, finalName);
    counter++;
  }

  if (item.move) await fs.move(srcPath, destPath, { overwrite: false });
  else await fs.copy(srcPath, destPath, { overwrite: false, errorOnExist: true });

  return { outPath: destPath, finalName };
}

async function uploadLocalToDestination(localPath: string, destName: string) {
  try {
    if (DRY_RUN || SKIP_UPLOAD) {
      if (DRY_RUN) console.log('[drive-public] Dry-run: skipping upload for local', destName);
      else console.log('[drive-public] skip-upload enabled; skipping upload for local', destName);
      return;
    }
    const client = await getDriveClient();
    if (!client || !(client as any).drive) {
      if (DEBUG) console.log('[drive-public] SA not configured; skip local upload');
      return;
    }
    const drive = (client as any).drive as any;
    const res = await drive.files.create({
      requestBody: { name: destName, parents: [DESTINATION_FOLDER_ID] },
      media: { mimeType: 'application/octet-stream', body: fs.createReadStream(localPath) },
      fields: 'id,name'
    });
    console.log('[drive-public] Uploaded local ->', res.data.id, res.data.name);
  } catch (e) {
    console.warn('[drive-public] uploadLocalToDestination failed:', (e as Error).message);
  }
}

async function loadState(): Promise<Record<string, { id: string; modifiedTime?: string }>> {
  try { return JSON.parse(await fs.readFile(STATE_FILE, 'utf8')); } catch { return {}; }
}
async function saveState(state: Record<string, { id: string; modifiedTime?: string }>) {
  await fs.ensureDir(path.dirname(STATE_FILE));
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
}

async function listFiles(pageToken?: string) {
  const params = new URLSearchParams({
    q: `'${SOURCE_FOLDER_ID}' in parents and trashed = false`,
    fields: 'nextPageToken, files(id,name,mimeType,modifiedTime,size)',
    pageSize: '100'
  });
  if (pageToken) params.set('pageToken', pageToken);
  if (API_KEY) params.set('key', API_KEY);
  const url = `https://www.googleapis.com/drive/v3/files?${params.toString()}`;
  if (DEBUG) console.log('[drive-public] Listing URL:', url.replace(API_KEY!, '***'));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`listFiles failed: ${res.status} ${res.statusText}`);
  return res.json() as Promise<{ nextPageToken?: string; files?: any[] }>;
}

async function downloadFile(file: { id: string; name: string; mimeType: string }) {
  const safeName = sanitizeFileName(file.name || file.id);
  const exportDoc = file.mimeType?.startsWith('application/vnd.google-apps');
  if (exportDoc) {
    const exportMime = file.mimeType === 'application/vnd.google-apps.spreadsheet' ? 'text/csv' : 'text/plain';
    const url = `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=${encodeURIComponent(exportMime)}&key=${API_KEY}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`export failed ${r.status}`);
    const ext = exportMime === 'text/csv' ? '.csv' : '.txt';
    const outPath = path.join(OUT_DIR, safeName + ext);
    await fs.writeFile(outPath, Buffer.from(await r.arrayBuffer()));
    return outPath;
  }
  const url = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${API_KEY}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`download failed ${r.status}`);
  const ctype = r.headers.get('content-type') || '';
  let ext = path.extname(safeName);
  if (!ext) {
    if (ctype.includes('pdf')) ext = '.pdf';
    else if (ctype.includes('msword') || ctype.includes('officedocument')) ext = '.docx';
    else if (ctype.includes('text')) ext = '.txt';
  }
  const finalBase = ext && safeName.toLowerCase().endsWith(ext.toLowerCase()) ? safeName : safeName + ext;
  const outPath = path.join(OUT_DIR, finalBase);
  const stream = fs.createWriteStream(outPath);
  const body: any = (r as any).body;
  if (!body) {
    // No streaming body available — fall back to arrayBuffer
    await fs.writeFile(outPath, Buffer.from(await r.arrayBuffer()));
  } else if (typeof body.pipe === 'function') {
    // Classic Node stream (e.g., node-fetch)
    await new Promise<void>((resolve, reject) => { body.pipe(stream); body.on('error', reject); stream.on('finish', resolve); });
  } else if (typeof Readable.fromWeb === 'function') {
    // Node's global fetch returns a Web ReadableStream — convert to Node stream
    const nodeStream = Readable.fromWeb(body as any);
    await pipelineAsync(nodeStream as any, stream);
  } else {
    // Final fallback: read whole body into memory
    await fs.writeFile(outPath, Buffer.from(await r.arrayBuffer()));
  }
  try { const sz = (await fs.stat(outPath)).size; if (DEBUG) console.log('[drive-public] Downloaded size', sz, 'bytes'); } catch {}
  return outPath;
}

async function uploadAndDelete(originalId: string, localPath: string, origName: string) {
  try {
    if (DRY_RUN || SKIP_UPLOAD) {
      if (DRY_RUN) console.log('[drive-public] Dry-run: skipping upload for', origName);
      else console.log('[drive-public] skip-upload enabled; skipping upload for', origName);
      return;
    }
    const client = await getDriveClient();
    if (!client || !(client as any).drive) {
      if (DEBUG) console.log('[drive-public] SA not configured; skip upload/delete');
      return;
    }
    const drive = (client as any).drive as any;
    const res = await drive.files.create({
      requestBody: { name: origName, parents: [DESTINATION_FOLDER_ID] },
      media: { mimeType: 'application/octet-stream', body: fs.createReadStream(localPath) },
      fields: 'id,name'
    });
    console.log('[drive-public] Uploaded ->', res.data.id, res.data.name);
    try {
      if (DRY_RUN || SKIP_DELETE) {
        if (DRY_RUN) console.log('[drive-public] Dry-run: skipping delete for', originalId);
        else console.log('[drive-public] skip-delete enabled; skipping delete for', originalId);
      } else {
        await drive.files.delete({ fileId: originalId });
        console.log('[drive-public] Deleted source file', originalId);
      }
    } catch (e) { console.warn('[drive-public] Delete failed:', (e as Error).message); }
  } catch (e) { console.warn('[drive-public] uploadAndDelete failed:', (e as Error).message); }
}

export async function run() {
  await ensureOutDir();
  // First, process any local uploads specified in storage/file-upload.json
  const localItems = await loadLocalUploadManifest();
  if (localItems && localItems.length) {
    console.log(`[drive-public] Processing ${localItems.length} local upload item(s) from storage/file-upload.json ...`);
    for (const item of localItems) {
      try {
        const { outPath, finalName } = await placeIntoOutDir(item);
        console.log('[drive-public] Local saved ->', outPath);
        // Also upload to destination folder via SA (if configured)
        await uploadLocalToDestination(outPath, finalName);
      } catch (e) {
        console.error('[drive-public] Local upload error for', item.path, (e as Error).message);
      }
    }
  }
  const state = await loadState();
  let pageToken: string | undefined;
  do {
    const data = await listFiles(pageToken);
    const files = data.files || [];
    for (const f of files) {
      if (f.id === DESTINATION_FOLDER_ID) { if (DEBUG) console.log('[drive-public] Skipping destination folder reference'); continue; }
      try {
        const prev = state[f.id];
        if (prev && prev.modifiedTime === f.modifiedTime) { if (DEBUG) console.log('Skip unchanged', f.name); continue; }
        console.log('[drive-public] Downloading', f.name, f.id);
        const out = await downloadFile(f);
        console.log('[drive-public] Saved', out);
        if (DRY_RUN) {
          console.log('[drive-public] Dry-run: skipping upload/delete and state update for', f.name);
        } else {
          await uploadAndDelete(f.id, out, f.name);
          state[f.id] = { id: f.id, modifiedTime: f.modifiedTime };
          await saveState(state);
        }
      } catch (e) {
        console.error('[drive-public] File error', f.name, (e as Error).message);
      }
    }
    pageToken = data.nextPageToken;
  } while (pageToken);
  console.log('[drive-public] Done.');
}

if (import.meta.url === `file://${process.argv[1]}` || /fetch-drive-public(\.ts|\.js)$/.test(process.argv[1] || '')) {
  run().catch(e => { console.error('[drive-public] Fatal', (e as Error).message); process.exit(1); });
}
