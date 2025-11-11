// Utilitário para logs seguros em produção
const isDevelopment = process.env.NODE_ENV === 'development';

export const safeLog = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  error: (...args: any[]) => {
    // Errors são mantidos em produção para monitoramento
    console.error(...args);
  },
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  }
};

// Log condicional para não vazar informações em produção
export const devLog = (message: string, data?: any) => {
  if (isDevelopment) {
    console.log(`🔧 [DEV] ${message}`, data || '');
  }
};

export const prodSafeLog = (message: string, isError = false) => {
  if (isError) {
    console.error(`❌ [ERROR] ${message}`);
  } else if (isDevelopment) {
    console.log(`ℹ️ [INFO] ${message}`);
  }
};
