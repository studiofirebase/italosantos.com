"use client";

import { useState } from "react";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Apple, Fingerprint, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import { GoogleAuthProvider, OAuthProvider, signInWithPopup } from 'firebase/auth';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import EmailCollectionModal from '@/components/email-collection-modal';

interface SignUpTypeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SignUpTypeModal({ isOpen, onClose }: SignUpTypeModalProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState<string | null>(null);
    const [showEmailCollection, setShowEmailCollection] = useState(false);

    const handleEmailCollected = (email: string) => {
        console.log('[SignUp] Email coletado:', email);
        setShowEmailCollection(false);
        toast({
            title: 'Email confirmado!',
            description: 'Agora você tem acesso completo aos recursos de pagamento.'
        });
        onClose();
    };

    if (!isOpen) return null;

    async function signInWithGoogle() {
        try {
            setLoading('google');
            const provider = new GoogleAuthProvider();
            // Solicitar escopos adicionais do Google (OBRIGATÓRIO)
            provider.addScope('email');
            provider.addScope('profile');
            provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
            provider.addScope('https://www.googleapis.com/auth/userinfo.email');

            // Forçar consentimento para garantir coleta de dados
            provider.setCustomParameters({
                prompt: 'consent', // 'consent' força a tela de permissões sempre
                access_type: 'offline',
                include_granted_scopes: 'true'
            });

            const result = await signInWithPopup(auth, provider);

            // Verificar se o email está presente
            const hasEmail = result.user?.email && result.user.email.trim() !== '';
            const hasName = result.user?.displayName && result.user.displayName.trim() !== '';

            if (!hasEmail) {
                console.warn('[SignUp] Email não fornecido pelo Google, solicitando manualmente...');
                // NÃO fazer logout - permitir que o usuário continue autenticado
                // Abrir modal para coletar email
                setShowEmailCollection(true);
                setLoading(null);
                return;
            }

            if (!hasName) {
                console.warn('[SignUp] Nome não fornecido pelo Google, usando email como fallback');
            }

            // Salvar dados no localStorage
            const userEmail = result.user.email!;
            const userName = result.user.displayName || null;

            try {
                localStorage.setItem('isAuthenticated', 'true');
                localStorage.setItem('customerEmail', userEmail);
                if (userName) {
                    localStorage.setItem('customerName', userName);
                }
            } catch { }

            const displayName = userName || userEmail.split('@')[0] || 'usuário';
            toast({
                title: 'Conectado com Google',
                description: `Bem-vindo, ${displayName}!`
            });
            onClose();
        } catch (e: any) {
            let errorMessage = e?.message || 'Erro desconhecido';

            // Tratamento específico de erros comuns
            if (e?.code === 'auth/popup-closed-by-user') {
                errorMessage = 'Você fechou a janela de login';
            } else if (e?.code === 'auth/popup-blocked') {
                errorMessage = 'Permita popups no seu navegador para fazer login com Google';
            } else if (e?.code === 'auth/cancelled-popup-request') {
                errorMessage = 'Outro login já está em andamento';
            }

            toast({ variant: 'destructive', title: 'Falha no login com Google', description: errorMessage });
        } finally {
            setLoading(null);
        }
    }

    async function signInWithApple() {
        try {
            setLoading('apple');
            const provider = new OAuthProvider('apple.com');
            // Solicitar email e nome (OBRIGATÓRIO)
            // IMPORTANTE: Apple só fornece nome na PRIMEIRA autenticação!
            // Se usuário já autenticou antes, nome não virá novamente
            provider.addScope('email');
            provider.addScope('name');

            // Forçar coleta de informações
            provider.setCustomParameters({
                locale: 'pt_BR',
                // Não existe 'prompt' para Apple, mas podemos garantir que email é obrigatório
            });

            const result = await signInWithPopup(auth, provider);

            // Verificar se o email está presente
            const hasEmail = result.user?.email && result.user.email.trim() !== '';
            const hasName = result.user?.displayName && result.user.displayName.trim() !== '';

            if (!hasEmail) {
                console.warn('[SignUp] Email não fornecido pela Apple, solicitando manualmente...');
                // NÃO fazer logout - permitir que o usuário continue autenticado
                // Abrir modal para coletar email
                setShowEmailCollection(true);
                setLoading(null);
                return;
            }

            if (!hasName) {
                console.warn('[SignUp] Nome não fornecido pela Apple (normal se já autenticou antes)');
            }

            // Salvar dados no localStorage
            const userEmail = result.user.email!;
            const userName = result.user.displayName || null;

            try {
                localStorage.setItem('isAuthenticated', 'true');
                localStorage.setItem('customerEmail', userEmail);
                if (userName) {
                    localStorage.setItem('customerName', userName);
                }
            } catch { }

            const displayName = userName || userEmail.split('@')[0] || 'usuário';
            toast({
                title: 'Conectado com Apple',
                description: `Bem-vindo, ${displayName}!`
            });
            onClose();
        } catch (e: any) {
            let errorMessage = e?.message || 'Erro desconhecido';

            // Tratamento específico de erros comuns
            if (e?.code === 'auth/popup-closed-by-user') {
                errorMessage = 'Você fechou a janela de login';
            } else if (e?.code === 'auth/popup-blocked') {
                errorMessage = 'Permita popups no seu navegador para fazer login com Apple';
            } else if (e?.code === 'auth/cancelled-popup-request') {
                errorMessage = 'Outro login já está em andamento';
            } else if (e?.code === 'auth/unauthorized-domain') {
                errorMessage = 'Domínio não autorizado. Configure no Firebase Console';
            }

            toast({ variant: 'destructive', title: 'Falha no login com Apple', description: errorMessage });
        } finally {
            setLoading(null);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[1003] p-4 sm:p-6">
                    <Card className="w-full max-w-[450px] mx-4 shadow-xl border-2 border-primary/50 bg-background">
                        <CardHeader className="text-center pb-6 pt-8 sm:pb-8 sm:pt-10">
                            <CardTitle className="text-2xl sm:text-3xl font-bold text-primary mb-3 sm:mb-4">
                                Como deseja se cadastrar?
                            </CardTitle>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="absolute top-4 right-4 sm:top-6 sm:right-6 h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground hover:text-primary"
                            >
                                <X className="h-5 w-5 sm:h-6 sm:w-6" />
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-6 sm:space-y-8 px-6 sm:px-10 pb-8 sm:pb-10">
                            <div className="space-y-4">
                                <Button onClick={signInWithGoogle} disabled={loading === 'google'} className="w-full h-12 sm:h-14 gap-3 text-base sm:text-lg">
                                    {loading === 'google' ? 'Conectando...' : 'Google'}
                                </Button>
                                <Button onClick={signInWithApple} disabled={loading === 'apple'} variant="secondary" className="w-full h-12 sm:h-14 gap-3 text-base sm:text-lg">
                                    <Apple className="h-5 w-5" />
                                    {loading === 'apple' ? 'Conectando...' : 'Apple'}
                                </Button>
                                <Link href="/auth/face" onClick={onClose} className="block">
                                    <Button variant="outline" className="w-full h-12 sm:h-14 gap-3 text-base sm:text-lg">
                                        <Fingerprint className="h-5 w-5" />
                                        Face ID
                                    </Button>
                                </Link>
                            </div>
                            <div className="text-center text-muted-foreground text-xs sm:text-sm pt-2 border-t border-border">
                                <p>Você pode alterar o método depois nas configurações de perfil.</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </DialogContent>

            {/* Modal de coleta de email */}
            <EmailCollectionModal
                isOpen={showEmailCollection}
                onEmailCollected={handleEmailCollected}
            />
        </Dialog>
    );
}
