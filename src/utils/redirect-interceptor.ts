/**
 * Interceptador agressivo de redirecionamentos para debug
 */

let interceptorActive = false;
let originalMethods: any = {};

export function activateRedirectInterceptor() {
  if (typeof window === 'undefined' || interceptorActive) return;
  
  console.log('🛡️ [RedirectInterceptor] ATIVANDO interceptação agressiva...');
  
  // 1. Interceptar History API
  originalMethods.pushState = window.history.pushState;
  originalMethods.replaceState = window.history.replaceState;
  
  window.history.pushState = function(state: any, title: string, url?: string | URL | null) {
    console.log('🚨 [RedirectInterceptor] TENTATIVA DE PUSHSTATE:', {
      state,
      title,
      url,
      stack: new Error().stack
    });
    
    if (url && (url.toString().includes('/perfil') || url.toString().includes('/auth'))) {
      console.log('🚫 [RedirectInterceptor] BLOQUEADO pushState para:', url);
      return;
    }
    
    return originalMethods.pushState.apply(this, arguments);
  };
  
  window.history.replaceState = function(state: any, title: string, url?: string | URL | null) {
    console.log('🚨 [RedirectInterceptor] TENTATIVA DE REPLACESTATE:', {
      state,
      title,
      url,
      stack: new Error().stack
    });
    
    if (url && (url.toString().includes('/perfil') || url.toString().includes('/auth'))) {
      console.log('🚫 [RedirectInterceptor] BLOQUEADO replaceState para:', url);
      return;
    }
    
    return originalMethods.replaceState.apply(this, arguments);
  };
  
  // 2. Interceptar window.location
  let locationHref = window.location.href;
  Object.defineProperty(window.location, 'href', {
    get: function() { return locationHref; },
    set: function(url) {
      console.log('🚨 [RedirectInterceptor] TENTATIVA DE LOCATION.HREF:', {
        url,
        stack: new Error().stack
      });
      
      if (url.includes('/perfil') || url.includes('/auth')) {
        console.log('🚫 [RedirectInterceptor] BLOQUEADO location.href para:', url);
        return;
      }
      
      locationHref = url;
      window.location.assign(url);
    }
  });
  
  // 3. Interceptar window.location.assign
  originalMethods.assign = window.location.assign;
  window.location.assign = function(url: string | URL) {
    console.log('🚨 [RedirectInterceptor] TENTATIVA DE LOCATION.ASSIGN:', {
      url,
      stack: new Error().stack
    });
    
    if (url.toString().includes('/perfil') || url.toString().includes('/auth')) {
      console.log('🚫 [RedirectInterceptor] BLOQUEADO location.assign para:', url);
      return;
    }
    
    return originalMethods.assign.call(this, url);
  };
  
  // 4. Interceptar window.location.replace
  originalMethods.replace = window.location.replace;
  window.location.replace = function(url: string | URL) {
    console.log('🚨 [RedirectInterceptor] TENTATIVA DE LOCATION.REPLACE:', {
      url,
      stack: new Error().stack
    });
    
    if (url.toString().includes('/perfil') || url.toString().includes('/auth')) {
      console.log('🚫 [RedirectInterceptor] BLOQUEADO location.replace para:', url);
      return;
    }
    
    return originalMethods.replace.call(this, url);
  };
  
  // 5. Interceptar popstate events
  window.addEventListener('popstate', function(event) {
    console.log('🚨 [RedirectInterceptor] POPSTATE EVENT:', {
      state: event.state,
      url: window.location.href,
      stack: new Error().stack
    });
  });
  
  // 6. Interceptar beforeunload
  window.addEventListener('beforeunload', function(event) {
    console.log('🚨 [RedirectInterceptor] BEFORE UNLOAD:', {
      url: window.location.href
    });
  });
  
  interceptorActive = true;
  console.log('✅ [RedirectInterceptor] Interceptação ativa!');
}

export function deactivateRedirectInterceptor() {
  if (typeof window === 'undefined' || !interceptorActive) return;
  
  console.log('🔓 [RedirectInterceptor] DESATIVANDO interceptação...');
  
  // Restaurar métodos originais
  if (originalMethods.pushState) {
    window.history.pushState = originalMethods.pushState;
  }
  if (originalMethods.replaceState) {
    window.history.replaceState = originalMethods.replaceState;
  }
  if (originalMethods.assign) {
    window.location.assign = originalMethods.assign;
  }
  if (originalMethods.replace) {
    window.location.replace = originalMethods.replace;
  }
  
  interceptorActive = false;
  console.log('✅ [RedirectInterceptor] Interceptação desativada!');
}

export function isInterceptorActive(): boolean {
  return interceptorActive;
}

// Ativar automaticamente em desenvolvimento
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Aguardar um pouco para não interferir com inicialização
  setTimeout(() => {
    if (window.location.pathname.includes('/galeria-assinantes')) {
      activateRedirectInterceptor();
    }
  }, 100);
}
