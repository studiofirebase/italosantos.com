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

interface SignUpTypeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SignUpTypeModal({ isOpen, onClose }: SignUpTypeModalProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState<string | null>(null);

    if (!isOpen) return null;

    // Função para gerar email aleatório se não disponível
    function generateRandomEmail(): string {
        const randomId = Math.random().toString(36).substring(2, 10);
        const timestamp = Date.now().toString(36);
        return `user_${randomId}${timestamp}@italosantos.com`;
    }

    // Função para salvar dados do usuário no Firestore
    async function saveUserProfile(userId: string, userData: {
        displayName: string;
        email: string;
        photoURL: string | null;
        provider: string;
    }) {
        try {
            const { getFirestore, doc, setDoc, serverTimestamp } = await import('firebase/firestore');
            const { app } = await import('@/lib/firebase');
            const db = getFirestore(app);

            const userRef = doc(db, 'users', userId);
            await setDoc(userRef, {
                displayName: userData.displayName,
                email: userData.email,
                photoURL: userData.photoURL || '',
                provider: userData.provider,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            }, { merge: true });

            console.log('[SignUp] Perfil salvo no Firestore:', userData);
        } catch (error) {
            console.error('[SignUp] Erro ao salvar perfil:', error);
        }
    }

    async function signInWithGoogle() {
        try {
            setLoading('google');
            const provider = new GoogleAuthProvider();
            // Solicitar escopo de email e profile
            provider.addScope('email');
            provider.addScope('profile');

            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Coletar informações do usuário
            const displayName = user.displayName || user.email?.split('@')[0] || 'Usuário Google';
            const email = user.email || generateRandomEmail();
            const photoURL = user.photoURL;

            console.log('[SignUp Google] Dados coletados:', {
                displayName,
                email,
                photoURL,
                uid: user.uid
            });

            // Salvar perfil no Firestore
            await saveUserProfile(user.uid, {
                displayName,
                email,
                photoURL,
                provider: 'google'
            });

            try { localStorage.setItem('isAuthenticated', 'true'); } catch { }
            
            toast({ 
                title: 'Conectado com Google',
                description: `Bem-vindo, ${displayName}!`
            });
            onClose();
        } catch (e: any) {
            console.error('[SignUp Google] Erro:', e);
            toast({ 
                variant: 'destructive', 
                title: 'Falha no login com Google', 
                description: e?.message || 'Erro desconhecido' 
            });
        } finally {
            setLoading(null);
        }
    }

    async function signInWithApple() {
        try {
            setLoading('apple');
            const provider = new OAuthProvider('apple.com');
            // Solicitar escopo de email e nome
            provider.addScope('email');
            provider.addScope('name');

            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Apple pode não fornecer email na segunda vez que o usuário faz login
            // Então geramos um email se não estiver disponível
            const displayName = user.displayName || user.email?.split('@')[0] || 'Usuário Apple';
            const email = user.email || generateRandomEmail();
            const photoURL = user.photoURL; // Apple geralmente não fornece foto

            console.log('[SignUp Apple] Dados coletados:', {
                displayName,
                email,
                photoURL,
                uid: user.uid
            });

            // Salvar perfil no Firestore
            await saveUserProfile(user.uid, {
                displayName,
                email,
                photoURL,
                provider: 'apple'
            });

            try { localStorage.setItem('isAuthenticated', 'true'); } catch { }
            
            toast({ 
                title: 'Conectado com Apple',
                description: `Bem-vindo, ${displayName}!`
            });
            onClose();
        } catch (e: any) {
            console.error('[SignUp Apple] Erro:', e);
            toast({ 
                variant: 'destructive', 
                title: 'Falha no login com Apple', 
                description: e?.message || 'Erro desconhecido' 
            });
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
        </Dialog>
    );
}
