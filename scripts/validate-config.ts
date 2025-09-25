import ENV from '../src/config/env.js';
import logger from '../src/config/logger.js';
import MODEL_CONFIG from '../src/config/model-config.js';

logger.info('Validating config');
console.log('ENV:', ENV);
console.log('MODEL_CONFIG:', MODEL_CONFIG);
