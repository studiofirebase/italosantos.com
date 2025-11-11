'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CreditCard, Smartphone, Apple } from 'lucide-react';
import DropIn from 'braintree-web-drop-in-react';

interface BraintreeCheckoutProps {
  amount: number;
  productId?: string;
  productType?: 'subscription' | 'product';
  productName?: string;
  onSuccess?: (transaction: any) => void;
  onError?: (error: any) => void;
}

export default function BraintreeCheckout({
  amount,
  productId,
  productType = 'subscription',
  productName = 'Assinatura Premium',
  onSuccess,
  onError,
}: BraintreeCheckoutProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clientToken, setClientToken] = useState<string | null>(null);
  const [instance, setInstance] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Obter client token quando componente monta
  useEffect(() => {
    const fetchClientToken = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const idToken = await user.getIdToken();
        const response = await fetch('/api/braintree/token', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        if (data.success && data.clientToken) {
          setClientToken(data.clientToken);
        } else {
          throw new Error(data.message || 'Erro ao carregar métodos de pagamento');
        }
      } catch (error: any) {
        console.error('Erro ao obter token Braintree:', error);
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: error.message || 'Não foi possível carregar os métodos de pagamento',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchClientToken();
  }, [user, toast]);

  const handlePayment = async () => {
    if (!instance) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Sistema de pagamento não inicializado',
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Obter payment method nonce
      const { nonce, deviceData } = await instance.requestPaymentMethod();

      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const idToken = await user.getIdToken();

      // Processar pagamento
      const response = await fetch('/api/braintree/checkout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentMethodNonce: nonce,
          deviceData,
          amount,
          productId,
          productType,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: '✅ Pagamento Confirmado!',
          description: `${productName} ativado com sucesso.`,
        });

        if (onSuccess) {
          onSuccess(data.transaction);
        }

        // Limpar o drop-in
        instance.clearSelectedPaymentMethod();

      } else {
        throw new Error(data.message || 'Erro ao processar pagamento');
      }

    } catch (error: any) {
      console.error('Erro ao processar pagamento:', error);
      toast({
        variant: 'destructive',
        title: 'Erro no Pagamento',
        description: error.message || 'Não foi possível processar o pagamento. Tente novamente.',
      });

      if (onError) {
        onError(error);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Autenticação Necessária</CardTitle>
          <CardDescription>
            Faça login para continuar com o pagamento
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Carregando métodos de pagamento...</span>
        </CardContent>
      </Card>
    );
  }

  if (!clientToken) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Erro</CardTitle>
          <CardDescription>
            Não foi possível carregar os métodos de pagamento
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Finalizar Pagamento
        </CardTitle>
        <CardDescription>
          Escolha seu método de pagamento preferido
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Resumo do pedido */}
        <div className="bg-muted p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="font-medium">{productName}</span>
            <span className="text-2xl font-bold">
              R$ {amount.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Métodos de pagamento aceitos */}
        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <CreditCard className="h-4 w-4" />
            <span>Cartão</span>
          </div>
          <div className="flex items-center gap-1">
            <Smartphone className="h-4 w-4" />
            <span>Google Pay</span>
          </div>
          <div className="flex items-center gap-1">
            <Apple className="h-4 w-4" />
            <span>Apple Pay</span>
          </div>
        </div>

        {/* Braintree Drop-in UI */}
        <div className="braintree-dropin-container">
          <DropIn
            options={{
              authorization: clientToken,
              // Google Pay
              googlePay: {
                merchantId: process.env.NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID || 'BCR2DN4T6OKKN3DX',
                googlePayVersion: 2,
                transactionInfo: {
                  totalPriceStatus: 'FINAL',
                  totalPrice: amount.toString(),
                  currencyCode: 'BRL',
                },
              },
              // Apple Pay
              applePay: {
                displayName: process.env.NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_NAME || 'Italo Santos',
                paymentRequest: {
                  total: {
                    label: productName,
                    amount: amount.toString(),
                  },
                  countryCode: 'BR',
                  currencyCode: 'BRL',
                  supportedNetworks: ['visa', 'mastercard', 'amex'],
                  merchantCapabilities: ['supports3DS'],
                },
              },
              // PayPal (via Braintree)
              paypal: {
                flow: 'checkout',
                amount: amount.toString(),
                currency: 'BRL',
              },
              // Cards
              card: {
                cardholderName: {
                  required: true,
                },
                overrides: {
                  fields: {
                    number: {
                      placeholder: 'Número do cartão',
                    },
                    cvv: {
                      placeholder: 'CVV',
                    },
                    expirationDate: {
                      placeholder: 'MM/AA',
                    },
                  },
                },
              },
              // 3D Secure
              threeDSecure: true,
              // Dados para análise de fraude
              dataCollector: {
                paypal: true,
              },
            }}
            onInstance={(inst) => setInstance(inst)}
          />
        </div>

        {/* Botão de pagamento */}
        <Button
          onClick={handlePayment}
          disabled={!instance || isProcessing}
          className="w-full"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              Pagar R$ {amount.toFixed(2)}
            </>
          )}
        </Button>

        {/* Segurança */}
        <p className="text-xs text-center text-muted-foreground">
          🔒 Pagamento seguro processado via Braintree (PayPal)
        </p>
      </CardContent>
    </Card>
  );
}
