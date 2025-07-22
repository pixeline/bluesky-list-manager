// Configuration for different environments
const isProduction = import.meta.env.PROD || import.meta.env.MODE === 'production';

const config = {
  // API base path - works for both local development and production subfolder
  apiBase: isProduction ? './api' : '/api',

  // Static assets base path - relative to current location
  staticBase: 'static',

  // Environment detection
  isDevelopment: import.meta.env.DEV,
  isProduction: isProduction,

  // Build time configuration
  buildTime: new Date().toISOString(),

  // Get the current base path for assets
  getAssetPath: (path) => {
    // In production (subfolder), we need to use relative paths
    // In development, absolute paths work fine
    if (isProduction) {
      return `./${path}`;
    }
    return `/${path}`;
  }
};

export default config;