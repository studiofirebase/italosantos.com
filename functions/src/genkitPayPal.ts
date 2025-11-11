import express, { Request, Response } from 'express';
import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import admin from 'firebase-admin';

if (!admin.apps.length) {
    admin.initializeApp();
}

function getPublicBaseUrl(req: Request): string {
    const envUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL;
    if (envUrl) return envUrl;
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
    if (host) return `${proto}://${host}`;
    return 'http://localhost:3000';
}

function getPaypalApiBase(): string {
    const mode = (process.env.NEXT_PUBLIC_PAYPAL_MODE || process.env.PAYPAL_MODE || (process.env.NODE_ENV === 'production' ? 'live' : 'sandbox')) as 'live' | 'sandbox';
    return mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
}

const app = express();

// Health
app.get('/genkit/paypal/health', (_req: Request, res: Response) => {
    res.json({ ok: true, service: 'genkit-paypal', time: new Date().toISOString() });
});

// Start OAuth by delegating to Next.js route (rely on its CSRF state & redirect logic)
app.get('/genkit/paypal/connect', (req: Request, res: Response) => {
    const base = getPublicBaseUrl(req);
    const target = new URL('/api/admin/paypal/connect', base).toString();
    logger.info('Redirecting to PayPal connect', { target });
    res.redirect(302, target);
});

// Callback passthrough to Next.js route (so UI toasts/messages work consistently)
app.get('/genkit/paypal/callback', (req: Request, res: Response) => {
    const base = getPublicBaseUrl(req);
    const target = `${new URL('/api/admin/paypal/callback', base).toString()}${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`;
    logger.info('Redirecting to PayPal callback', { target });
    res.redirect(302, target);
});

// Refresh access token using stored refresh_token in RTDB under admin/integrations/paypal
app.post('/genkit/paypal/refresh', async (_req: Request, res: Response) => {
    try {
        const db = admin.database();
        const ref = db.ref('admin/integrations/paypal');
        const snap = await ref.get();
        if (!snap.exists()) {
            return res.status(404).json({ success: false, error: 'paypal_integration_not_found' });
        }
        const data = snap.val() as any;
        const refreshToken = data.refresh_token || data.refreshToken;
        if (!refreshToken) {
            return res.status(400).json({ success: false, error: 'missing_refresh_token' });
        }

        const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
        const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
            return res.status(500).json({ success: false, error: 'paypal_config_error' });
        }

        const tokenUrl = `${getPaypalApiBase()}/v1/oauth2/token`;
        const params = new URLSearchParams();
        params.append('grant_type', 'refresh_token');
        params.append('refresh_token', refreshToken);

        const resp = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
            },
            body: params,
        });

        const json = await resp.json();
        if (!resp.ok || json.error) {
            logger.error('PayPal refresh failed', { status: resp.status, json });
            return res.status(500).json({ success: false, error: 'paypal_refresh_failed', details: json });
        }

        const { access_token, expires_in } = json;
        await ref.update({ access_token, expires_in, refreshed_at: new Date().toISOString() });

        return res.json({ success: true, access_token, expires_in });
    } catch (e: any) {
        logger.error('PayPal refresh error', { error: e?.message });
        return res.status(500).json({ success: false, error: 'server_error' });
    }
});

export const genkitPayPal = onRequest({ cors: true }, app);
