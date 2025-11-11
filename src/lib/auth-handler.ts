// Utility to compute the Firebase auth handler fallback URL
export function getFirebaseAuthHandlerUrl(serverOrigin?: string) {
  // Prefer explicit public base URL injected at build/runtime
  const publicBase = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (publicBase) return `${publicBase.replace(/\/$/, '')}/__/auth/handler`;

  // If called from a server route where origin is known, use it
  if (serverOrigin) return `${serverOrigin.replace(/\/$/, '')}/__/auth/handler`;

  // Fallback for client runtime (window.location.origin will be used by callers)
  return '/__/auth/handler';
}

export default getFirebaseAuthHandlerUrl;
