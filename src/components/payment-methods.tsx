'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Smartphone, QrCode, Wallet, Check, Loader2, User, Lock, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import PaymentButtons from '@/components/payment-buttons';
import PixPaymentModal from '@/components/pix-payment-modal';
import PayPalHostedButton from '@/components/paypal-hosted-button';
import GooglePayButton from '@/components/google-pay-button';
import { useFaceIDAuth } from '@/contexts/face-id-auth-context';
import { useAuth } from '@/contexts/AuthProvider';
import { checkUserAuthentication, showAuthError } from '@/utils/auth-check';
import { setSecureAuth } from '@/utils/secure-auth-system';
import { useRouter } from 'next/navigation';
import { clearAuthData, checkForResidualData } from '@/lib/auth-cleanup';

interface PaymentMethodsProps {
  selectedPlan: {
    id: string;
    name: string;
    price: number;
    duration: number;
    features: string[];
    popular?: boolean;
    currency?: string;
    symbol?: string;
  };
  onPaymentSuccess: () => void;
  isBrazil?: boolean;
  originalPriceBRL?: number;
}

export default function PaymentMethods({ selectedPlan, onPaymentSuccess, isBrazil = true, originalPriceBRL = 99.00 }: PaymentMethodsProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { isAuthenticated, userEmail, userType } = useFaceIDAuth();
  const { user: firebaseUser, userProfile } = useAuth();
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string>('mercadopago');
  const [isProcessing, setIsProcessing] = useState(false);
  const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');

  // VERIFICAÇÃO SIMPLIFICADA DE AUTENTICAÇÃO
  useEffect(() => {
    const checkAuthentication = () => {
      const authResult = checkUserAuthentication(isAuthenticated, userEmail, userProfile, firebaseUser);
      
      if (authResult.isValid) {
        setAuthStatus('authenticated');
      } else {
        setAuthStatus('unauthenticated');
      }
    };

    // Verificar com pequeno delay para permitir carregamento dos contextos
    const timer = setTimeout(checkAuthentication, 200);
    return () => clearTimeout(timer);
  }, [isAuthenticated, userEmail, userProfile, firebaseUser]);

  // PIX agora disponível globalmente - não há mais restrição por país
  useEffect(() => {
    // Método de pagamento padrão
    if (!selectedMethod) {
      setSelectedMethod('mercadopago');
    }
  }, [selectedMethod]);

  // Função para redirecionar para login/registro
  const handleAuthenticationRequired = () => {
    toast({
      title: '🔐 Autenticação Necessária',
      description: 'Você precisa criar uma conta ou fazer login para continuar.',
      variant: 'destructive'
    });
    router.push('/auth/face');
  };

  // Métodos de pagamento disponíveis para todos os países
  const paymentMethods = [
    {
      id: 'mercadopago',
      name: 'Cartão de Crédito/Débito',
      description: 'Visa, Mastercard, Elo via MercadoPago',
      icon: <CreditCard className="h-6 w-6" />,
      color: 'bg-blue-500',
      popular: true
    },
    {
      id: 'pix',
      name: 'PIX',
      description: isBrazil ? 'Pagamento instantâneo - Aprovação imediata' : 'Pagamento instantâneo brasileiro - Disponível globalmente',
      icon: <QrCode className="h-6 w-6" />,
      color: 'bg-green-500',
      instant: true
    },
    {
      id: 'paypal',
      name: 'PayPal',
      description: 'Pagamento internacional seguro',
      icon: <Wallet className="h-6 w-6" />,
      color: 'bg-blue-600'
    },
    {
      id: 'googlepay',
      name: 'Google Pay',
      description: 'Pagamento rápido e seguro com Google',
      icon: <Smartphone className="h-6 w-6" />,
      color: 'bg-gray-900',
      instant: true
    }
  ];

  const handlePixPayment = () => {
    // VERIFICAÇÃO DUPLA DE SEGURANÇA
    if (authStatus !== 'authenticated') {
      handleAuthenticationRequired();
      return;
    }
    // PIX sempre usa o valor original em BRL para evitar discrepâncias
    setIsPixModalOpen(true);
  };

  const handlePayPalSuccess = () => {
    // Ativar assinatura segura imediatamente
    const email = userEmail || firebaseUser?.email || userProfile?.email;
    if (email) {
      setSecureAuth(email, true, 'member');
    }

    toast({
      title: '✅ Pagamento PayPal Aprovado!',
      description: 'Sua assinatura foi ativada com sucesso.',
    });
    onPaymentSuccess();
  };

  const handleGooglePaySuccess = () => {
    // Ativar assinatura segura imediatamente
    const email = userEmail || firebaseUser?.email || userProfile?.email;
    if (email) {
      setSecureAuth(email, true, 'member');
    }

    toast({
      title: '✅ Pagamento Google Pay Aprovado!',
      description: 'Sua assinatura foi ativada com sucesso.',
    });
    onPaymentSuccess();
  };

  const handleMercadoPagoPayment = async () => {
    // VERIFICAÇÃO DUPLA DE SEGURANÇA
    if (authStatus !== 'authenticated') {
      handleAuthenticationRequired();
      return;
    }

    setIsProcessing(true);
    try {
      // Lógica do MercadoPago aqui
      toast({
        title: '🔄 Processando pagamento...',
        description: 'Redirecionando para MercadoPago...',
      });
    } catch (error) {
      toast({
        title: '❌ Erro no pagamento',
        description: 'Tente novamente ou escolha outro método.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Se está verificando autenticação, mostrar loading
  if (authStatus === 'checking') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando autenticação...</p>
        </CardContent>
      </Card>
    );
  }

  // Se o usuário não está autenticado, mostrar tela de autenticação
  if (authStatus === 'unauthenticated') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-xl text-red-600">Acesso Negado</CardTitle>
          <p className="text-sm text-muted-foreground">
            Para realizar o pagamento, você precisa criar uma conta ou fazer login.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-semibold text-red-800 mb-2">🔒 Segurança Obrigatória</h4>
            <ul className="text-sm text-red-700 space-y-1">
              <li>• Todos os métodos de pagamento requerem autenticação</li>
              <li>• Acesso seguro ao conteúdo VIP</li>
              <li>• Histórico de pagamentos protegido</li>
              <li>• Suporte personalizado</li>
            </ul>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={() => router.push('/auth/face?tab=signup')}
              className="w-full"
              variant="outline"
            >
              <User className="w-4 h-4 mr-2" />
              Criar Conta
            </Button>
            <Button 
              onClick={() => router.push('/auth/face?tab=signin')}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              <Lock className="w-4 h-4 mr-2" />
              Fazer Login
            </Button>
          </div>
          
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Já tem uma conta? 
              <button 
                onClick={() => router.push('/auth/face?tab=signin')}
                className="text-red-600 hover:underline ml-1"
              >
                Faça login aqui
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status de Autenticação */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center">
          <Check className="h-5 w-5 text-green-600 mr-2" />
          <div>
            <h4 className="font-semibold text-green-800">Conta Verificada</h4>
            <p className="text-sm text-green-700">
              Logado como: {userEmail || 'Usuário'}
            </p>
          </div>
        </div>
      </div>

      {/* Métodos de Pagamento */}
      <div className="grid gap-4">
        {paymentMethods.map((method) => (
          <Card 
            key={method.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedMethod === method.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedMethod(method.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${method.color} text-white`}>
                    {method.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold flex items-center">
                      {method.name}
                      {method.popular && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          Popular
                        </Badge>
                      )}
                      {method.instant && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          Instantâneo
                        </Badge>
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {method.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {selectedMethod === method.id && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Botão de Pagamento */}
      <div className="space-y-4">
        <Button
          onClick={() => {
            switch (selectedMethod) {
              case 'pix':
                handlePixPayment();
                break;
              case 'paypal':
                // PayPal será renderizado abaixo
                break;
              case 'googlepay':
                // Google Pay será renderizado abaixo
                break;
              case 'mercadopago':
                handleMercadoPagoPayment();
                break;
            }
          }}
          disabled={isProcessing}
          className="w-full h-12 text-lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              Pagar {selectedPlan.symbol || 'R$'} {selectedPlan.price}
            </>
          )}
        </Button>

        {/* Renderizar componentes específicos */}
        {selectedMethod === 'paypal' && (
          <PayPalHostedButton
            amount={selectedPlan.price.toString()}
            currency={selectedPlan.currency || 'BRL'}
            onPaymentSuccess={handlePayPalSuccess}
          />
        )}

        {selectedMethod === 'googlepay' && (
          <GooglePayButton
            amount={selectedPlan.price}
            currency={selectedPlan.currency || 'BRL'}
            onSuccess={handleGooglePaySuccess}
          />
        )}
      </div>

      {/* Modal PIX */}
      <PixPaymentModal
        isOpen={isPixModalOpen}
        onOpenChange={setIsPixModalOpen}
        amount={originalPriceBRL || selectedPlan.price}
        onPaymentSuccess={onPaymentSuccess}
        paymentMethod="pix"
      />
    </div>
  );
}
