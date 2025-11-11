import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('Google credentials not configured');
      // Return HTML page that posts error message and closes
      const html = `
        <!DOCTYPE html>
        <html>
        <head><title>Erro de Configuração</title></head>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                success: false,
                error: 'google_config_error',
                message: 'Google credentials not configured',
                platform: 'google'
              }, window.location.origin);
              window.close();
            }
          </script>
          <p>Google credentials not configured. This window will close automatically.</p>
        </body>
        </html>
      `;
      return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

        // Prefer an explicit GOOGLE_CALLBACK_URL, otherwise derive from public base
        const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin).toString();
        const callbackUrl = process.env.GOOGLE_CALLBACK_URL || new URL('/api/admin/google/callback', base).toString();    // Generate state for CSRF protection
    const state = Math.random().toString(36).substring(7);

    // Google OAuth URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', callbackUrl);
    authUrl.searchParams.set('scope', 'openid email profile https://www.googleapis.com/auth/youtube.readonly');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    const response = NextResponse.redirect(authUrl.toString());
    response.cookies.set('google_state', state, { httpOnly: true, path: '/', maxAge: 60 * 15 });

    return response;
  } catch (error) {
    console.error('Error generating Google auth link:', error, {
      GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
      origin: req.nextUrl.origin,
    });
    // Return HTML page that posts error message and closes
    const html = `
      <!DOCTYPE html>
      <html>
      <head><title>Erro</title></head>
      <body>
        <script>
          if (window.opener) {
            window.opener.postMessage({
              success: false,
              error: 'google_server_error',
              message: 'Failed to connect with Google',
              platform: 'google'
            }, window.location.origin);
            window.close();
          }
        </script>
        <p>Failed to connect with Google. This window will close automatically.</p>
      </body>
      </html>
    `;
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' },
    });
  }
}