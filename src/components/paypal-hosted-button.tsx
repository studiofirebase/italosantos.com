"use client";

import { forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { Loader2, CreditCard, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useFaceIDAuth } from '@/contexts/face-id-auth-context';
import { useAuth } from '@/contexts/AuthProvider';
import { useRouter } from 'next/navigation';
import { clearAuthData, checkForResidualData } from '@/lib/auth-cleanup';

interface PayPalHostedButtonProps {
    onPaymentSuccess: () => void;
    amount?: string;
    currency?: string;
    description?: string;
    className?: string;
}

interface PayPalHostedButtonRef {
    triggerPayment: () => void;
}

const PayPalButtonWrapper = ({ 
    onPaymentSuccess, 
    amount = "10.00", 
    currency = "BRL", 
    description = "Pagamento" 
}: PayPalHostedButtonProps) => {
    const [{ isPending, isRejected }] = usePayPalScriptReducer();
    const { toast } = useToast();
    const router = useRouter();
    const { isAuthenticated, userEmail } = useFaceIDAuth();
    const { user: firebaseUser, userProfile } = useAuth();
    const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');

    // VERIFICAÇÃO RIGOROSA DE AUTENTICAÇÃO
    useEffect(() => {
        const checkAuthentication = () => {
            console.log('🔒 [PayPal Hosted] Verificando autenticação...');
            
            // Verificar se há dados residuais suspeitos
            const residualData = checkForResidualData();
            
            // Verificar múltiplas fontes de autenticação
            const localStorage_auth = localStorage.getItem('isAuthenticated') === 'true';
            const sessionStorage_auth = sessionStorage.getItem('isAuthenticated') === 'true';
            const context_auth = isAuthenticated;
            const hasUserEmail = userEmail && userEmail.trim() !== '';
            const hasUserProfile = userProfile && userProfile.email;
            const hasFirebaseUser = firebaseUser && firebaseUser.email;
            
            console.log('🔍 [PayPal Hosted] Status de autenticação:', {
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
                console.log('🚨 [PayPal Hosted] Dados suspeitos encontrados! Limpando...');
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
                console.log('🚫 [PayPal Hosted] Usuário não autenticado ou sem email válido');
                setAuthStatus('unauthenticated');
                return;
            }
            
            console.log('✅ [PayPal Hosted] Usuário autenticado e autorizado');
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
            console.log('⚠️ [PayPal Hosted] Email inválido encontrado');
            return '';
        }
        
        return email;
    };

    const handleAuthenticationRequired = () => {
        toast({
            title: '🔐 Autenticação Necessária',
            description: 'Você precisa criar uma conta ou fazer login para continuar.',
            variant: 'destructive'
        });
        router.push('/auth/face');
    };

    // Se está verificando autenticação, mostrar loading
    if (authStatus === 'checking') {
        return (
            <div className="flex items-center justify-center p-4 min-h-[50px]">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <span className="ml-2 text-blue-600">Verificando autenticação...</span>
            </div>
        );
    }

    // Se não está autenticado, mostrar botão de login
    if (authStatus === 'unauthenticated') {
        return (
            <Button
                onClick={handleAuthenticationRequired}
                className="w-full h-[50px] bg-red-600 hover:bg-red-700 text-white"
            >
                <AlertTriangle className="h-4 w-4 mr-2" />
                🔐 Faça Login para Assinar com PayPal
            </Button>
        );
    }

    if (isPending) {
        return (
            <div className="flex items-center justify-center p-4 min-h-[50px]">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <span className="ml-2 text-blue-600">Carregando PayPal...</span>
            </div>
        );
    }

    if (isRejected) {
        return (
            <div className="flex items-center justify-center p-4 min-h-[50px] text-red-500">
                ⚠️ Erro ao carregar PayPal
            </div>
        );
    }

    return (
        <PayPalButtons
            style={{
                layout: "vertical",
                color: "blue",
                shape: "rect",
                label: "paypal",
                height: 50,
                tagline: false,
            }}
            createOrder={async (data, actions) => {
                // VERIFICAÇÃO DUPLA DE SEGURANÇA
                if (authStatus !== 'authenticated') {
                    console.error('[PayPal Hosted] Usuário não autenticado durante createOrder');
                    handleAuthenticationRequired();
                    throw new Error('Usuário não autenticado');
                }

                const userEmailValue = getUserEmail();
                if (!userEmailValue) {
                    console.error('[PayPal Hosted] Email não encontrado durante createOrder');
                    handleAuthenticationRequired();
                    throw new Error('Email do usuário é obrigatório');
                }

                try {
                    const response = await fetch('/api/paypal/create-order', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            amount: amount,
                            currency: currency,
                            description: description,
                            buyerEmail: userEmailValue, // Usar email autenticado
                        }),
                    });

                    const result = await response.json();
                    
                    if (result.success) {
                        return result.orderId;
                    } else {
                        throw new Error(result.error || 'Erro ao criar pedido');
                    }
                } catch (error) {
                    console.error('Erro ao criar pedido:', error);
                    throw error;
                }
            }}
            onApprove={async (data, actions) => {
                // VERIFICAÇÃO DUPLA DE SEGURANÇA
                if (authStatus !== 'authenticated') {
                    console.error('[PayPal Hosted] Usuário não autenticado durante onApprove');
                    handleAuthenticationRequired();
                    return;
                }

                const userEmailValue = getUserEmail();
                if (!userEmailValue) {
                    console.error('[PayPal Hosted] Email não encontrado durante onApprove');
                    handleAuthenticationRequired();
                    return;
                }

                try {
                    // Capturar o pagamento usando nossa API
                    const response = await fetch('/api/paypal/capture-order', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            orderId: data.orderID,
                            buyerEmail: userEmailValue, // Usar email autenticado
                        }),
                    });

                    const result = await response.json();
                    
                    if (result.success) {
                        console.log("PayPal payment completed:", result);
                        
                        toast({
                            title: "✅ Pagamento PayPal Aprovado!",
                            description: `Transação: ${result.paymentId}`,
                            duration: 5000,
                        });
                        
                        onPaymentSuccess();
                    } else {
                        throw new Error(result.error || 'Erro ao capturar pagamento');
                    }
                } catch (error) {
                    console.error("Erro ao capturar pagamento:", error);
                    toast({
                        variant: "destructive",
                        title: "❌ Erro no Pagamento",
                        description: "Não foi possível processar o pagamento.",
                    });
                }
            }}
            onError={(err) => {
                console.error("PayPal error:", err);
                toast({
                    variant: "destructive",
                    title: "❌ Erro do PayPal",
                    description: "Ocorreu um erro durante o processamento.",
                });
            }}
            onCancel={() => {
                toast({
                    title: "⚠️ Pagamento Cancelado",
                    description: "O pagamento foi cancelado pelo usuário.",
                });
            }}
        />
    );
};

