import { NextRequest, NextResponse } from 'next/server';

interface CheckStatusRequest {
  paymentId: string;
  maxRetries?: number;
  delayMs?: number;
}

export async function POST(request: NextRequest) {
  try {
    const { paymentId, maxRetries = 5, delayMs = 2000 }: CheckStatusRequest = await request.json();

    console.log('🔍 [PIX CHECK STATUS] Verificando status do pagamento:', { paymentId, maxRetries, delayMs });

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID é obrigatório' },
        { status: 400 }
      );
    }

    // Função para verificar o pagamento
    const checkPayment = async (): Promise<any> => {
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return await response.json();
    };

    // Tentar verificar o pagamento com retry
    let lastError: any = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 [PIX CHECK STATUS] Tentativa ${attempt}/${maxRetries}`);
        
        const paymentData = await checkPayment();
        
        console.log('💰 [PIX CHECK STATUS] Status do pagamento:', {
          id: paymentData.id,
          status: paymentData.status,
          amount: paymentData.transaction_amount,
          attempt
        });

        return NextResponse.json({
          success: true,
          payment: {
            id: paymentData.id,
            status: paymentData.status,
            amount: paymentData.transaction_amount,
            email: paymentData.payer?.email,
            created: paymentData.date_created,
            approved: paymentData.date_approved
          },
          attempts: attempt
        });

      } catch (error) {
        lastError = error;
        console.log(`❌ [PIX CHECK STATUS] Tentativa ${attempt} falhou:`, error);
        
        // Se não é a última tentativa, aguardar antes da próxima
        if (attempt < maxRetries) {
          console.log(`⏳ [PIX CHECK STATUS] Aguardando ${delayMs}ms antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    // Se chegou aqui, todas as tentativas falharam
    console.error('❌ [PIX CHECK STATUS] Todas as tentativas falharam:', lastError);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Não foi possível verificar o status do pagamento após várias tentativas.',
        lastError: lastError?.message || 'Erro desconhecido',
        attempts: maxRetries
      },
      { status: 500 }
    );

  } catch (error) {
    console.error('❌ [PIX CHECK STATUS] Erro geral:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
