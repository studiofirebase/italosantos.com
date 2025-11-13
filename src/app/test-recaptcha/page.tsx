"use client";

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, AlertCircle, Loader2, Shield } from 'lucide-react';
import { useRecaptcha } from '@/hooks/use-recaptcha';

export default function RecaptchaTestPage() {
    const [action, setAction] = useState('LOGIN');
    const [testing, setTesting] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [token, setToken] = useState<string>('');

    const { isReady, executeRecaptcha, error: recaptchaError } = useRecaptcha({ action });

    const testRecaptcha = async () => {
        setTesting(true);
        setResult(null);
        setToken('');

        try {
            // 1. Executar reCAPTCHA no cliente
            console.log('[Test] Executando reCAPTCHA...');
            const recaptchaToken = await executeRecaptcha();

            if (!recaptchaToken) {
                throw new Error('Falha ao gerar token do reCAPTCHA');
            }

            setToken(recaptchaToken);
            console.log('[Test] Token gerado:', recaptchaToken.substring(0, 50) + '...');

            // 2. Verificar token no servidor
            console.log('[Test] Verificando token no servidor...');
            const response = await fetch('/api/recaptcha/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: recaptchaToken,
                    action: action,
                }),
            });

            const data = await response.json();
            console.log('[Test] Resultado da verificação:', data);

            setResult(data);

        } catch (err: any) {
            console.error('[Test] Erro:', err);
            setResult({
                success: false,
                error: err.message || 'Erro desconhecido',
            });
        } finally {
            setTesting(false);
        }
    };

    const getScoreColor = (score: number | null) => {
        if (score === null) return 'text-gray-500';
        if (score >= 0.7) return 'text-green-500';
        if (score >= 0.5) return 'text-yellow-500';
        if (score >= 0.3) return 'text-orange-500';
        return 'text-red-500';
    };

    const getRecommendationBadge = (action: string) => {
        switch (action) {
            case 'allow':
                return <span className="px-2 py-1 bg-green-500/20 text-green-500 rounded text-xs font-semibold">✅ PERMITIR</span>;
            case 'challenge':
                return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-500 rounded text-xs font-semibold">⚠️ DESAFIAR</span>;
            case 'block':
                return <span className="px-2 py-1 bg-red-500/20 text-red-500 rounded text-xs font-semibold">🚫 BLOQUEAR</span>;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen p-8 bg-background">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-2">
                        <Shield className="h-10 w-10 text-primary" />
                        <h1 className="text-4xl font-bold">Teste reCAPTCHA Enterprise</h1>
                    </div>
                    <p className="text-muted-foreground">
                        Teste a integração do Google reCAPTCHA Enterprise
                    </p>
                </div>

                {/* Status do SDK */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {!isReady && <Loader2 className="h-5 w-5 animate-spin" />}
                            {isReady && <CheckCircle className="h-5 w-5 text-green-500" />}
                            {recaptchaError && <XCircle className="h-5 w-5 text-red-500" />}
                            Status do reCAPTCHA SDK
                        </CardTitle>
                        <CardDescription>
                            {!isReady && !recaptchaError && 'Carregando SDK...'}
                            {isReady && 'SDK carregado e pronto ✅'}
                            {recaptchaError && `Erro: ${recaptchaError} ❌`}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold">Site Key:</span>
                                <code className="px-2 py-1 bg-muted rounded text-xs">
                                    {process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '6LchOQosAAAAAJHtFnbWvP4xhePZaVhg4NRd2cEj'}
                                </code>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-semibold">Project ID:</span>
                                <code className="px-2 py-1 bg-muted rounded text-xs">
                                    facepass-afhid
                                </code>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Teste */}
                <Card>
                    <CardHeader>
                        <CardTitle>Executar Teste</CardTitle>
                        <CardDescription>
                            Escolha uma ação e teste a verificação do reCAPTCHA
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="action">Ação</Label>
                            <Input
                                id="action"
                                value={action}
                                onChange={(e) => setAction(e.target.value.toUpperCase())}
                                placeholder="LOGIN, REGISTER, SUBMIT, etc."
                            />
                            <p className="text-xs text-muted-foreground">
                                Exemplos: LOGIN, REGISTER, SUBMIT, CHECKOUT, CONTACT
                            </p>
                        </div>

                        <Button
                            onClick={testRecaptcha}
                            disabled={!isReady || testing}
                            className="w-full"
                        >
                            {testing ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Testando...
                                </>
                            ) : (
                                <>
                                    <Shield className="h-4 w-4 mr-2" />
                                    Testar reCAPTCHA
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Token Gerado */}
                {token && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                                Token Gerado
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="p-2 bg-muted rounded text-xs break-all font-mono">
                                {token}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                ⏱️ Token expira em 2 minutos
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Resultado */}
                {result && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                {result.success && result.valid && <CheckCircle className="h-5 w-5 text-green-500" />}
                                {(!result.success || !result.valid) && <XCircle className="h-5 w-5 text-red-500" />}
                                Resultado da Verificação
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {result.error ? (
                                <div className="p-4 bg-red-500/10 border border-red-500 rounded">
                                    <p className="font-semibold text-red-500">Erro:</p>
                                    <p className="text-sm">{result.error}</p>
                                    {result.details && (
                                        <p className="text-xs text-muted-foreground mt-2">{result.details}</p>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <p className="text-sm font-semibold">Status:</p>
                                            <p className="text-lg">
                                                {result.valid ? (
                                                    <span className="text-green-500">✅ Válido</span>
                                                ) : (
                                                    <span className="text-red-500">❌ Inválido</span>
                                                )}
                                            </p>
                                        </div>

                                        <div className="space-y-1">
                                            <p className="text-sm font-semibold">Ação:</p>
                                            <code className="text-lg">{result.action}</code>
                                        </div>
                                    </div>

                                    {result.score !== null && (
                                        <div className="space-y-2">
                                            <p className="text-sm font-semibold">Pontuação de Risco:</p>
                                            <div className="flex items-center gap-4">
                                                <div className={`text-4xl font-bold ${getScoreColor(result.score)}`}>
                                                    {result.score.toFixed(2)}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="w-full bg-gray-200 rounded-full h-4">
                                                        <div
                                                            className={`h-4 rounded-full transition-all ${result.score >= 0.7 ? 'bg-green-500' :
                                                                    result.score >= 0.5 ? 'bg-yellow-500' :
                                                                        result.score >= 0.3 ? 'bg-orange-500' :
                                                                            'bg-red-500'
                                                                }`}
                                                            style={{ width: `${result.score * 100}%` }}
                                                        />
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        0.0 = Muito suspeito • 1.0 = Muito legítimo
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {result.recommendation && (
                                        <div className="p-4 bg-muted rounded">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-sm font-semibold">Recomendação:</p>
                                                {getRecommendationBadge(result.recommendation.action)}
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {result.recommendation.message}
                                            </p>
                                        </div>
                                    )}

                                    {result.reasons && result.reasons.length > 0 && (
                                        <div>
                                            <p className="text-sm font-semibold mb-2">Motivos:</p>
                                            <ul className="space-y-1">
                                                {result.reasons.map((reason: string, idx: number) => (
                                                    <li key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                                                        <AlertCircle className="h-4 w-4" />
                                                        {reason}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {result.invalidReason && (
                                        <div className="p-4 bg-red-500/10 border border-red-500 rounded">
                                            <p className="text-sm font-semibold text-red-500">Motivo de Invalidação:</p>
                                            <p className="text-sm">{result.invalidReason}</p>
                                        </div>
                                    )}

                                    <div className="pt-4">
                                        <details className="text-xs">
                                            <summary className="cursor-pointer font-semibold">Resposta Completa (JSON)</summary>
                                            <pre className="mt-2 p-2 bg-muted rounded overflow-auto">
                                                {JSON.stringify(result, null, 2)}
                                            </pre>
                                        </details>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Informações */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5" />
                            Interpretação das Pontuações
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-green-500 rounded"></div>
                                <span><strong>0.7 - 1.0:</strong> Muito provavelmente legítimo (PERMITIR)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                                <span><strong>0.5 - 0.7:</strong> Provavelmente legítimo (PERMITIR)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-orange-500 rounded"></div>
                                <span><strong>0.3 - 0.5:</strong> Suspeito (DESAFIAR - 2FA, etc.)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-red-500 rounded"></div>
                                <span><strong>0.0 - 0.3:</strong> Muito suspeito (BLOQUEAR)</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
