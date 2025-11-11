// Configuração do Braintree Gateway
import braintree from 'braintree';

// Singleton para o gateway Braintree
let gateway: braintree.BraintreeGateway | null = null;

export function getBraintreeGateway(): braintree.BraintreeGateway {
  if (gateway) {
    return gateway;
  }

  const merchantId = process.env.BRAINTREE_MERCHANT_ID;
  const publicKey = process.env.BRAINTREE_PUBLIC_KEY;
  const privateKey = process.env.BRAINTREE_PRIVATE_KEY;
  const environment = process.env.BRAINTREE_ENV || 'sandbox';

  if (!merchantId || !publicKey || !privateKey) {
    throw new Error(
      'Braintree credentials not configured. Please set BRAINTREE_MERCHANT_ID, BRAINTREE_PUBLIC_KEY, and BRAINTREE_PRIVATE_KEY in your environment variables.'
    );
  }

  const env = environment === 'production' 
    ? braintree.Environment.Production 
    : braintree.Environment.Sandbox;

  gateway = new braintree.BraintreeGateway({
    environment: env,
    merchantId,
    publicKey,
    privateKey,
  });

  return gateway;
}

// Tipos para transações
export interface BraintreeTransactionResult {
  success: boolean;
  transaction?: braintree.Transaction;
  message?: string;
  errors?: any;
}

export interface BraintreeCustomer {
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
}
