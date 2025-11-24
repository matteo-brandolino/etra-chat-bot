const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  info: (...args: any[]) => {
    if (isDev) console.log('[INFO]', ...args);
  },
  debug: (...args: any[]) => {
    if (isDev) console.log('[DEBUG]', ...args);
  },
  warn: (...args: any[]) => {
    if (isDev) console.warn('[WARN]', ...args);
  },
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  },
  success: (...args: any[]) => {
    if (isDev) console.log('[SUCCESS]', ...args);
  },
};
