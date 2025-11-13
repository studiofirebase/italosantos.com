/**
 * PayPal API: Create Order
 * POST /api/paypal/orders/create
 * Creates a PayPal order with server-side validation
 */

import { NextRequest, NextResponse } from 'next/server';

const PAYPAL_API_BASE = process.env.NODE_ENV === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

const PAYPAL_CLIENT_ID = process.env.PAYPAL_SANDBOX_CLIENT_ID || process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_SANDBOX_CLIENT_SECRET || process.env.PAYPAL_CLIENT_SECRET;

async function getAccessToken(): Promise<string> {
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');

    const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
        throw new Error('Failed to get PayPal access token');
    }

    const data = await response.json();
    return data.access_token;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { amount, currency = 'USD', description, isSubscription, items } = body;

        console.log('[PayPal Create Order] Request:', { amount, currency, description, isSubscription });

        // Validate required fields
        if (!amount || amount <= 0) {
            return NextResponse.json(
                { error: 'Invalid amount' },
                { status: 400 }
            );
        }

        // Get access token
        const accessToken = await getAccessToken();

        // Build order payload
        const orderPayload: any = {
            intent: 'CAPTURE',
            purchase_units: [
                {
                    description: description || 'Purchase',
                    amount: {
                        currency_code: currency,
                        value: amount.toFixed(2),
                    },
                },
            ],
        };

        // Add items if provided
        if (items && items.length > 0) {
            const itemsTotal = items.reduce((sum: number, item: any) => {
                return sum + (item.price * item.quantity);
            }, 0);

            orderPayload.purchase_units[0].items = items.map((item: any) => ({
                name: item.name,
                quantity: item.quantity.toString(),
                unit_amount: {
                    currency_code: currency,
                    value: item.price.toFixed(2),
                },
                category: 'DIGITAL_GOODS',
            }));

            orderPayload.purchase_units[0].amount.breakdown = {
                item_total: {
                    currency_code: currency,
                    value: itemsTotal.toFixed(2),
                },
            };
        }

        // Add subscription metadata if needed
        if (isSubscription) {
            orderPayload.purchase_units[0].custom_id = 'subscription';
            orderPayload.purchase_units[0].description = description || 'Monthly Subscription';
        }

        console.log('[PayPal Create Order] Payload:', JSON.stringify(orderPayload, null, 2));

        // Create order
        const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderPayload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[PayPal Create Order] API error:', errorText);
            throw new Error(`PayPal API error: ${response.status}`);
        }

        const orderData = await response.json();
        console.log('[PayPal Create Order] Success:', orderData.id);

        return NextResponse.json({
            id: orderData.id,
            status: orderData.status,
            links: orderData.links,
        });

    } catch (error) {
        console.error('[PayPal Create Order] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to create order' },
            { status: 500 }
        );
    }
}
