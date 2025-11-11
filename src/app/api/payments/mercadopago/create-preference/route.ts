import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { amount, currency, description } = await request.json();

    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: 'MercadoPago access token não configurado' },
        { status: 500 }
      );
    }

    // Criar preferência no MercadoPago
    const preference = {
      items: [
        {
          title: description || 'Produto',
          unit_price: amount,
          quantity: 1,
          currency_id: currency || 'BRL'
        }
      ],
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success`,
        failure: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/failure`,
        pending: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/pending`
      },
      auto_return: 'approved',
      notification_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/payments/mercadopago/webhook`,
      statement_descriptor: 'ITALOSANTOS',
      external_reference: `order_${Date.now()}`,
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 horas
    };

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`
      },
      body: JSON.stringify(preference)
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({
        preferenceId: data.id,
        initPoint: data.init_point,
        sandboxInitPoint: data.sandbox_init_point
      });
    } else {
      console.error('Erro MercadoPago API:', data);
      return NextResponse.json(
        { error: 'Erro ao criar preferência', details: data },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Erro ao criar preferência MercadoPago:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
