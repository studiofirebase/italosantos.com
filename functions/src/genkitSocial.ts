import express, { Request, Response } from 'express';
import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';

function getPublicBaseUrl(req: Request): string {
    const envUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL;
    if (envUrl) return envUrl;
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
    if (host) return `${proto}://${host}`;
    return 'http://localhost:3000';
}

const app = express();

app.get('/genkit/social/health', (_req: Request, res: Response) => {
    res.json({ ok: true, service: 'genkit-social', time: new Date().toISOString() });
});

// Generic passthroughs to Next.js admin connect routes
app.get('/genkit/facebook/connect', (req: Request, res: Response) => {
    const base = getPublicBaseUrl(req);
    const target = new URL('/api/admin/facebook/connect', base).toString();
    logger.info('Redirecting to Facebook connect', { target });
    res.redirect(302, target);
});

app.get('/genkit/instagram/connect', (req: Request, res: Response) => {
    const base = getPublicBaseUrl(req);
    const target = new URL('/api/admin/instagram/connect', base).toString();
    logger.info('Redirecting to Instagram connect', { target });
    res.redirect(302, target);
});

app.get('/genkit/mercadopago/connect', (req: Request, res: Response) => {
    const base = getPublicBaseUrl(req);
    const target = new URL('/api/admin/mercadopago/connect', base).toString();
    logger.info('Redirecting to MercadoPago connect', { target });
    res.redirect(302, target);
});

export const genkitSocial = onRequest({ cors: true }, app);
