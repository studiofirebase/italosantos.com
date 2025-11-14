
import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Função simplificada para obter token de acesso usando credenciais do ambiente
async function getPayPalAccessToken(): Promise<string> {
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
        throw new Error('PayPal credentials not configured');
    }

    const isProduction = process.env.NEXT_PUBLIC_PAYPAL_ENV === 'production';
    const tokenUrl = isProduction 
        ? 'https://api-m.paypal.com/v1/oauth2/token'
        : 'https://api-m.sandbox.paypal.com/v1/oauth2/token';

    const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
        const error = await response.text();
        console.error('PayPal Token Error:', error);
        throw new Error('Failed to get PayPal access token');
    }

    const data = await response.json();
    return data.access_token;
}

// Rota principal para criar o pedido
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        console.log('[PayPal Create Order] Request body:', body);
        
        const { productId } = body;

        if (!productId) {
            console.error('[PayPal Create Order] Product ID missing');
            return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
        }

        // 1. Buscar as informações do produto
        const productDocRef = doc(db, 'products', productId);
        const productDoc = await getDoc(productDocRef);

        if (!productDoc.exists()) {
            console.error('[PayPal Create Order] Product not found:', productId);
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }
        
        const product = productDoc.data();
        console.log('[PayPal Create Order] Product:', { id: productId, name: product.name, price: product.price });

        if (!product.price || product.price <= 0) {
            console.error('[PayPal Create Order] Invalid price:', product.price);
            return NextResponse.json({ error: 'Invalid product price' }, { status: 400 });
        }

        // 2. Obter o token de acesso
        console.log('[PayPal Create Order] Getting access token...');
        const accessToken = await getPayPalAccessToken();
        console.log('[PayPal Create Order] Access token obtained');

        // 3. Criar o pedido na API do PayPal
        const isProduction = process.env.NEXT_PUBLIC_PAYPAL_ENV === 'production';
        const createOrderUrl = isProduction
            ? 'https://api-m.paypal.com/v2/checkout/orders'
            : 'https://api-m.sandbox.paypal.com/v2/checkout/orders';
        
        console.log('[PayPal Create Order] Using URL:', createOrderUrl, 'Production:', isProduction);
        
        const orderPayload = {
            intent: 'CAPTURE',
            purchase_units: [{
                reference_id: productId,
                description: product.name || 'Product purchase',
                amount: {
                    currency_code: 'BRL',
                    value: product.price.toFixed(2),
                },
            }],
        };

        console.log('[PayPal Create Order] Order payload:', JSON.stringify(orderPayload, null, 2));

        const paypalResponse = await fetch(createOrderUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify(orderPayload),
        });

        const payPalData = await paypalResponse.json();
        console.log('[PayPal Create Order] Response status:', paypalResponse.status);
        console.log('[PayPal Create Order] Response data:', JSON.stringify(payPalData, null, 2));

        if (!paypalResponse.ok) {
            console.error('[PayPal Create Order] API Error:', payPalData);
            return NextResponse.json({ 
                error: 'Failed to create PayPal order', 
                details: payPalData 
            }, { status: 500 });
        }

        console.log('[PayPal Create Order] Success! Order ID:', payPalData.id);
        return NextResponse.json({ orderId: payPalData.id });

    } catch (error: any) {
        console.error('[PayPal Create Order] Exception:', error);
        return NextResponse.json({ 
            error: 'Internal server error', 
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}
