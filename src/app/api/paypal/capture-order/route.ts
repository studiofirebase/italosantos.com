
import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getPaypalBaseUrl } from '@/lib/paypal-config';
import { getAdminAuth } from "@/lib/firebase-admin";

// Função para obter um novo token de acesso do PayPal usando o refresh token
async function getPayPalAccessToken(sellerId: string): Promise<string> {
    const userDocRef = doc(db, 'users', sellerId, 'integrations', 'paypal');
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
        throw new Error('As credenciais de pagamento do vendedor não foram encontradas.');
    }

    const credentials = userDoc.data();
    const { refreshToken, expiresAt, accessToken } = credentials;

    // Se o token ainda for válido, retorne-o (com uma margem de 5 minutos)
    if (Date.now() < expiresAt - 5 * 60 * 1000) {
        return accessToken;
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
    await updateDoc(userDocRef, {
        accessToken: newTokens.access_token,
        expiresAt: Date.now() + newTokens.expires_in * 1000,
    });

    return newTokens.access_token;
}

export async function POST(request: NextRequest) {
    const sessionCookie = request.cookies.get("__session")?.value || "";
    if (!sessionCookie) {
         return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    try {
        const auth = getAdminAuth();
        if (!auth) {
            return NextResponse.json({ error: 'Firebase Admin não inicializado' }, { status: 500 });
        }
        const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
        const buyerId = decodedClaims.uid;
        const buyerEmail = decodedClaims.email;

        const { orderId, productId, sellerId } = await request.json();

        if (!orderId || !productId || !sellerId) {
            return NextResponse.json({ error: 'orderId, productId e sellerId são obrigatórios.' }, { status: 400 });
        }

        // 1. Obter o token de acesso do vendedor
        const accessToken = await getPayPalAccessToken(sellerId);

        // 2. Capturar o pedido com o PayPal
        const captureUrl = `${getPaypalBaseUrl()}/v2/checkout/orders/${orderId}/capture`;

        const paypalResponse = await fetch(captureUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        const captureData = await paypalResponse.json();

        if (captureData.status !== 'COMPLETED') {
            console.error('PayPal Capture Error:', captureData);
            return NextResponse.json({ error: 'Falha ao capturar o pagamento.', details: captureData }, { status: 500 });
        }

        // 3. Salvar a compra para o comprador no Firestore
        const userDocRef = doc(db, 'users', buyerId);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            await updateDoc(userDocRef, {
                purchasedProducts: arrayUnion(productId),
                lastPurchase: new Date(),
            });
        } else {
            await setDoc(userDocRef, {
                uid: buyerId,
                email: buyerEmail,
                purchasedProducts: [productId],
                lastPurchase: new Date(),
                createdAt: new Date(),
            });
        }

        // 4. Incrementar o contador de vendas do produto
        const productRef = doc(db, 'products', productId);
        const productDoc = await getDoc(productRef);
        if (productDoc.exists()) {
            const currentSales = productDoc.data().sales || 0;
            await updateDoc(productRef, {
                sales: currentSales + 1
            });
        }
        
        // Retornar sucesso com os detalhes do pagador
        return NextResponse.json({
            success: true,
            message: "Compra concluída com sucesso!",
            details: captureData.payer
        });


    } catch (error: any) {
        console.error('Erro ao capturar pedido:', error);
        return NextResponse.json({ error: 'Erro interno do servidor.', message: error.message }, { status: 500 });
    }
}
