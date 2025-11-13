"use client";

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function FacebookDiagnosticPage() {
    const [sdkLoaded, setSdkLoaded] = useState<boolean | null>(null);
    const [appId, setAppId] = useState<string>('');
    const [testing, setTesting] = useState(false);
    const [loginResult, setLoginResult] = useState<any>(null);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        // Check if Facebook SDK is loaded
        const checkSDK = () => {
            if (typeof window !== 'undefined' && window.FB) {
                setSdkLoaded(true);
                // Get app ID from SDK
                window.FB.getLoginStatus((response: any) => {
                    console.log('[Diagnostic] Facebook SDK Status:', response);
                });
            } else {
                setSdkLoaded(false);
            }
        };

        // Try immediately
        checkSDK();

        // Try again after 2 seconds
        const timer = setTimeout(checkSDK, 2000);

        return () => clearTimeout(timer);
    }, []);

    const testLogin = async () => {
        setTesting(true);
        setError('');
        setLoginResult(null);

        try {
            if (!window.FB) {
                throw new Error('Facebook SDK não carregado');
            }

            window.FB.login(
                (response: any) => {
                    console.log('[Diagnostic] Login Response:', response);
                    setLoginResult(response);

                    if (response.status === 'connected') {
                        // Get user data
                        window.FB.api(
                            '/me',
                            { fields: 'id,name,email,picture' },
                            (userResponse: any) => {
                                console.log('[Diagnostic] User Data:', userResponse);
                                setLoginResult((prev: any) => ({
                                    ...prev,
                                    userData: userResponse
                                }));
                            }
                        );
                    }
                    setTesting(false);
                },
                {
                    scope: 'email,public_profile',
                    return_scopes: true
                }
            );
        } catch (err: any) {
            console.error('[Diagnostic] Error:', err);
            setError(err.message);
            setTesting(false);
        }
    };

    return (
        <div className="min-h-screen p-8 bg-background">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-bold">Diagnóstico Facebook SDK</h1>
                    <p className="text-muted-foreground">
                        Verifique se o Facebook SDK está configurado corretamente
                    </p>
                </div>

                {/* SDK Status */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {sdkLoaded === null && <Loader2 className="h-5 w-5 animate-spin" />}
                            {sdkLoaded === true && <CheckCircle className="h-5 w-5 text-green-500" />}
                            {sdkLoaded === false && <XCircle className="h-5 w-5 text-red-500" />}
                            Status do Facebook SDK
                        </CardTitle>
                        <CardDescription>
                            {sdkLoaded === null && 'Verificando...'}
                            {sdkLoaded === true && 'SDK carregado com sucesso ✅'}
                            {sdkLoaded === false && 'SDK não encontrado ❌'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold">window.FB:</span>
                                <code className="px-2 py-1 bg-muted rounded text-sm">
                                    {typeof window !== 'undefined' && window.FB ? 'Object' : 'undefined'}
                                </code>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-semibold">App ID:</span>
                                <code className="px-2 py-1 bg-muted rounded text-sm">
                                    {process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '1029313609296207'}
                                </code>
                            </div>
                        </div>

                        {sdkLoaded === false && (
                            <div className="p-4 bg-red-500/10 border border-red-500 rounded-lg">
                                <h3 className="font-semibold text-red-500 mb-2">Possíveis Causas:</h3>
                                <ul className="text-sm space-y-1 text-muted-foreground">
                                    <li>• Bloqueador de anúncios ativo</li>
                                    <li>• Falha ao carregar https://connect.facebook.net/en_US/sdk.js</li>
                                    <li>• Erro de rede ou CORS</li>
                                </ul>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Test Login */}
                {sdkLoaded && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Testar Login</CardTitle>
                            <CardDescription>
                                Clique no botão para abrir popup de login do Facebook
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Button
                                onClick={testLogin}
                                disabled={testing}
                                className="w-full"
                            >
                                {testing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Testando...
                                    </>
                                ) : (
                                    'Testar Login com Facebook'
                                )}
                            </Button>

                            {error && (
                                <div className="p-4 bg-red-500/10 border border-red-500 rounded-lg">
                                    <p className="font-semibold text-red-500">Erro:</p>
                                    <p className="text-sm text-muted-foreground">{error}</p>
                                </div>
                            )}

                            {loginResult && (
                                <div className="space-y-2">
                                    <div className="p-4 bg-green-500/10 border border-green-500 rounded-lg">
                                        <h3 className="font-semibold text-green-500 mb-2">
                                            Resposta do Login:
                                        </h3>
                                        <pre className="text-xs overflow-auto p-2 bg-muted rounded">
                                            {JSON.stringify(loginResult, null, 2)}
                                        </pre>
                                    </div>

                                    {loginResult.status === 'connected' && (
                                        <div className="p-4 bg-blue-500/10 border border-blue-500 rounded-lg">
                                            <p className="text-sm text-muted-foreground">
                                                ✅ Login bem-sucedido! Access Token obtido.
                                            </p>
                                        </div>
                                    )}

                                    {loginResult.status !== 'connected' && (
                                        <div className="p-4 bg-yellow-500/10 border border-yellow-500 rounded-lg">
                                            <p className="text-sm text-muted-foreground">
                                                ⚠️ Login não autorizado ou cancelado pelo usuário.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Console Logs */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5" />
                            Console do Navegador
                        </CardTitle>
                        <CardDescription>
                            Abra o console (F12) para ver logs detalhados
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Procure por mensagens como:
                        </p>
                        <ul className="text-xs space-y-1 mt-2 font-mono">
                            <li>• [Layout] Facebook SDK inicializado com sucesso</li>
                            <li>• [Layout] Facebook SDK script carregado</li>
                            <li>• [Diagnostic] Facebook SDK Status</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
