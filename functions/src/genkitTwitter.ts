import express, { Request, Response } from 'express';
import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';

// Resolve the public base URL where the Next.js app is served
function getPublicBaseUrl(req: Request): string {
    // Prefer explicit public base url variables when provided
    const envUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL;
    if (envUrl) return envUrl;

    // Best-effort fallback using the incoming host header
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
    if (host) return `${proto}://${host}`;

    // Final local fallback
    return 'http://localhost:3000';
}

const app = express();

// Health check
app.get('/genkit/twitter/health', (_req: Request, res: Response) => {
    res.json({ ok: true, service: 'genkit-twitter', time: new Date().toISOString() });
});

// Orchestrate: start Twitter OAuth login by redirecting to Next.js route
app.get('/genkit/twitter/login', (req: Request, res: Response) => {
    const base = getPublicBaseUrl(req);
    const target = new URL('/api/auth/twitter-login', base).toString();
    logger.info('Redirecting to Twitter login', { target });
    res.redirect(302, target);
});

// Orchestrate: callback passthrough to Next.js route (preserve query string)
app.get('/genkit/twitter/callback', (req: Request, res: Response) => {
    const base = getPublicBaseUrl(req);
    const target = `${new URL('/api/auth/twitter-callback', base).toString()}${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`;
    logger.info('Redirecting to Twitter callback', { target });
    res.redirect(302, target);
});

// Orchestrate: logout by posting to Next.js route
app.post('/genkit/twitter/logout', async (req: Request, res: Response) => {
    try {
        const base = getPublicBaseUrl(req);
        const target = new URL('/api/auth/twitter-logout', base).toString();
        logger.info('Proxying logout to Next route', { target });

        const fetchRes = await fetch(target, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
        const text = await fetchRes.text();
        res.status(fetchRes.status).send(text);
    } catch (e: any) {
        logger.error('Logout proxy failed', { error: e?.message });
        res.status(500).json({ success: false, error: 'Logout proxy failed' });
    }
});

// Convenience passthroughs for photos/videos media APIs (already implemented in Next app)
app.get('/genkit/twitter/media/photos', (req: Request, res: Response) => {
    const base = getPublicBaseUrl(req);
    const qs = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    const target = `${new URL('/api/twitter/fotos', base).toString()}${qs}`;
    logger.info('Redirecting to photos API', { target });
    res.redirect(302, target);
});

app.get('/genkit/twitter/media/videos', (req: Request, res: Response) => {
    const base = getPublicBaseUrl(req);
    const qs = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    const target = `${new URL('/api/twitter/videos', base).toString()}${qs}`;
    logger.info('Redirecting to videos API', { target });
    res.redirect(302, target);
});

// Export the HTTPS function
export const genkitTwitter = onRequest({ cors: true }, app);
