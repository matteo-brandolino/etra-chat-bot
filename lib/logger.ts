/**
 * Conditional logger for production-safe logging
 * In production, only errors are logged to avoid exposing sensitive data
 */

const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  /**
   * Info logs - only in development
   * Use for general information that helps with debugging
   */
  info: (...args: any[]) => {
    if (isDev) {
      console.log('[INFO]', ...args);
    }
  },

  /**
   * Debug logs - only in development
   * Use for detailed debugging information
   */
  debug: (...args: any[]) => {
    if (isDev) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Warning logs - only in development
   * Use for potentially problematic situations
   */
  warn: (...args: any[]) => {
    if (isDev) {
      console.warn('[WARN]', ...args);
    }
  },

  /**
   * Error logs - always logged (production + development)
   * Use for errors that need to be tracked in production
   */
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  },

  /**
   * Success logs - only in development
   * Use for successful operations
   */
  success: (...args: any[]) => {
    if (isDev) {
      console.log('[SUCCESS]', ...args);
    }
  },
};
