// Test configuration
import config from './src/config.js';

console.log('Environment:', import.meta.env.MODE);
console.log('Is Production:', import.meta.env.PROD);
console.log('API Base:', config.apiBase);
console.log('Is Production (config):', config.isProduction);
console.log('Asset Path Test:', config.getAssetPath('static/test.svg'));