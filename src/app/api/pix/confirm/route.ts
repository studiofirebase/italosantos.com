import { NextRequest, NextResponse } from 'next/server';
import { subscriptionManager } from '@/lib/subscription-manager';
import { mercadopagoClient } from '@/lib/mercadopago-client';

interface PixConfirmationRequest {
  paymentId: string;
  email: string;
  name: string;
  amount: number;
  transactionId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { paymentId, email, name, amount, transactionId }: PixConfirmationRequest = await request.json();

    console.log('🎯 [PIX CONFIRM] Confirmando pagamento:', { paymentId, email, name, amount });

    // Validação básica
    if (!paymentId || !email || !name || !amount) {
      return NextResponse.json(
        { error: 'Dados incompletos. Todos os campos são obrigatórios para confirmar o pagamento.' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Valor inválido. O valor do pagamento deve ser maior que zero.' },
        { status: 400 }
      );
    }

    if (amount > 10000) {
      return NextResponse.json(
        { error: 'Valor muito alto. O valor máximo permitido é R$ 10.000,00.' },
        { status: 400 }
      );
    }

    // Verificar o status real do pagamento usando o SDK oficial do Mercado Pago
    console.log('🔍 [PIX CONFIRM] Verificando status do pagamento no Mercado Pago:', paymentId);
    
    try {
      const paymentData = await mercadopagoClient.getPayment(paymentId, 3, 2000);
      console.log('💰 [PIX CONFIRM] Status do pagamento:', {
        id: paymentData.id,
        status: paymentData.status,
        amount: paymentData.transaction_amount,
        requestedAmount: amount
      });

      // Só criar assinatura se o pagamento foi realmente aprovado
      if (paymentData.status !== 'approved') {
        console.log('⏳ [PIX CONFIRM] Pagamento não aprovado:', paymentData.status);
        return NextResponse.json(
          { 
            error: 'Pagamento não foi aprovado ainda. Aguarde a confirmação do pagamento.',
            status: paymentData.status
          },
          { status: 400 }
        );
      }

      // 🔒 VERIFICAÇÃO DE SEGURANÇA: Validar se o valor pago corresponde ao valor solicitado
      const realAmount = paymentData.transaction_amount;
      const requestedAmount = parseFloat(amount.toString());
      
      if (!realAmount) {
        console.error('❌ [PIX CONFIRM] Valor do pagamento não encontrado');
        return NextResponse.json(
          { 
            error: 'Valor do pagamento não encontrado. Entre em contato com o suporte.',
          },
          { status: 400 }
        );
      }
      
      console.log('🔍 [PIX CONFIRM] Verificando valores:', {
        realAmount,
        requestedAmount,
        difference: Math.abs(realAmount - requestedAmount)
      });

      // Permitir uma pequena diferença devido a arredondamentos (máximo R$ 0,01)
      if (Math.abs(realAmount - requestedAmount) > 0.01) {
        console.error('❌ [PIX CONFIRM] Valor pago não corresponde ao valor solicitado:', {
          realAmount,
          requestedAmount
        });
        return NextResponse.json(
          { 
            error: 'Valor pago não corresponde ao valor solicitado. Entre em contato com o suporte.',
            realAmount,
            requestedAmount
          },
          { status: 400 }
        );
      }

      console.log('✅ [PIX CONFIRM] Valores validados com sucesso');

      // Verificar se já existe uma assinatura para este pagamento
      const existingSubscription = await subscriptionManager.getSubscriptionByPaymentId(paymentId);
      if (existingSubscription) {
        console.log('✅ [PIX CONFIRM] Assinatura já existe para este pagamento:', paymentId);
        return NextResponse.json({
          success: true,
          subscriptionId: existingSubscription.id,
          message: 'Assinatura já foi ativada para este pagamento'
        });
      }

      // Gerar ID único para o usuário se não existir
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Criar assinatura usando o SubscriptionManager com o valor REAL pago
      const subscriptionId = await subscriptionManager.createSubscription({
        userId,
        email,
        planId: 'monthly',
        paymentId: paymentId,
        paymentMethod: 'pix',
        amount: realAmount // 🔒 Usar o valor real pago, não o valor enviado pelo frontend
      });

      console.log('✅ [PIX CONFIRM] Assinatura criada com sucesso:', subscriptionId);

      return NextResponse.json({
        success: true,
        subscriptionId,
        message: 'Pagamento confirmado e assinatura ativada com sucesso'
      });

    } catch (error) {
      console.error('❌ [PIX CONFIRM] Erro ao verificar pagamento no Mercado Pago:', error);
      return NextResponse.json(
        { error: 'Erro ao verificar pagamento. Tente novamente.' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ [PIX CONFIRM] Erro ao confirmar pagamento:', error);
    
    let errorMessage = 'Erro interno do servidor. Tente novamente em alguns minutos.';
    
    if (error instanceof Error) {
      if (error.message.includes('subscription') || error.message.includes('assinatura')) {
        errorMessage = 'Erro ao criar assinatura. Tente novamente ou entre em contato com o suporte.';
      } else if (error.message.includes('database') || error.message.includes('firestore')) {
        errorMessage = 'Erro no banco de dados. Tente novamente em alguns minutos.';
      } else if (error.message.includes('payment') || error.message.includes('pagamento')) {
        errorMessage = 'Erro ao processar pagamento. Verifique os dados e tente novamente.';
      } else if (error.message.includes('user') || error.message.includes('usuário')) {
        errorMessage = 'Erro com dados do usuário. Faça login novamente.';
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}
