// A simple logger to silence console.error in production

const isProd = import.meta.env.PROD;

export const logger = {
  log: (...args) => {
    if (!isProd) {
      console.log(...args);
    }
  },
  warn: (...args) => {
    if (!isProd) {
      console.warn(...args);
    }
  },
  error: (...args) => {
    if (!isProd) {
      console.error(...args);
    } else {
      // In production, we might want to send this to a service like Sentry
      // For now, we just silence it to avoid leaking sensitive data to the user's console
    }
  },
  info: (...args) => {
    if (!isProd) {
      console.info(...args);
    }
  }
};
