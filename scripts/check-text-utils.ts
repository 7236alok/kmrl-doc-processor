import { cleanText, detectLanguage, initLangDetect } from '../utils/text-utils.js';

const sample = `This is   a test.\n\nनमस्ते दुनिया!`;
console.log('cleaned:', cleanText(sample));

(async () => {
	await initLangDetect();
	const lang = await detectLanguage(sample);
	console.log('lang:', lang);
})();
