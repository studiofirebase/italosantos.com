/**
 * PayPal API: Get Client Token
 * GET /api/paypal/auth/client-token
 * Returns browser-safe client token for SDK v6 initialization
 */

import { NextRequest, NextResponse } from 'next/server';

const PAYPAL_API_BASE = process.env.NODE_ENV === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

const PAYPAL_CLIENT_ID = process.env.PAYPAL_SANDBOX_CLIENT_ID || process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_SANDBOX_CLIENT_SECRET || process.env.PAYPAL_CLIENT_SECRET;

// Cache token for performance (expires in 9 hours)
let cachedToken: { token: string; expiresAt: number } | null = null;

export async function GET(req: NextRequest) {
    try {
        console.log('[PayPal Client Token] Request received');

        // Validate credentials
        if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
            console.error('[PayPal Client Token] Missing credentials');
            return NextResponse.json(
                { error: 'PayPal credentials not configured' },
                { status: 500 }
            );
        }

        // Check if cached token is still valid (with 1-hour buffer)
        const now = Date.now();
        if (cachedToken && cachedToken.expiresAt > now + 3600000) {
            console.log('[PayPal Client Token] Returning cached token');
            return NextResponse.json({ clientToken: cachedToken.token });
        }

        // Get origin from request
        const origin = req.headers.get('origin') || req.nextUrl.origin;
        const domains = [origin];

        console.log('[PayPal Client Token] Generating new token for domains:', domains);

        // Generate new client token
        const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');

        const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                response_type: 'client_token',
                'domains[]': domains.join(','),
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[PayPal Client Token] API error:', errorText);
            throw new Error(`PayPal API error: ${response.status}`);
        }

        const data = await response.json();
        console.log('[PayPal Client Token] Token generated successfully');

        // Cache token (expires_in is in seconds)
        cachedToken = {
            token: data.access_token,
            expiresAt: now + (data.expires_in * 1000),
        };

        return NextResponse.json({
            clientToken: data.access_token,
            expiresIn: data.expires_in,
        });

    } catch (error) {
        console.error('[PayPal Client Token] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to generate client token' },
            { status: 500 }
        );
    }
}
