"use client";

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { KeyRound, Loader2, Fingerprint } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { useFaceIDAuth } from '@/contexts/face-id-auth-context';
import { useAuth } from '@/contexts/AuthProvider';
import { useRouter } from 'next/navigation';
import { useProfileConfig } from '@/hooks/use-profile-config';
import { useSubscriptionSettings } from '@/hooks/use-subscription-settings';
import { InstagramCallbackHandler } from '@/components/InstagramCallbackHandler';

// Split below-the-fold sections to reduce initial JS
const FeatureMarquee = dynamic(() => import('@/components/feature-marquee'), { ssr: false, loading: () => <div style={{ height: 96 }} /> });
const AboutSection = dynamic(() => import('@/components/about-section'), { ssr: false, loading: () => <div style={{ height: 200 }} /> });
const GallerySection = dynamic(() => import('@/components/gallery/gallery-section'), { ssr: false, loading: () => <div style={{ height: 240 }} /> });
const LocationMap = dynamic(() => import('@/components/location-map'), { ssr: false, loading: () => <div style={{ height: 240 }} /> });
const ReviewsFormSection = dynamic(() => import('@/components/reviews/reviews-form-section'), { ssr: false, loading: () => <div style={{ height: 200 }} /> });

// Split payment modals and optional UI
const PixPaymentModal = dynamic(() => import('@/components/pix-payment-modal'), { ssr: false });
const GPayPaymentModal = dynamic(() => import('@/components/gpay-payment-modal'), { ssr: false });
const ApplePayPaymentModal = dynamic(() => import('@/components/applepay-payment-modal'), { ssr: false });
const LoginTypeModal = dynamic(() => import('@/components/login-type-modal'), { ssr: false });
const PayPalV6Buttons = dynamic(() => import('@/components/paypal-v6-buttons'), { ssr: false, loading: () => <div className="w-full h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div> });
// Use relative import to avoid occasional path alias resolution glitches during typecheck
type SignUpTypeModalProps = { isOpen: boolean; onClose: () => void };
const SignUpTypeModal = dynamic<SignUpTypeModalProps>(
    () => import('../components/signup-type-modal'),
    { ssr: false }
);

export default function Home() {
    const { toast } = useToast();
    const router = useRouter();
    const { isAuthenticated, userEmail } = useFaceIDAuth();
    const { user: firebaseUser, userProfile } = useAuth();
    const { coverPhoto, settings: profileSettings, loading: profileLoading } = useProfileConfig();
    const { pixValue: adminPixValue, loading: subscriptionLoading, refreshSettings } = useSubscriptionSettings();

    const [paymentInfo, setPaymentInfo] = useState(() => {
        return {
            value: '99.00',
            currency: 'BRL',
            symbol: 'R$'
        };
    });
    const [isLoadingCurrency, setIsLoadingCurrency] = useState(true);
    const [userCurrency, setUserCurrency] = useState<string>('BRL');

    // DETECÇÃO DE MOEDA DESABILITADA - SEMPRE BRL
    /* 
    // Detectar moeda do usuário baseada na localização
    useEffect(() => {
        const detectUserCurrency = () => {
            try {
                const locale = navigator.language || 'pt-BR';
                const currencyMap: Record<string, string> = {
                    'en-US': 'USD',
                    'en-GB': 'GBP', 
                    'pt-BR': 'BRL',
                    'es': 'EUR',
                    'fr': 'EUR',
                    'de': 'EUR',
                    'it': 'EUR'
                };
                
                const detectedCurrency = currencyMap[locale] || 'BRL';
                setUserCurrency(detectedCurrency);
            } catch (error) {
                setUserCurrency('BRL');
            }
        };
        
        detectUserCurrency();
    }, []);
    */
    const [isPixModalOpen, setIsPixModalOpen] = useState(false);
    const [isGPayModalOpen, setIsGPayModalOpen] = useState(false);
    const [isLoginTypeModalOpen, setIsLoginTypeModalOpen] = useState(false);
    const [isSignUpTypeModalOpen, setIsSignUpTypeModalOpen] = useState(false);
    const [isApplePayModalOpen, setIsApplePayModalOpen] = useState(false);

    const [simulatedMethod, setSimulatedMethod] = useState<'pix' | 'google' | 'apple' | null>(null);
    const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');

    // VERIFICAÇÃO RIGOROSA DE AUTENTICAÇÃO
    useEffect(() => {
        const checkAuthentication = () => {




            // Verificar múltiplas fontes de autenticação
            const localStorage_auth = localStorage.getItem('isAuthenticated') === 'true';
            const sessionStorage_auth = sessionStorage.getItem('isAuthenticated') === 'true';
            const context_auth = isAuthenticated;
            const hasUserEmail = userEmail && userEmail.trim() !== '';
            const hasUserProfile = userProfile && userProfile.email;
            const hasFirebaseUser = firebaseUser && firebaseUser.email;

            // CRITÉRIOS RIGOROSOS: deve estar autenticado E ter email válido
            const isAuthenticatedAnywhere = localStorage_auth || sessionStorage_auth || context_auth || hasFirebaseUser;
            const hasValidEmail = hasUserEmail || hasUserProfile || hasFirebaseUser;



            if (isAuthenticatedAnywhere) {

                setAuthStatus('authenticated');
                return;
            }


            setAuthStatus('unauthenticated');
        };

        // Verificar imediatamente
        checkAuthentication();

        // Verificar periodicamente a cada 3 segundos
        const authInterval = setInterval(checkAuthentication, 3000);

        return () => clearInterval(authInterval);
    }, [isAuthenticated, userEmail, userProfile, firebaseUser, router, toast]);

    // CONVERSÃO DE MOEDA DESABILITADA - SEMPRE MOSTRAR EM BRL
    useEffect(() => {
        // Aguardar até que as configurações sejam carregadas E o valor seja válido
        if (subscriptionLoading || adminPixValue <= 0) {
            return;
        }

        // SEMPRE usar BRL sem conversão
        setPaymentInfo({
            value: adminPixValue.toFixed(2),
            currency: 'BRL',
            symbol: 'R$'
        });
        setIsLoadingCurrency(false);

        /* CONVERSÃO DE MOEDA COMENTADA
        // Se a moeda do usuário for BRL, não precisa converter
        if (userCurrency === 'BRL') {
            setPaymentInfo({
                value: adminPixValue.toFixed(2),
                currency: 'BRL',
                symbol: 'R$'
            });
            setIsLoadingCurrency(false);
            return;
        }
        
        setIsLoadingCurrency(true);
        
        try {
            // Usar o valor do admin como base para conversão
            const response = await fetch('/api/genkit/convertCurrency', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    targetCurrency: userCurrency,
                    baseAmount: adminPixValue // Usar valor do admin como base
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                setPaymentInfo({
                    value: data.convertedAmount.toFixed(2),
                    currency: data.targetCurrency,
                    symbol: data.currencySymbol
                });
            } else {
                setPaymentInfo({
                    value: adminPixValue.toFixed(2),
                    currency: 'BRL',
                    symbol: 'R$'
                });
            }
        } catch (error) {
            setPaymentInfo({
                value: adminPixValue.toFixed(2),
                currency: 'BRL',
                symbol: 'R$'
            });
        }
        
        setIsLoadingCurrency(false);
        */
    }, [adminPixValue, subscriptionLoading]);



    const handlePaymentSuccess = async (paymentDetails?: any) => {

        toast({ title: 'Pagamento bem-sucedido!', description: 'Seja bem-vindo(a) ao conteúdo exclusivo!' });

        // Salvar localmente para compatibilidade
        localStorage.setItem('hasPaid', 'true');
        localStorage.setItem('hasSubscription', 'true');
        localStorage.setItem('userType', 'vip');
        localStorage.setItem('subscriptionDate', new Date().toISOString());


        // ✅ SIMPLIFICADO: Usar API de subscription diretamente
        if (paymentDetails) {
            try {
                const response = await fetch('/api/subscription', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'createSubscription',
                        customerEmail: paymentDetails.email || 'unknown@example.com',
                        paymentId: paymentDetails.id || `payment_${Date.now()}`
                    }),
                });

                if (response.ok) {

                } else {

                }
            } catch (error) {

                // Não bloquear o fluxo se der erro ao salvar
            }
        }


        router.push('/assinante');
    };

    // Função para abrir o modal simulando o método
    const openPaymentModal = (method: 'pix') => {
        if (authStatus !== 'authenticated') {
            toast({
                variant: "destructive",
                title: "Login Necessário",
                description: "Faça login com Google, Apple ou Face ID para usar o Pix e assinar.",
            });
            return;
        }
        setSimulatedMethod(method);
        setIsPixModalOpen(true);
    };

    // Ajusta os handlers dos botões
    const handleGooglePayClick = () => {
        if (authStatus !== 'authenticated') {
            toast({
                variant: "destructive",
                title: "Login Necessário",
                description: "Faça login com Google, Apple ou Face ID para usar o Google Pay e assinar.",
            });
            return;
        }
        setIsGPayModalOpen(true);
    };

    const handleApplePayClick = () => {
        if (authStatus !== 'authenticated') {
            toast({
                variant: "destructive",
                title: "Login Necessário",
                description: "Faça login com Google, Apple ou Face ID para usar o Apple Pay e assinar.",
            });
            return;
        }
        setIsApplePayModalOpen(true);
    };

    const handlePayPalClick = () => {
        if (authStatus !== 'authenticated') {
            toast({
                variant: "destructive",
                title: "Login Necessário",
                description: "Faça login com Google, Apple ou Face ID para pagar com PayPal.",
            });
            return;
        }
    };


    return (
        <>
            <div
                className="relative w-full h-[35vh] sm:h-[40vh] md:h-[50vh] flex items-center justify-center"
            >
                <Image
                    src={coverPhoto || "https://placehold.co/1200x400.png"}
                    alt="Background"
                    layout="fill"
                    objectFit="cover"
                    className="opacity-80"
                    data-ai-hint="male model"
                    priority
                    onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                        console.log('🖼️ Erro ao carregar imagem de capa, usando fallback');
                        e.currentTarget.src = "https://placehold.co/1200x400.png";
                    }}
                />
                <h1
                    className="font-bold text-white z-10 px-2 sm:px-4 text-center leading-tight"
                    style={{
                        // Aumentar ~30% o tamanho
                        fontSize: 'clamp(2.6rem, 10.4vw, 10.4rem)',
                        fontFamily: '"Times New Roman", Times, serif',
                        WebkitTextStroke: '1px rgba(0,0,0,0.6)',
                        // Removido container/neon ao redor: deixar apenas o texto
                        textShadow: 'none',
                        filter: 'none',
                        minHeight: '4rem'
                    }}
                >
                    {profileLoading ? (
                        <span style={{ visibility: 'hidden' }}>Italo Santos</span>
                    ) : (
                        profileSettings?.name || 'Italo Santos'
                    )}
                </h1>
            </div>

            <main className="flex-grow flex flex-col items-center w-full">
                <div className="relative z-10 flex flex-col items-center justify-center flex-1 w-full max-w-4xl mx-auto px-3 sm:px-4">

                    <div className="w-full max-w-[320px] sm:max-w-md flex flex-col items-center gap-y-3 sm:gap-y-4 pt-6 sm:pt-8 md:pt-14">
                        <Button
                            className="w-full h-14 sm:h-16 md:h-18 text-base sm:text-lg md:text-xl bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center transform scale-110 sm:scale-115 md:scale-120 shadow-neon-white hover:shadow-neon-red-strong transition-all duration-300"
                            onClick={() => setIsSignUpTypeModalOpen(true)}
                        >
                            <div className="flex flex-col items-center justify-center">
                                <div className="flex items-center">
                                    <Fingerprint className="mr-2 h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />
                                    <span>Cadastre-se</span>
                                </div>
                                <span className="text-xs font-normal" style={{ marginTop: '-4px' }}>Google • Apple • Face ID</span>
                            </div>
                        </Button>

                        <div className="flex items-center justify-center w-full max-w-md mt-3 sm:mt-4 md:mt-6 gap-x-1 sm:gap-x-2 md:gap-x-4">
                            <button
                                className="flex-1 cursor-pointer bg-transparent border-none p-0 transition-transform hover:scale-105"
                                onClick={handleGooglePayClick}
                                aria-label="Pagar com Google Pay"
                            >
                                <Image
                                    src="/google-pay.png"
                                    alt="Google Pay"
                                    width={242}
                                    height={98}
                                    className="w-full h-auto object-contain max-h-[110px] sm:max-h-[130px] md:max-h-[150px]"
                                />
                            </button>
                            <div className="flex flex-col items-center justify-center px-1 w-[50px] sm:w-[60px] md:w-[70px]">
                                <button
                                    className="w-full transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center"
                                    onClick={() => openPaymentModal('pix')}
                                    aria-label="Pagar com PIX"
                                    disabled={isLoadingCurrency}
                                >
                                    <Image
                                        src="/pix.png"
                                        alt="PIX"
                                        width={55}
                                        height={98}
                                        className="w-full h-auto object-contain max-h-[150px] sm:max-h-[170px] md:max-h-[190px]"
                                    />
                                    <span className="text-[7px] sm:text-[8px] md:text-[10px] text-primary mt-1 text-nowrap">PIX</span>
                                </button>
                            </div>
                            <button
                                className="flex-1 bg-transparent border-none p-0 transition-transform hover:scale-105 active:scale-95"
                                onClick={handleApplePayClick}
                                aria-label="Pagar com Apple Pay"
                            >
                                <Image
                                    src="/apple-pay.png"
                                    alt="Apple Pay"
                                    width={242}
                                    height={98}
                                    className="w-full h-auto object-contain max-h-[110px] sm:max-h-[130px] md:max-h-[150px]"
                                />
                            </button>
                        </div>

                        <div className="text-center py-3 sm:py-4 min-h-[70px] sm:min-h-[80px] md:min-h-[100px] flex flex-col items-center justify-center">
                            <p className="text-sm sm:text-base md:text-lg">Assinatura Mensal</p>
                            {isLoadingCurrency ? (
                                <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 mx-auto animate-spin text-white" />
                            ) : (
                                <p className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-none">
                                    {paymentInfo.value.split('.')[0]}
                                    <span className="text-2xl sm:text-3xl md:text-4xl align-top">.{paymentInfo.value.split('.')[1]}</span>
                                    <span className="text-lg sm:text-xl md:text-2xl font-normal align-top ml-1">{paymentInfo.symbol}</span>
                                </p>
                            )}
                            <div className="w-full mt-3 sm:mt-4">
                                {authStatus === 'checking' ? (
                                    <div className="w-full h-14 sm:h-16 md:h-20 bg-muted rounded-lg flex items-center justify-center border border-primary/20">
                                        <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 animate-spin text-primary" />
                                        <span className="ml-2 text-muted-foreground text-xs sm:text-sm md:text-base">Verificando...</span>
                                    </div>
                                ) : authStatus === 'authenticated' ? (
                                    <div className="w-full">
                                        <PayPalV6Buttons
                                            amount={parseFloat(paymentInfo.value)}
                                            currency={paymentInfo.currency}
                                            description="Assinatura Mensal Premium"
                                            isSubscription={true}
                                            onSuccess={handlePaymentSuccess}
                                            onError={(error) => {
                                                console.error('[Payment Error]', error);
                                                toast({
                                                    variant: 'destructive',
                                                    title: 'Erro no Pagamento',
                                                    description: 'Não foi possível processar o pagamento. Tente novamente.',
                                                });
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <div className="w-full">
                                        <PayPalV6Buttons
                                            onApprove={(data: any, actions: any) => {
                                                console.log('Pagamento aprovado:', data);
                                                toast({
                                                    title: 'Pagamento Aprovado!',
                                                    description: 'Sua assinatura foi ativada com sucesso.',
                                                });
                                            }}
                                            onError={(err: any) => {
                                                console.error('Erro no pagamento:', err);
                                                toast({
                                                    variant: 'destructive',
                                                    title: 'Erro no Pagamento',
                                                    description: 'Não foi possível processar o pagamento. Tente novamente.',
                                                });
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Selo de Segurança */}
                        <div className="flex items-center justify-center gap-x-3 sm:gap-x-4 py-3 sm:py-4 md:py-6 px-4 sm:px-6 md:px-8 bg-card border border-primary/30 rounded-lg shadow-neon-white hover:shadow-neon-red-strong transition-all duration-300">
                            <Image src="/shield.svg" alt="Escudo de segurança" width={64} height={64} className="h-10 w-10 sm:h-12 sm:w-12 md:h-16 md:w-16" />
                            <div className="text-center">
                                <p className="text-xs sm:text-sm md:text-base font-semibold text-primary">100% Seguro & Protegido</p>
                                <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">SSL Certificado • Dados Criptografados</p>
                            </div>
                        </div>

                        {/* Botão Entrar */}
                        <div className="w-full max-w-[280px] sm:max-w-sm mt-4">
                            <Button
                                onClick={() => setIsLoginTypeModalOpen(true)}
                                className="w-full h-12 sm:h-14 md:h-16 text-base sm:text-lg md:text-xl bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center transform scale-110 sm:scale-115 md:scale-120 shadow-neon-white hover:shadow-neon-red-strong transition-all duration-300"
                            >
                                <KeyRound className="mr-2 h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />
                                Entrar
                            </Button>
                        </div>


                    </div>
                </div>

                <FeatureMarquee />
                <AboutSection />
                <GallerySection />
                <LocationMap />
                <ReviewsFormSection />
            </main>

            <PixPaymentModal
                isOpen={isPixModalOpen}
                onOpenChange={setIsPixModalOpen}
                amount={parseFloat(paymentInfo.value)}
                onPaymentSuccess={handlePaymentSuccess}
                paymentMethod={simulatedMethod || 'pix'}
                currency={paymentInfo.currency}
                originalAmountBRL={adminPixValue}
            />
            <GPayPaymentModal
                isOpen={isGPayModalOpen}
                onOpenChange={setIsGPayModalOpen}
                amount={parseFloat(paymentInfo.value)}
                currency={paymentInfo.currency}
                symbol={paymentInfo.symbol}
                onPaymentSuccess={handlePaymentSuccess}
            />
            <LoginTypeModal
                isOpen={isLoginTypeModalOpen}
                onClose={() => setIsLoginTypeModalOpen(false)}
            />
            <SignUpTypeModal
                isOpen={isSignUpTypeModalOpen}
                onClose={() => setIsSignUpTypeModalOpen(false)}
            />
            <ApplePayPaymentModal
                isOpen={isApplePayModalOpen}
                onOpenChange={setIsApplePayModalOpen}
                amount={parseFloat(paymentInfo.value)}
                currency={paymentInfo.currency}
                symbol={paymentInfo.symbol}
                onPaymentSuccess={handlePaymentSuccess}
            />

            {/* Handler para Instagram OAuth callback */}
            <InstagramCallbackHandler />

        </>
    );

}
