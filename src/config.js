// Configuration for different environments
const isProduction = import.meta.env.PROD || import.meta.env.MODE === 'production';

const config = {
  // Static assets base path - relative to current location
  staticBase: 'static',

  // Environment detection
  isDevelopment: import.meta.env.DEV,
  isProduction: isProduction,

  // Build time configuration
  buildTime: new Date().toISOString(),

  // Get the current base path for assets
  getAssetPath: (path) => {
    // Remove 'static/' prefix since Vite serves static assets from root
    const cleanPath = path.replace('static/', '');

    // In production (subfolder), we need to use relative paths
    // In development, absolute paths work fine
    if (isProduction) {
      return `./${cleanPath}`;
    }
    return `/${cleanPath}`;
  }
};

export default config;