
import { NextRequest, NextResponse } from 'next/server';
import { paypalConfig, getPaypalAuthorizeBase } from '@/lib/paypal-config';

export async function GET(req: NextRequest) {
  try {
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

    if (!clientId) {
      console.error('PayPal client ID not configured');
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
                error: 'paypal_config_error',
                message: 'PayPal client ID not configured',
                platform: 'paypal'
              }, window.location.origin);
              window.close();
            }
          </script>
          <p>PayPal client ID not configured. This window will close automatically.</p>
        </body>
        </html>
      `;
      return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

        // Prefer an explicit PAYPAL_CALLBACK_URL, otherwise derive from public base
        const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin).toString();
        const callbackUrl = process.env.PAYPAL_CALLBACK_URL || new URL('/api/admin/paypal/callback', base).toString();    // Generate state for CSRF protection
    const state = Math.random().toString(36).substring(7);

    // PayPal OAuth URL (sandbox or live)
    const authBase = getPaypalAuthorizeBase();
    const authUrl = new URL('/connect', authBase);
    authUrl.searchParams.set('flowEntry', 'static');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'https://uri.paypal.com/services/payments/realtimepayment https://uri.paypal.com/services/reporting/search/read https://uri.paypal.com/services/payments/payment/authcapture https://uri.paypal.com/services/payments/refund https://uri.paypal.com/services/customer/merchant-integrations/read');
    authUrl.searchParams.set('redirect_uri', callbackUrl);
    authUrl.searchParams.set('state', state);

    const response = NextResponse.redirect(authUrl.toString());
    response.cookies.set('paypal_state', state, { httpOnly: true, path: '/', maxAge: 60 * 15 });

    return response;
  } catch (error) {
    console.error('Error generating PayPal auth link:', error, {
      NEXT_PUBLIC_PAYPAL_CLIENT_ID: !!process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID,
      PAYPAL_CALLBACK_URL: process.env.PAYPAL_CALLBACK_URL,
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
              error: 'paypal_server_error',
              message: 'Failed to connect with PayPal',
              platform: 'paypal'
            }, window.location.origin);
            window.close();
          }
        </script>
        <p>Failed to connect with PayPal. This window will close automatically.</p>
      </body>
      </html>
    `;
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' },
    });
  }
}
