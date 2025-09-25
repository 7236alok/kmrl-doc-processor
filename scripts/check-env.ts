import config from '../config/env.js';

console.log('Dotenv loaded:', config.dotenvLoaded);
console.log('PORT:', config.port);
console.log('DB_PATH:', config.dbPath);
console.log('OPENAI_API_KEY:', config.openaiApiKey ? 'SET' : 'NOT SET');
