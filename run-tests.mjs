import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

// Use Node's register to hook ts-node/esm as an ESM loader
register('ts-node/esm', pathToFileURL('./'));

// Run tests
try {
	await import('./src/tests/ocr.test.ts');
} catch (e) {
	console.error('Test runner failed:', e);
	process.exit(1);
}
