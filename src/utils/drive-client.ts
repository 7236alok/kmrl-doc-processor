import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';

export interface DriveSAConfig {
  serviceAccountKeyPath?: string; // path to JSON key file
  processedFolderId?: string; // destination Drive folder to upload processed files
}

function loadSAConfig(): DriveSAConfig | null {
  const cfgPath = path.join(process.cwd(), 'config', 'drive-sa.json');
  if (!fs.existsSync(cfgPath)) return null;
  try {
    const raw = fs.readFileSync(cfgPath, 'utf8');
    return JSON.parse(raw) as DriveSAConfig;
  } catch (err) {
    console.warn('Failed to read drive-sa.json:', (err as Error).message);
    return null;
  }
}

export async function getDriveClient() {
  const cfg = loadSAConfig();
  // Allow specifying service account credentials via environment variables to avoid storing files
  const envKeyBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64;
  const envKeyJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  let keyObj: any = null;
  if (envKeyJson) {
    try { keyObj = JSON.parse(envKeyJson); } catch (e) { /* ignore */ }
  } else if (envKeyBase64) {
    try { keyObj = JSON.parse(Buffer.from(envKeyBase64, 'base64').toString('utf8')); } catch (e) { /* ignore */ }
  }

  if (!keyObj) {
    if (!cfg || !cfg.serviceAccountKeyPath) return null;
    const keyPath = path.isAbsolute(cfg.serviceAccountKeyPath) ? cfg.serviceAccountKeyPath : path.join(process.cwd(), cfg.serviceAccountKeyPath);
    if (!fs.existsSync(keyPath)) {
      throw new Error(`Service account key file not found at ${keyPath}`);
    }
    const keyRaw = fs.readFileSync(keyPath, 'utf8');
    keyObj = JSON.parse(keyRaw);
  }

  const auth = new google.auth.GoogleAuth({
    credentials: keyObj,
    scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive']
  });
  // Pass the GoogleAuth instance directly to the client constructor (typed correctly)
  const drive = google.drive({ version: 'v3', auth });
  return { drive, config: cfg };
}

export async function uploadFileToFolder(localPath: string, destFolderId: string, name?: string) {
  const client = await getDriveClient();
  if (!client) throw new Error('Drive service-account config not found');
  const drive = (client as any).drive as any;

  const fileName = name || path.basename(localPath);
  const mime = mimeTypeFromExt(path.extname(localPath));

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [destFolderId]
    },
    media: {
      mimeType: mime,
      body: fs.createReadStream(localPath)
    },
    fields: 'id, name'
  });
  return res.data;
}

function mimeTypeFromExt(ext: string) {
  ext = ext.toLowerCase();
  if (ext === '.pdf') return 'application/pdf';
  if (ext === '.docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (ext === '.doc') return 'application/msword';
  if (ext === '.txt') return 'text/plain';
  if (ext === '.csv') return 'text/csv';
  return 'application/octet-stream';
}
