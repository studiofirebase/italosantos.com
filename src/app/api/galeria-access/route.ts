import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export async function GET() {
  // Esta é uma API para verificar se o usuário tem acesso à galeria
  return NextResponse.json({ hasAccess: false, message: 'Acesso negado' }, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;
    
    if (!email) {
      return NextResponse.json({ hasAccess: false, message: 'Email não fornecido' }, { status: 400 });
    }
    
    // Verificar se o usuário tem assinatura ativa via API subscription
    const subscriptionResponse = await fetch(`${request.nextUrl.origin}/api/subscription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'checkSubscription',
        customerEmail: email
      })
    });
    
    const subscriptionResult = await subscriptionResponse.json();
    
    if (subscriptionResult.success && subscriptionResult.hasActiveSubscription) {
      return NextResponse.json({ 
        hasAccess: true, 
        message: 'Acesso autorizado',
        subscription: subscriptionResult.subscription 
      });
    }
    
    return NextResponse.json({ hasAccess: false, message: 'Assinatura não encontrada ou expirada' }, { status: 403 });
    
  } catch (error) {
    console.error('Erro ao verificar acesso:', error);
    return NextResponse.json({ hasAccess: false, message: 'Erro interno' }, { status: 500 });
  }
}
