'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useFaceIDAuth } from '@/contexts/face-id-auth-context';
import { useAuth } from '@/contexts/AuthProvider';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { getEnvironmentSpecificConfig } from '@/lib/google-pay-config';

interface GooglePayButtonProps {
  amount: number;
  currency: string;
  onSuccess: () => void;
  className?: string;
}

export default function GooglePayButton({ amount, currency, onSuccess, className }: GooglePayButtonProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { user: firebaseUser, userProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isGooglePayAvailable, setIsGooglePayAvailable] = useState(false);

  // Debug: verificar se o componente está sendo renderizado
  console.log('🔍 [Google Pay] Componente renderizado:', {
    amount,
    currency,
    firebaseUser: !!firebaseUser,
    userProfile: !!userProfile,
    firebaseUserEmail: firebaseUser?.email,
    userProfileEmail: userProfile?.email
  });

  // Verificação simplificada de autenticação usando apenas AuthProvider
  const isUserAuthenticated = () => {
    // Verificar se há usuário Firebase autenticado
    const hasFirebaseUser = firebaseUser && firebaseUser.email;
    const hasUserProfile = userProfile && userProfile.email;
    
    // Se qualquer uma das fontes indicar autenticação, considerar autenticado
    const isAuthenticatedAnywhere = hasFirebaseUser || hasUserProfile;
    const hasValidEmail = hasFirebaseUser || hasUserProfile;

    // Debug: verificar status da autenticação
    console.log('🔍 [Google Pay] Status de autenticação:', {
      hasFirebaseUser,
      hasUserProfile,
      firebaseUserEmail: firebaseUser?.email,
      userProfileEmail: userProfile?.email,
      isAuthenticatedAnywhere,
      hasValidEmail,
      finalResult: isAuthenticatedAnywhere && hasValidEmail
    });

    return isAuthenticatedAnywhere && hasValidEmail;
  };

  useEffect(() => {
    // Verificar se Google Pay está disponível
    const checkGooglePayAvailability = () => {
      if (typeof window !== 'undefined') {
        // Verificar se o script foi carregado
        if ('google' in window && (window as any).google?.payments?.api) {
          console.log('✅ Google Pay API disponível');
          setIsGooglePayAvailable(true);
        } else {
          console.log('⏳ Aguardando Google Pay API...');
          setTimeout(checkGooglePayAvailability, 1000);
        }
      }
    };

    checkGooglePayAvailability();
  }, []);

  const handleGooglePayClick = async () => {
    // Verificar autenticação
    if (!isUserAuthenticated()) {
      toast({
        title: '❌ Acesso Negado',
        description: 'Você precisa estar autenticado para usar o Google Pay.',
        variant: 'destructive',
      });
      router.push('/auth/face');
      return;
    }

    // Obter email do usuário
    const userEmailValue = userProfile?.email || firebaseUser?.email || '';
    
    if (!userEmailValue || userEmailValue.trim() === '') {
      toast({
        title: '❌ Email não encontrado',
        description: 'Não foi possível identificar seu email. Faça login novamente.',
        variant: 'destructive',
      });
      router.push('/auth/face');
      return;
    }

    setIsLoading(true);

    try {
      // Obter configuração específica do ambiente
      const envConfig = getEnvironmentSpecificConfig();
      console.log('🔧 [Google Pay] Configuração do ambiente:', envConfig);
      
      // Configuração simplificada do Google Pay
      const merchantId = envConfig.merchantId;
      
      const paymentsClient = new (window as any).google.payments.api.PaymentsClient({
        environment: envConfig.environment,
      });

      const paymentDataRequest = {
        apiVersion: 2,
        apiVersionMinor: 0,
        allowedPaymentMethods: [
          {
            type: 'CARD',
            parameters: {
              allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
              allowedCardNetworks: ['MASTERCARD', 'VISA'],
            },
            tokenizationSpecification: {
              type: 'PAYMENT_GATEWAY',
              parameters: {
                gateway: envConfig.gateway,
                gatewayMerchantId: merchantId,
              },
            },
          },
        ],
        merchantInfo: {
          merchantId: merchantId,
          merchantName: 'Italo Santos Studio',
        },
        transactionInfo: {
          totalPriceStatus: 'FINAL',
          totalPriceLabel: 'Total',
          totalPrice: amount.toString(),
          currencyCode: currency,
          countryCode: 'BR',
        },
      };

      console.log('🔍 [Google Pay] Iniciando pagamento com configuração:', {
        environment: envConfig.environment,
        merchantId: merchantId,
        amount,
        currency,
        userEmail: userEmailValue.substring(0, 10) + '...' // Log parcial por segurança
      });

      const paymentData = await paymentsClient.loadPaymentData(paymentDataRequest);
      console.log('✅ [Google Pay] Pagamento aprovado pelo usuário');

      // Enviar dados para o servidor
      const apiUrl = envConfig.isLocalhost 
        ? 'http://localhost:3000/api/google-pay/process'
        : '/api/google-pay/process';

      console.log('📡 [Google Pay] Enviando para API:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentData: paymentData,
          amount: amount,
          currency: currency,
          merchantId: merchantId,
          userEmail: userEmailValue,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log('🎉 [Google Pay] Pagamento aprovado, chamando onSuccess...');
        toast({
          title: '✅ Pagamento Google Pay Aprovado!',
          description: 'Sua assinatura foi ativada com sucesso.',
        });
        onSuccess();
        console.log('✅ [Google Pay] onSuccess chamado com sucesso');
      } else {
        throw new Error(result.error || 'Erro no pagamento');
      }
    } catch (error) {
      console.error('Erro no Google Pay:', error);
      
      let errorMessage = 'Tente novamente ou use outro método.';
      
      if (error instanceof Error) {
        if (error.message.includes('Valor insuficiente')) {
          errorMessage = 'Valor insuficiente para ativar a assinatura.';
        } else if (error.message.includes('já possui')) {
          errorMessage = 'Você já possui uma assinatura ativa.';
        } else if (error.message.includes('não autenticado')) {
          errorMessage = 'Você precisa estar autenticado.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Erro de conexão. Verifique sua internet.';
        } else if (error.message.includes('CANCELED')) {
          errorMessage = 'Pagamento cancelado pelo usuário.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: '❌ Erro no Google Pay',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Se não estiver autenticado, mostrar botão desabilitado
  if (!isUserAuthenticated()) {
    return (
      <Button
        disabled
        className={`w-full ${className || ''}`}
        variant="outline"
      >
        <AlertTriangle className="w-4 h-4 mr-2" />
        Faça login para usar Google Pay
      </Button>
    );
  }

  // Se Google Pay não estiver disponível, mostrar botão desabilitado
  if (!isGooglePayAvailable) {
    return (
      <Button
        disabled
        className={`w-full ${className || ''}`}
        variant="outline"
      >
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Carregando Google Pay...
      </Button>
    );
  }

  return (
    <Button
      onClick={handleGooglePayClick}
      disabled={isLoading}
      className={`w-full ${className || ''}`}
      variant="default"
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Processando...
        </>
      ) : (
        <>
          <img
            src="/google-pay.png"
            alt="Google Pay"
            className="w-6 h-6 mr-2"
          />
          Pagar com Google Pay
        </>
      )}
    </Button>
  );
}
