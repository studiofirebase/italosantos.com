import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';

// Configurar MercadoPago com token de acesso
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MERCADO_PAGO_ACCESS_TOKEN!,
});

export async function POST(request: NextRequest) {
    try {
        const { amount, currency, description } = await request.json();

        // Criar nova preferência
        const preference = new Preference(client);

        const result = await preference.create({
            body: {
                items: [
                    {
                        id: `item-${Date.now()}`,
                        title: description || 'Assinatura Premium',
                        unit_price: parseFloat(amount),
                        quantity: 1,
                        currency_id: currency || 'BRL',
                    },
                ],
                payer: {
                    email: 'test@example.com', // Email do comprador
                },
                back_urls: {
                    success: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/payment/success`,
                    failure: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/payment/failure`,
                    pending: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/payment/pending`,
                },
                auto_return: 'approved',
                payment_methods: {
                    excluded_payment_methods: [],
                    excluded_payment_types: [],
                    installments: 12, // Até 12 parcelas
                },
                statement_descriptor: 'PREMIUM ACCESS',
                external_reference: `order-${Date.now()}`,
            },
        });

        return NextResponse.json({
            preferenceId: result.id,
            initPoint: result.init_point,
            sandboxInitPoint: result.sandbox_init_point,
        });

    } catch (error) {
        console.error('Erro ao criar preferência MercadoPago:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}
