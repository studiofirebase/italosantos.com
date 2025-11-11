"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Loader2, CheckCircle, Mail } from "lucide-react";
import { sendAdminPasswordResetEmail } from '@/services/admin-auth-service';

interface AdminForgotPasswordModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function AdminForgotPasswordModal({ open, onOpenChange }: AdminForgotPasswordModalProps) {
    const [email, setEmail] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const { toast } = useToast();

    const handleSendPasswordReset = async () => {
        if (!email) {
            toast({ variant: "destructive", title: "Email necessário", description: "Por favor, insira seu email." });
            return;
        }

        // Validação básica de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            toast({ variant: "destructive", title: "Email inválido", description: "Por favor, insira um email válido." });
            return;
        }

        setIsSending(true);

        try {
            console.log('[Forgot Password Modal] Enviando email de recuperação para:', email);

            await sendAdminPasswordResetEmail(email);

            console.log('[Forgot Password Modal] Email enviado com sucesso');
            setEmailSent(true);

            toast({
                title: "Email enviado!",
                description: "Verifique sua caixa de entrada para redefinir sua senha."
            });

        } catch (error: any) {
            console.error('[Forgot Password Modal] Erro ao enviar email:', {
                code: error.code,
                message: error.message,
                fullError: error
            });

            // Usar mensagem customizada do serviço se disponível
            let errorMessage = error.message || "Não foi possível enviar o email de recuperação.";

            // Fallback para códigos de erro específicos do Firebase
            if (error.code === 'auth/user-not-found') {
                errorMessage = "Nenhuma conta encontrada com este email.";
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = "Email inválido.";
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = "Muitas tentativas. Tente novamente mais tarde.";
            } else if (error.code === 'auth/missing-email') {
                errorMessage = "Email é obrigatório.";
            }

            toast({
                variant: "destructive",
                title: "Erro ao enviar email",
                description: errorMessage
            });
        } finally {
            setIsSending(false);
        }
    };

    const handleClose = () => {
        onOpenChange(false);
        // Resetar estado após fechar
        setTimeout(() => {
            setEmail("");
            setEmailSent(false);
        }, 300);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-sm p-0">
                <Card className="w-full border-0 shadow-none">
                    <CardContent className="pt-6">
                        <div className="flex justify-center mb-4">
                            {emailSent ? (
                                <CheckCircle className="h-10 w-10 text-green-500" />
                            ) : (
                                <ShieldCheck className="h-10 w-10 text-primary" />
                            )}
                        </div>
                        <DialogHeader className="text-center space-y-2 mb-6">
                            <DialogTitle className="text-2xl">Recuperar Senha</DialogTitle>
                            <DialogDescription>
                                {emailSent
                                    ? "Email de recuperação enviado com sucesso!"
                                    : "Insira seu email de administrador para receber o link de recuperação."
                                }
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            {!emailSent ? (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="forgot-email">Email</Label>
                                        <Input
                                            id="forgot-email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="admin@exemplo.com"
                                            disabled={isSending}
                                            onKeyPress={(e) => e.key === 'Enter' && handleSendPasswordReset()}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <Button
                                            className="w-full"
                                            onClick={handleSendPasswordReset}
                                            disabled={isSending || !email}
                                        >
                                            {isSending ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Enviando...
                                                </>
                                            ) : (
                                                <>
                                                    <Mail className="mr-2 h-4 w-4" />
                                                    Enviar Email de Recuperação
                                                </>
                                            )}
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            onClick={handleClose}
                                            disabled={isSending}
                                        >
                                            Cancelar
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-4">
                                    <div className="text-center space-y-2">
                                        <p className="text-sm text-muted-foreground">
                                            Um email foi enviado para <strong>{email}</strong>
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Clique no link do email para redefinir sua senha.
                                        </p>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <Button
                                            className="w-full"
                                            onClick={handleClose}
                                        >
                                            Entendi
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setEmailSent(false);
                                                setEmail("");
                                            }}
                                        >
                                            Enviar para outro email
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </DialogContent>
        </Dialog>
    );
}
