import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findProjectRoot(startDir: string): string {
  let dir = startDir;
  while (true) {
    const pkgPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgPath)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(__dirname, '../../..');
}

const projectRoot = findProjectRoot(__dirname);

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function removeMockModule() {
  try { fs.rmSync(path.resolve(projectRoot, 'node_modules', '@xenova'), { recursive: true, force: true }); } catch {}
}

// No longer manipulating node_modules; we use env hook in summarizer instead

function getArg(name: string, fallback?: string) {
  const prefix = `--${name}=`;
  const arg = process.argv.find(a => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : fallback;
}

async function main() {
  const mode = getArg('mode', 'error');
  const lang = getArg('lang', 'en');
  const text = getArg('text', 'This is a test document for KMRL summarization.');

  // dynamic import after environment setup
  process.env.SUMMARIZER_TEST_MODE = (mode === 'mock') ? 'mock' : '';

  const sumCfgUrl = pathToFileURL(path.resolve(projectRoot, 'src/config/summary.ts')).href;
  const { SUMMARY_CONFIG } = await import(sumCfgUrl);

  if (mode === 'mock') {
    SUMMARY_CONFIG.defaultModel = 'Mock/Model' as any;
    SUMMARY_CONFIG.modelId = 'Mock/Model' as any;
    (SUMMARY_CONFIG.langModels as any).en = 'Mock/Model';
  } else {
    const bad = 'NonExistent/Model-X';
    SUMMARY_CONFIG.defaultModel = bad as any;
    SUMMARY_CONFIG.modelId = bad as any;
    (SUMMARY_CONFIG.langModels as any).en = bad as any;
  }

  const sumUrl = pathToFileURL(path.resolve(projectRoot, 'src/modules/summarization/index.ts')).href;
  const { summarizeText } = await import(sumUrl);
  try {
    const res = await summarizeText(text, lang);
    console.log(JSON.stringify({ method: res.method, summary: res.summary }));
  } catch (e) {
    if (mode === 'mock') throw e;
    console.log(JSON.stringify({ error: String((e as Error)?.message || e) }));
  }
}

main().catch(err => { console.error(err); process.exit(1); });
