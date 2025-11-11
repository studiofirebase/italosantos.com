// Configuração centralizada do Google Pay
export const GOOGLE_PAY_CONFIG = {
  // Merchant ID - configuração para teste
  merchantId: process.env.NEXT_PUBLIC_GOOGLE_PAY_ENVIRONMENT === 'TEST' 
    ? '01234567890123456789' // ID de teste padrão do Google
    : (process.env.NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID || 'BCR2DN4T6OKKN3DX'), // ID real para produção
  
  // Nome do comerciante
  merchantName: process.env.NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_NAME || 'Italo Santos Studio',
  
  // Ambiente (TEST ou PRODUCTION)
  environment: process.env.NEXT_PUBLIC_GOOGLE_PAY_ENVIRONMENT || 
               (process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'TEST'),
  
  // Configuração de pagamento
  paymentMethods: {
    type: 'CARD',
    parameters: {
      allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
      allowedCardNetworks: ['MASTERCARD', 'VISA', 'AMEX'],
      billingAddressRequired: false,
      billingAddressParameters: {
        format: 'MIN',
        phoneNumberRequired: false
      }
    },
    tokenizationSpecification: {
      type: 'PAYMENT_GATEWAY',
      parameters: {
        gateway: process.env.NEXT_PUBLIC_GOOGLE_PAY_ENVIRONMENT === 'TEST' ? 'example' : 'stripe',
        gatewayMerchantId: process.env.NEXT_PUBLIC_GOOGLE_PAY_ENVIRONMENT === 'TEST'
          ? '01234567890123456789' // ID de teste
          : (process.env.NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID || 'BCR2DN4T6OKKN3DX'), // ID real
      },
    },
  },
  
  // Configuração de transação
  transactionInfo: {
    totalPriceStatus: 'FINAL',
    totalPriceLabel: 'Total',
    currencyCode: 'BRL',
    countryCode: 'BR',
  },
};

// Função para validar configuração
export function validateGooglePayConfig() {
  const issues: string[] = [];
  
  if (!GOOGLE_PAY_CONFIG.merchantId) {
    issues.push('Merchant ID não configurado');
  }
  
  if (GOOGLE_PAY_CONFIG.environment === 'PRODUCTION' && 
      (GOOGLE_PAY_CONFIG.merchantId === '01234567890123456789' || 
       GOOGLE_PAY_CONFIG.merchantId.length < 10)) {
    issues.push('Merchant ID inválido para produção');
  }
  
  // Em ambiente de teste, permitir merchant ID de exemplo
  if (GOOGLE_PAY_CONFIG.environment === 'TEST' && !GOOGLE_PAY_CONFIG.merchantId) {
    issues.push('Merchant ID não configurado para teste');
  }
  
  // Gateway 'example' é válido quando é o único disponível
  // Removida validação que impedia uso do gateway example
  
  return {
    isValid: issues.length === 0,
    issues,
    config: GOOGLE_PAY_CONFIG
  };
}

// Função para obter configuração de pagamento
export function getPaymentDataRequest(amount: number, currency: string = 'BRL') {
  return {
    apiVersion: 2,
    apiVersionMinor: 0,
    allowedPaymentMethods: [GOOGLE_PAY_CONFIG.paymentMethods],
    merchantInfo: {
      merchantId: GOOGLE_PAY_CONFIG.merchantId,
      merchantName: GOOGLE_PAY_CONFIG.merchantName,
    },
    transactionInfo: {
      ...GOOGLE_PAY_CONFIG.transactionInfo,
      totalPrice: amount.toString(),
      currencyCode: currency,
    },
  };
}

// Função para obter configuração específica do ambiente
export function getEnvironmentSpecificConfig() {
  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  
  const isFirebase = typeof window !== 'undefined' && 
    window.location.hostname.includes('firebaseapp.com');
  
  const isProduction = process.env.NODE_ENV === 'production' && !isLocalhost;
  
  return {
    isLocalhost,
    isFirebase,
    isProduction,
    environment: isLocalhost ? 'TEST' : (isProduction ? 'PRODUCTION' : 'TEST'),
    merchantId: isLocalhost ? '01234567890123456789' : GOOGLE_PAY_CONFIG.merchantId,
    gateway: isLocalhost ? 'example' : (isProduction ? 'stripe' : 'example')
  };
}