const PayPalHostedButton = forwardRef<PayPalHostedButtonRef, PayPalHostedButtonProps>(({ 
    onPaymentSuccess, 
    amount = "10.00", 
    currency = "BRL", 
    description = "Pagamento",
    className 
}, ref) => {
    const [showPayPal, setShowPayPal] = useState(false);
    
    useImperativeHandle(ref, () => ({
        triggerPayment: () => {
            setShowPayPal(true);
        }
    }));

    const paypalOptions = {
        clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
        currency: currency,
        intent: "capture",
        components: "buttons",
        "enable-funding": "paylater,venmo",
        "disable-funding": "card,credit",
        // Forçar ambiente de teste
        "data-client-id": process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
        "data-env": "sandbox",
    };

    if (!showPayPal) {
        return (
            <Button
                onClick={() => setShowPayPal(true)}
                className={cn("w-full bg-[#0070ba] hover:bg-[#005ea6] text-white", className)}
            >
                <CreditCard className="w-4 h-4 mr-2" />
                Pagar com PayPal
            </Button>
        );
    }

    return (
        <div className={cn("w-full", className)}>
            <PayPalScriptProvider options={paypalOptions}>
                <PayPalButtonWrapper
                    onPaymentSuccess={onPaymentSuccess}
                    amount={amount}
                    currency={currency}
                    description={description}
                />
            </PayPalScriptProvider>
        </div>
    );
});

PayPalHostedButton.displayName = "PayPalHostedButton";

export default PayPalHostedButton;
export type { PayPalHostedButtonProps, PayPalHostedButtonRef };
