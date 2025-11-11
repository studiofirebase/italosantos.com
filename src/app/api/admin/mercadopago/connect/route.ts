import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const clientId = process.env.MERCADOPAGO_CLIENT_ID;

    if (!clientId) {
      console.error('MercadoPago client ID not configured');
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
                error: 'mercadopago_config_error',
                message: 'MercadoPago client ID not configured',
                platform: 'mercadopago'
              }, window.location.origin);
              window.close();
            }
          </script>
          <p>MercadoPago client ID not configured. This window will close automatically.</p>
        </body>
        </html>
      `;
      return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

        // Prefer an explicit MERCADOPAGO_CALLBACK_URL, otherwise derive from public base
        const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin).toString();
        const callbackUrl = process.env.MERCADOPAGO_CALLBACK_URL || new URL('/api/admin/mercadopago/callback', base).toString();    // Generate state for CSRF protection
    const state = Math.random().toString(36).substring(7);

    // MercadoPago OAuth URL
    const authUrl = new URL('https://auth.mercadopago.com.br/authorization');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('platform_id', 'mp');
    authUrl.searchParams.set('redirect_uri', callbackUrl);
    authUrl.searchParams.set('state', state);

    const response = NextResponse.redirect(authUrl.toString());
    response.cookies.set('mercadopago_state', state, { httpOnly: true, path: '/', maxAge: 60 * 15 });

    return response;
  } catch (error) {
    console.error('Error generating MercadoPago auth link:', error, {
      MERCADOPAGO_CLIENT_ID: !!process.env.MERCADOPAGO_CLIENT_ID,
      MERCADOPAGO_CALLBACK_URL: process.env.MERCADOPAGO_CALLBACK_URL,
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
              error: 'mercadopago_server_error',
              message: 'Failed to connect with MercadoPago',
              platform: 'mercadopago'
            }, window.location.origin);
            window.close();
          }
        </script>
        <p>Failed to connect with MercadoPago. This window will close automatically.</p>
      </body>
      </html>
    `;
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' },
    });
  }
}