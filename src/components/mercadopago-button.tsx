
"use client";

import { useEffect, useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { useFaceIDAuth } from '@/contexts/face-id-auth-context';
import { useAuth } from '@/contexts/AuthProvider';
import { useRouter } from 'next/navigation';
import { clearAuthData, checkForResidualData } from '@/lib/auth-cleanup';

interface MercadoPagoButtonProps {
  amount: number;
  onSuccess: (details: any) => void;
  disabled?: boolean;
  customerInfo?: { name: string; email: string };
  isBrazil?: boolean;
}

declare global {
    interface Window {
        MercadoPago: any;
    }
}

// THIS COMPONENT IS NO LONGER IN USE FOR THE MAIN FLOW,
// BUT IS KEPT FOR POTENTIAL FUTURE USE WITH OTHER PAYMENT METHODS.
// THE PIX FLOW IS NOW HANDLED BY A DEDICATED MODAL ON THE HOMEPAGE.

export default function MercadoPagoButton({ amount, onSuccess, disabled = false, customerInfo, isBrazil }: MercadoPagoButtonProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { isAuthenticated, userEmail } = useFaceIDAuth();
  const { user: firebaseUser, userProfile } = useAuth();
  const [isSdkReady, setIsSdkReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');
  const paymentBrickContainerId = `paymentBrick_container_mercado_pago`;
  const brickInstance = useRef<any>(null);
  const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY;

  // VERIFICAÇÃO RIGOROSA DE AUTENTICAÇÃO
  useEffect(() => {
    const checkAuthentication = () => {
      console.log('🔒 [MercadoPago] Verificando autenticação...');
      
      // Verificar se há dados residuais suspeitos
      const residualData = checkForResidualData();
      
      // Verificar múltiplas fontes de autenticação
      const localStorage_auth = localStorage.getItem('isAuthenticated') === 'true';
      const sessionStorage_auth = sessionStorage.getItem('isAuthenticated') === 'true';
      const context_auth = isAuthenticated;
      const hasUserEmail = userEmail && userEmail.trim() !== '';
      const hasUserProfile = userProfile && userProfile.email;
      const hasFirebaseUser = firebaseUser && firebaseUser.email;
      
      console.log('🔍 [MercadoPago] Status de autenticação:', {
        localStorage_auth,
        sessionStorage_auth,
        context_auth,
        hasUserEmail,
        hasUserProfile,
        hasFirebaseUser,
        userEmail,
        userProfileEmail: userProfile?.email,
        firebaseUserEmail: firebaseUser?.email,
        residualData
      });
      
      // CRITÉRIOS RIGOROSOS: deve estar autenticado E ter email válido
      const isAuthenticatedAnywhere = localStorage_auth || sessionStorage_auth || context_auth || hasFirebaseUser;
      const hasValidEmail = hasUserEmail || hasUserProfile || hasFirebaseUser;
      
      // Verificar se há dados suspeitos (como elonmusk@gmail.com)
      const hasSuspiciousData = Object.values(residualData.localStorage).some(value => 
        typeof value === 'string' && (
          value.includes('elonmusk') || 
          value.includes('Elon Musk') ||
          value.includes('test@') ||
          value.includes('example@')
        )
      );
      
      if (hasSuspiciousData) {
        console.log('🚨 [MercadoPago] Dados suspeitos encontrados! Limpando...');
        clearAuthData();
        setAuthStatus('unauthenticated');
        
        toast({
          variant: 'destructive',
          title: 'Dados Suspeitos Detectados',
          description: 'Dados de autenticação foram limpos por segurança.'
        });
        router.push('/auth/face');
        return;
      }
      
      if (!isAuthenticatedAnywhere || !hasValidEmail) {
        console.log('🚫 [MercadoPago] Usuário não autenticado ou sem email válido');
        setAuthStatus('unauthenticated');
        return;
      }
      
      console.log('✅ [MercadoPago] Usuário autenticado e autorizado');
      setAuthStatus('authenticated');
    };

    // Verificar imediatamente
    checkAuthentication();
    
    // Verificar periodicamente a cada 3 segundos
    const authInterval = setInterval(checkAuthentication, 3000);
    
    return () => clearInterval(authInterval);
  }, [isAuthenticated, userEmail, userProfile, firebaseUser, router, toast]);

  // Obter email do usuário autenticado - APENAS se autenticado
  const getUserEmail = () => {
    if (authStatus !== 'authenticated') {
      return '';
    }

    const email = firebaseUser?.email || 
                 userProfile?.email || 
                 userEmail || 
                 localStorage.getItem('userEmail') || 
                 '';
    
    // Verificar se o email é válido
    if (!email || email.trim() === '') {
      console.log('⚠️ [MercadoPago] Email inválido encontrado');
      return '';
    }
    
    return email;
  };

  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.async = true;
    script.onload = () => setIsSdkReady(true);
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
      if (brickInstance.current) {
        brickInstance.current.unmount();
      }
    };
  }, []);

  const handleAuthenticationRequired = () => {
    toast({
      title: '🔐 Autenticação Necessária',
      description: 'Você precisa criar uma conta ou fazer login para continuar.',
      variant: 'destructive'
    });
    router.push('/auth/face');
  };

  const handlePaymentSuccess = async (details: any) => {
    // VERIFICAÇÃO DUPLA DE SEGURANÇA
    if (authStatus !== 'authenticated') {
      console.error('[MercadoPago] Usuário não autenticado durante processamento');
      toast({
        variant: 'destructive',
        title: 'Erro de Autenticação',
        description: 'Sua sessão expirou. Faça login novamente.'
      });
      router.push('/auth/face');
      return;
    }

    const userEmailValue = getUserEmail();
    if (!userEmailValue) {
      console.error('[MercadoPago] Email não encontrado durante processamento');
      toast({
        variant: 'destructive',
        title: 'Erro de Autenticação',
        description: 'Dados de usuário inválidos. Faça login novamente.'
      });
      router.push('/auth/face');
      return;
    }

    setIsProcessing(false);
    toast({
      title: "Pagamento bem-sucedido!",
      description: `O pagamento ${details.id || 'mock_id'} foi concluído.`,
    });
    
    try {
      await fetch('/api/payment-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: details.id || `mock_${Date.now()}`,
          payer: {
            name: customerInfo?.name || `${details.payer?.first_name || ''} ${details.payer?.last_name || ''}`.trim(),
            email: userEmailValue, // Usar email autenticado
          }
        }),
      });
    } catch (e) {
      console.error("Falha ao chamar o webhook interno", e);
    }
    onSuccess(details);
  };
  
  const renderPaymentBrick = async (containerId: string) => {
    // VERIFICAÇÃO DUPLA DE SEGURANÇA
    if (authStatus !== 'authenticated') {
      console.error('[MercadoPago] Tentativa de renderizar brick sem autenticação');
      handleAuthenticationRequired();
      return;
    }

    const userEmailValue = getUserEmail();
    if (!userEmailValue) {
      console.error('[MercadoPago] Email não encontrado para renderizar brick');
      toast({
        variant: 'destructive',
        title: 'Erro de Autenticação',
        description: 'Dados de usuário inválidos. Faça login novamente.'
      });
      router.push('/auth/face');
      return;
    }

    const container = document.getElementById(containerId);
    if (!container || !isSdkReady || !publicKey || disabled || amount <= 0) return;

    if (brickInstance.current) {
        await brickInstance.current.unmount();
        brickInstance.current = null;
    }
    
    const mp = new window.MercadoPago(publicKey, { locale: isBrazil ? 'pt-BR' : 'en-US' });
    setIsProcessing(true);
    
    try {
      const paymentMethodsConfig: any = {
        creditCard: "all",
        debitCard: "all",
        // Pix is handled by a separate flow now
      };
      
      const settings = {
          initialization: {
              amount: amount,
              payer: { 
                firstName: customerInfo?.name?.split(' ')[0] || userEmailValue.split('@')[0],
                lastName: customerInfo?.name?.split(' ').slice(1).join(' ') || userEmailValue.split('@')[0],
                email: userEmailValue, // Usar email autenticado
              },
          },
          customization: {
              paymentMethods: paymentMethodsConfig,
          },
          callbacks: {
              onReady: () => setIsProcessing(false),
              onSubmit: async ({ selectedPaymentMethod, formData }: any) => {
                 console.log("Submitting payment...", { selectedPaymentMethod, formData });
                 const paymentData = { 
                   id: `mock_${Date.now()}`, 
                   status: 'approved', 
                   payer: {
                     first_name: customerInfo?.name?.split(' ')[0] || formData.payer?.firstName || 'Cliente',
                     last_name: customerInfo?.name?.split(' ').slice(1).join(' ') || formData.payer?.lastName || '',
                     email: userEmailValue // Usar email autenticado
                   }
                 };
                 handlePaymentSuccess(paymentData);
              },
              onError: (error: any) => {
                setIsProcessing(false);
                toast({ variant: 'destructive', title: 'Erro no pagamento', description: error.message || "Por favor, tente novamente." });
              },
          },
      };

      const bricksBuilder = mp.bricks();
      brickInstance.current = await bricksBuilder.create("payment", containerId, settings);

    } catch (e) {
      console.error("Erro ao renderizar o Payment Brick: ", e);
      toast({ variant: 'destructive', title: 'Erro ao iniciar pagamento' })
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (isSdkReady && document.getElementById(paymentBrickContainerId)) {
        renderPaymentBrick(paymentBrickContainerId);
    }
  }, [isSdkReady, amount, disabled, customerInfo?.email, customerInfo?.name, publicKey, isBrazil]);

  if (!isSdkReady || !publicKey) {
    return (
      <div className="flex items-center justify-center w-full h-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="ml-2">Carregando pagamentos...</p>
      </div>
    );
  }
  
  return (
    <div className={cn("relative w-full min-h-[400px]")}>
      <div id={paymentBrickContainerId}></div>
       { (disabled || amount <= 0) &&
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 rounded-lg">
              <p className="text-muted-foreground text-sm font-semibold text-center p-4">
                  {amount <= 0 ? "Adicione itens ao carrinho para pagar" : "Preencha seu nome e email para continuar"}
              </p>
          </div>
       }
        {isProcessing && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 rounded-lg">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Processando...</span>
                </div>
            </div>
        )}
    </div>
  );
}
