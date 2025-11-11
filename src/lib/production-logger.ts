/**
 * Script para remover logs de debug em produção
 * Este script deve ser executado antes do build de produção
 */

// Wrapper seguro para logs que não devem aparecer em produção
export const productionSafeLog = {
  // Apenas logs críticos de erro são mantidos
  error: (message: string, error?: any) => {
    console.error(`❌ [ERROR] ${message}`, error || '');
  },
  
  // Logs de informação apenas em desenvolvimento
  info: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`ℹ️ [INFO] ${message}`, data || '');
    }
  },
  
  // Debug apenas em desenvolvimento
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔧 [DEBUG] ${message}`, data || '');
    }
  },
  
  // Avisos apenas em desenvolvimento
  warn: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`⚠️ [WARN] ${message}`, data || '');
    }
  }
};

// Função para log condicional baseado no ambiente
export const conditionalLog = (level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any) => {
  switch (level) {
    case 'error':
      productionSafeLog.error(message, data);
      break;
    case 'warn':
      productionSafeLog.warn(message, data);
      break;
    case 'info':
      productionSafeLog.info(message, data);
      break;
    case 'debug':
      productionSafeLog.debug(message, data);
      break;
  }
};
