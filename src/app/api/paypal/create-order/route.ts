
import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getPaypalBaseUrl } from '@/lib/paypal-config';

// Função para obter um novo token de acesso do PayPal usando o refresh token
async function getPayPalAccessToken(sellerId: string): Promise<string> {
    const userDocRef = doc(db, 'users', sellerId, 'integrations', 'paypal');
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
        throw new Error('As credenciais de pagamento do vendedor não foram encontradas.');
    }

    const credentials = userDoc.data();
    const { refreshToken, expiresAt } = credentials;

    // Se o token ainda for válido, retorne-o (com uma margem de 5 minutos)
    if (Date.now() < expiresAt - 5 * 60 * 1000) {
        return credentials.accessToken;
    }

    // Se o token expirou, use o refresh token para obter um novo
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const tokenUrl = `${getPaypalBaseUrl()}/v1/oauth2/token`;

    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refreshToken);

    const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: params,
    });

    if (!response.ok) {
        throw new Error('Falha ao renovar o token de acesso do PayPal.');
    }

    const newTokens = await response.json();

    // Atualize os novos tokens no Firestore
    await setDoc(userDocRef, {
        ...credentials,
        accessToken: newTokens.access_token,
        expiresAt: Date.now() + newTokens.expires_in * 1000,
    });

    return newTokens.access_token;
}

// Rota principal para criar o pedido
export async function POST(request: NextRequest) {
    try {
        const { productId, sellerId } = await request.json();

        if (!productId || !sellerId) {
            return NextResponse.json({ error: 'ID do produto e ID do vendedor são obrigatórios.' }, { status: 400 });
        }

        // 1. Buscar as informações do produto
        const productDocRef = doc(db, 'products', productId);
        const productDoc = await getDoc(productDocRef);

        if (!productDoc.exists()) {
            return NextResponse.json({ error: 'Produto não encontrado.' }, { status: 404 });
        }
        const product = productDoc.data();

        // 2. Obter o token de acesso do vendedor
        const accessToken = await getPayPalAccessToken(sellerId);
        
        // 3. Obter o email do vendedor (PayPal Payouts)
        const sellerInfoDocRef = doc(db, 'users', sellerId, 'integrations', 'paypal');
        const sellerInfoDoc = await getDoc(sellerInfoDocRef);
        const sellerEmail = sellerInfoDoc.data()?.email; // Assumindo que o email é salvo durante a conexão

        if (!sellerEmail) {
            return NextResponse.json({ error: 'Email do destinatário do PayPal não encontrado.' }, { status: 500 });
        }

        // 4. Criar o pedido na API do PayPal (sandbox ou live conforme ambiente)
        const createOrderUrl = `${getPaypalBaseUrl()}/v2/checkout/orders`;
        
        const orderPayload = {
            intent: 'CAPTURE',
            purchase_units: [{
                amount: {
                    currency_code: 'BRL',
                    value: product.price.toFixed(2),
                },
                payee: {
                    email_address: sellerEmail
                }
            }],
        };

        const paypalResponse = await fetch(createOrderUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify(orderPayload),
        });

        const payPalData = await paypalResponse.json();

        if (!paypalResponse.ok) {
            console.error('PayPal API Error:', payPalData);
            return NextResponse.json({ error: 'Falha ao criar o pedido no PayPal.', details: payPalData }, { status: 500 });
        }

        return NextResponse.json({ orderId: payPalData.id });

    } catch (error: any) {
        console.error('Erro ao criar pedido:', error);
        return NextResponse.json({ error: 'Erro interno do servidor.', message: error.message }, { status: 500 });
    }
}
