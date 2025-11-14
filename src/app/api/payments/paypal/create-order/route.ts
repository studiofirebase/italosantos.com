import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { amount, currency = 'USD', payment_method } = await request.json();

    if (!amount) {
      return NextResponse.json(
        { error: 'Amount é obrigatório' },
        { status: 400 }
      );
    }

    // Autenticar com PayPal
    const paypalAuth = Buffer.from(
      `${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
    ).toString('base64');

    const mode = process.env.NEXT_PUBLIC_PAYPAL_MODE || 'sandbox';
    const baseUrl = mode === 'live' 
      ? 'https://api-m.paypal.com' 
      : 'https://api-m.sandbox.paypal.com';

    // 1. Obter access token
    const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${paypalAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!tokenResponse.ok) {
      throw new Error('Falha ao obter token PayPal');
    }

    const { access_token } = await tokenResponse.json();

    // 2. Criar ordem
    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: currency,
            value: amount,
          },
          description: `Pagamento via ${payment_method || 'digital wallet'}`,
        },
      ],
      application_context: {
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/cancel`,
        brand_name: 'Studio VIP',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        payment_method: {
          payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED',
        },
      },
    };

    const orderResponse = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access_token}`,
      },
      body: JSON.stringify(orderData),
    });

    if (!orderResponse.ok) {
      const error = await orderResponse.json();
      throw new Error(`Falha ao criar ordem: ${JSON.stringify(error)}`);
    }

    const order = await orderResponse.json();

    return NextResponse.json({
      success: true,
      order_id: order.id,
      status: order.status,
      amount,
      currency,
      payment_method,
      created_at: order.create_time,
    });
  } catch (error: any) {
    console.error('Erro ao criar ordem PayPal:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao criar ordem' },
      { status: 500 }
    );
  }
}
