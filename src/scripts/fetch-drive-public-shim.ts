// Shim to expose run() from the root scripts version so compiled dist/src can import it.
// This keeps the authoritative implementation in src/scripts/fetch-drive-public.ts.
export { run } from './fetch-drive-public.js';