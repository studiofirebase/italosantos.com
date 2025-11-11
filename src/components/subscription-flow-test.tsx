'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Search, Database, User, CreditCard } from 'lucide-react';

interface SubscriptionFlowResult {
  email: string;
  timestamp: string;
  checks: {
    users?: {
      found: boolean;
      data?: any;
      error?: string;
    };
    subscribers?: {
      found: boolean;
      data?: any;
      error?: string;
    };
  };
  finalDecision: {
    isSubscriber: boolean;
    source: string;
    reason: string;
  };
}

export default function SubscriptionFlowTest() {
  const [email, setEmail] = useState('rica@gmail.com');
  const [result, setResult] = useState<SubscriptionFlowResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const testSubscriptionFlow = async () => {
    if (!email.trim()) {
      alert('Digite um email para testar');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/verify-subscription-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });

      const data = await response.json();
      
      if (data.success) {
        setResult(data.data);
        console.log('📊 Resultado completo do teste:', data.data);
      } else {
        alert('❌ Erro: ' + data.message);
      }
    } catch (error) {
      console.error('Erro no teste:', error);
      alert('❌ Erro na verificação. Veja o console.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (found: boolean, isSubscriber?: boolean) => {
    if (isSubscriber === true) {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    } else if (found) {
      return <CheckCircle className="w-4 h-4 text-blue-600" />;
    } else {
      return <XCircle className="w-4 h-4 text-red-600" />;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('pt-BR');
    } catch {
      return dateString;
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Teste do Fluxo de Verificação de Assinatura
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Input de teste */}
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="Digite o email para testar"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1"
          />
          <Button 
            onClick={testSubscriptionFlow}
            disabled={isLoading}
          >
            <Search className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Testar
          </Button>
        </div>

        {result && (
          <div className="space-y-4">
            {/* Decisão Final */}
            <Alert variant={result.finalDecision.isSubscriber ? "default" : "destructive"}>
              <div className="flex items-center gap-2">
                {result.finalDecision.isSubscriber ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription>
                  <strong>Resultado:</strong> {result.finalDecision.isSubscriber ? '✅ É ASSINANTE' : '❌ NÃO É ASSINANTE'}
                  <br />
                  <strong>Fonte:</strong> {result.finalDecision.source}
                  <br />
                  <strong>Motivo:</strong> {result.finalDecision.reason}
                </AlertDescription>
              </div>
            </Alert>

            {/* Verificações detalhadas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Coleção Users */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <h4 className="font-semibold">Coleção &apos;users&apos;</h4>
                    </div>
                    {result.checks.users && getStatusIcon(
                      result.checks.users.found, 
                      result.checks.users.data?.isSubscriber
                    )}
                  </div>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  {result.checks.users?.found ? (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <Badge variant={result.checks.users.data.isSubscriber ? "default" : "secondary"}>
                          {result.checks.users.data.isSubscriber ? "✅ Assinante" : "❌ Não assinante"}
                        </Badge>
                      </div>
                      <div className="text-xs space-y-1 bg-muted p-2 rounded">
                        <div><strong>ID:</strong> {result.checks.users.data.id}</div>
                        <div><strong>Email:</strong> {result.checks.users.data.email}</div>
                        <div><strong>Subscription Status:</strong> {result.checks.users.data.subscriptionStatus || 'N/A'}</div>
                        <div><strong>Tipo:</strong> {result.checks.users.data.subscriptionType || 'N/A'}</div>
                        <div><strong>Início:</strong> {formatDate(result.checks.users.data.subscriptionStartDate)}</div>
                        <div><strong>Fim:</strong> {formatDate(result.checks.users.data.subscriptionEndDate)}</div>
                        <div><strong>Payment ID:</strong> {result.checks.users.data.paymentId || 'N/A'}</div>
                        <div><strong>Último Login:</strong> {formatDate(result.checks.users.data.lastLogin)}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                      <p className="text-red-600">Usuário não encontrado</p>
                      {result.checks.users?.error && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Erro: {result.checks.users.error}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Coleção Subscribers */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      <h4 className="font-semibold">Coleção &apos;subscribers&apos;</h4>
                    </div>
                    {result.checks.subscribers && getStatusIcon(
                      result.checks.subscribers.found,
                      result.checks.subscribers.data?.status === 'active'
                    )}
                  </div>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  {result.checks.subscribers?.found ? (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <Badge variant={result.checks.subscribers.data.status === 'active' ? "default" : "secondary"}>
                          {result.checks.subscribers.data.status === 'active' ? "✅ Ativo" : "❌ Inativo"}
                        </Badge>
                      </div>
                      <div className="text-xs space-y-1 bg-muted p-2 rounded">
                        <div><strong>ID:</strong> {result.checks.subscribers.data.id}</div>
                        <div><strong>Email:</strong> {result.checks.subscribers.data.email}</div>
                        <div><strong>Status:</strong> {result.checks.subscribers.data.status}</div>
                        <div><strong>Método Pagamento:</strong> {result.checks.subscribers.data.paymentMethod}</div>
                        <div><strong>Início:</strong> {formatDate(result.checks.subscribers.data.startDate)}</div>
                        <div><strong>Fim:</strong> {formatDate(result.checks.subscribers.data.endDate)}</div>
                        <div><strong>Valor:</strong> R$ {result.checks.subscribers.data.amount}</div>
                        <div><strong>Duração:</strong> {result.checks.subscribers.data.planDuration} dias</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                      <p className="text-red-600">Assinatura não encontrada</p>
                      {result.checks.subscribers?.error && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Erro: {result.checks.subscribers.error}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Informações adicionais */}
            <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
              <strong>Testado em:</strong> {formatDate(result.timestamp)} | 
              <strong> Email:</strong> {result.email}
            </div>
          </div>
        )}

        {/* Instruções */}
        {!result && (
          <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">📋 Como usar:</h4>
            <ul className="space-y-1">
              <li>1. Digite o email que você quer testar</li>
              <li>2. Clique em &quot;Testar&quot; para verificar no banco de dados</li>
              <li>3. Veja o resultado detalhado de ambas as coleções</li>
              <li>4. A decisão final mostra se o usuário é considerado assinante</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
