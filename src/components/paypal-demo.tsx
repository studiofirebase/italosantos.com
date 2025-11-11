"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CreditCard, CheckCircle, XCircle } from 'lucide-react';
import { PayPalNamespace } from '@paypal/paypal-js';

interface PayPalButtonProps {
  amount: number;
  onSuccess: (details: any) => void;
  onError: (error: any) => void;
  onCancel: () => void;
}

function PayPalButton({ amount, onSuccess, onError, onCancel }: PayPalButtonProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPayPalScript = async () => {
      try {
        if (window.paypal) {
          setIsLoading(false);
          return;
        }

        const script = document.createElement('script');
        script.src = `https://www.paypal.com/sdk/js?client-id=${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}&currency=BRL&intent=capture`;
        script.async = true;
        
        script.onload = () => {
          setIsLoading(false);
        };
        
        script.onerror = () => {
          setError('Erro ao carregar PayPal');
          setIsLoading(false);
        };

        document.body.appendChild(script);
      } catch (err) {
        setError('Erro ao inicializar PayPal');
        setIsLoading(false);
      }
    };

    loadPayPalScript();
  }, []);

  useEffect(() => {
    if (!isLoading && (window as any).paypal && !error) {
      const paypalInstance = (window as any).paypal;
      if (paypalInstance) {
        paypalInstance.Buttons({
          createOrder: (data: any, actions: any) => {
            return actions.order.create({
              purchase_units: [
                {
                  amount: {
                    value: amount.toFixed(2),
                    currency_code: 'BRL',
                  },
                  description: 'Assinatura Mensal Studio VIP',
                },
              ],
              intent: 'CAPTURE',
            });
          },
          onApprove: async (data: any, actions: any) => {
            try {
              const details = await actions.order.capture();
              onSuccess(details);
            } catch (err) {
              onError(err);
            }
          },
          onCancel: () => {
            onCancel();
          },
          onError: (err: any) => {
            onError(err);
          },
        }).render('#paypal-button-container');
      }
    }
  }, [isLoading, error, amount, onSuccess, onError, onCancel]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando PayPal...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return <div id="paypal-button-container" />;
}

export default function PayPalDemo() {
  const { toast } = useToast();
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  const handlePaymentSuccess = async (details: any) => {
    setPaymentStatus('processing');
    
    try {
      console.log('Pagamento aprovado:', details);
      
      // Aqui você pode enviar os detalhes para sua API
      const response = await fetch('/api/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'createSubscription',
          customerEmail: details.payer.email_address,
          paymentDetails: details,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setPaymentStatus('success');
        setPaymentDetails(details);
        toast({
          title: 'Pagamento aprovado!',
          description: 'Sua assinatura foi ativada com sucesso.',
        });
      } else {
        throw new Error(result.message || 'Erro ao processar pagamento');
      }
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      setPaymentStatus('error');
      toast({
        title: 'Erro no pagamento',
        description: 'Houve um problema ao processar seu pagamento.',
        variant: 'destructive',
      });
    }
  };

  const handlePaymentError = (error: any) => {
    console.error('Erro no pagamento PayPal:', error);
    setPaymentStatus('error');
    toast({
      title: 'Erro no pagamento',
      description: 'Houve um problema com o pagamento.',
      variant: 'destructive',
    });
  };

  const handlePaymentCancel = () => {
    setPaymentStatus('idle');
    toast({
      title: 'Pagamento cancelado',
      description: 'O pagamento foi cancelado.',
    });
  };

  const resetPayment = () => {
    setPaymentStatus('idle');
    setPaymentDetails(null);
  };

  if (paymentStatus === 'success') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <CardTitle className="text-green-600">Pagamento Aprovado!</CardTitle>
          <CardDescription>
            Sua assinatura foi ativada com sucesso.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-semibold text-green-800 mb-2">Detalhes do Pagamento:</h4>
            <div className="text-sm text-green-700 space-y-1">
              <p><strong>ID:</strong> {paymentDetails?.id}</p>
              <p><strong>Status:</strong> {paymentDetails?.status}</p>
              <p><strong>Valor:</strong> R$ {paymentDetails?.purchase_units?.[0]?.amount?.value}</p>
              <p><strong>Email:</strong> {paymentDetails?.payer?.email_address}</p>
            </div>
          </div>
          <Button onClick={resetPayment} className="w-full">
            Fazer Novo Pagamento
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <CreditCard className="h-6 w-6 text-blue-600" />
          <CardTitle>Pagamento via PayPal</CardTitle>
        </div>
        <CardDescription>
          Complete sua assinatura de forma segura
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">Resumo da Assinatura:</h4>
          <div className="text-sm text-blue-700 space-y-1">
            <p><strong>Plano:</strong> Assinatura Mensal</p>
            <p><strong>Valor:</strong> R$ {amount.toFixed(2)}</p>
            <p><strong>Duração:</strong> 30 dias</p>
          </div>
        </div>

        <div className="space-y-2">
          <Badge variant="outline" className="w-full justify-center">
            💳 Pagamento Seguro via PayPal
          </Badge>
        </div>

        {paymentStatus === 'processing' ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Processando pagamento...</span>
          </div>
        ) : (
          <PayPalButton
            amount={amount}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            onCancel={handlePaymentCancel}
          />
        )}

        {paymentStatus === 'error' && (
          <Button onClick={resetPayment} variant="outline" className="w-full">
            Tentar Novamente
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Valor fixo da assinatura
const amount = 99.00;
