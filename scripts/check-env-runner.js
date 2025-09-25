// Small runner that registers ts-node and loads the TS module in CommonJS
require('ts-node').register({});
const config = require('../config/env');
console.log('Dotenv loaded:', config.config ? config.config.dotenvLoaded : config.dotenvLoaded);
console.log('PORT:', config.config ? config.config.port : config.port);
console.log('DB_PATH:', config.config ? config.config.dbPath : config.dbPath);
console.log('OPENAI_API_KEY:', (config.config ? config.config.openaiApiKey : config.openaiApiKey) ? 'SET' : 'NOT SET');
