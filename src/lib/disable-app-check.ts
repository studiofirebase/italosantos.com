// Disable Firebase App Check globally
// This file should be imported at the very beginning of the app



// Set debug token in multiple locations to ensure it's set
const setDebugToken = () => {
  if (typeof window !== 'undefined') {
    (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    
    if (typeof self !== 'undefined') {
      (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }
    
    // Set in global scope as well
    if (typeof globalThis !== 'undefined') {
      (globalThis as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }
    
    try {
      localStorage.setItem('FIREBASE_APPCHECK_DEBUG_TOKEN', 'true');
      sessionStorage.setItem('FIREBASE_APPCHECK_DEBUG_TOKEN', 'true');
    } catch (e) {
      // Ignore storage errors
    }
    

  }
};

// Set immediately
setDebugToken();

// Set on DOMContentLoaded as well
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setDebugToken);
  } else {
    setDebugToken();
  }
}

export default setDebugToken;
