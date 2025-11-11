
// Configuração do PayPal
export const paypalConfig = {
  clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '',
  clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
  // Allow explicit override via env; fallback to NODE_ENV heuristic
  mode: (process.env.NEXT_PUBLIC_PAYPAL_MODE || process.env.PAYPAL_MODE || (process.env.NODE_ENV === 'production' ? 'live' : 'sandbox')) as 'live' | 'sandbox',
  
  // Configurações de pagamento
  payment: {
    intent: 'CAPTURE' as const,
    application_context: {
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://italosantos.com'}/assinante?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://italosantos.com'}/assinante?canceled=true`,
      brand_name: 'Studio VIP',
      landing_page: 'LOGIN',
      user_action: 'PAY_NOW',
      shipping_preference: 'NO_SHIPPING'
    }
  },

  // Configurações de assinatura
  subscription: {
    plan_id: process.env.PAYPAL_PLAN_ID || '',
    application_context: {
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://italosantos.com'}/assinante?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://italosantos.com'}/assinante?canceled=true`,
      brand_name: 'Studio VIP',
      landing_page: 'LOGIN',
      user_action: 'SUBSCRIBE_NOW',
      shipping_preference: 'NO_SHIPPING'
    }
  },

  // Configurações de produtos
  products: {
    subscription: {
      name: 'Assinatura Mensal Studio VIP',
      description: 'Acesso completo ao conteúdo exclusivo por 30 dias',
      amount: '99.00',
      currency: 'BRL',
      duration: 30, // dias
      features: [
        'Acesso total ao conteúdo exclusivo',
        'Downloads ilimitados',
        'Suporte dedicado',
        'Conteúdo em alta definição'
      ]
    }
  }
};

// URLs da API PayPal
export const paypalUrls = {
  sandbox: {
    base: 'https://api-m.sandbox.paypal.com',
    webhook: 'https://api-m.sandbox.paypal.com/v1/notifications/webhooks'
  },
  live: {
    base: 'https://api-m.paypal.com',
    webhook: 'https://api-m.paypal.com/v1/notifications/webhooks'
  }
};

// Função para obter URL base baseada no ambiente
export function getPaypalBaseUrl(): string {
  return paypalConfig.mode === 'live' ? paypalUrls.live.base : paypalUrls.sandbox.base;
}

// Função para obter URL do webhook baseada no ambiente
export function getPaypalWebhookUrl(): string {
  return paypalConfig.mode === 'live' ? paypalUrls.live.webhook : paypalUrls.sandbox.webhook;
}

// Host base para OAuth/Connect (www.*) conforme ambiente
export function getPaypalAuthorizeBase(): string {
  return paypalConfig.mode === 'live' ? 'https://www.paypal.com' : 'https://www.sandbox.paypal.com';
}
