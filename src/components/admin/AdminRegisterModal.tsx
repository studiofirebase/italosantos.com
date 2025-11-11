"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Loader2 } from "lucide-react";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, PhoneAuthProvider, linkWithCredential, EmailAuthProvider, sendEmailVerification, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { ensureAdminDoc } from "@/services/admin-auth-service";

interface AdminRegisterModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function AdminRegisterModal({ open, onOpenChange }: AdminRegisterModalProps) {
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [phoneOtp, setPhoneOtp] = useState("");
    const [email, setEmail] = useState("");
    const [emailOtp, setEmailOtp] = useState("");
    const [password, setPassword] = useState("");
    const [step, setStep] = useState<"form" | "verify-phone" | "verify-email" | "done">("form");
    const [saving, setSaving] = useState(false);
    const [verificationId, setVerificationId] = useState("");
    const { toast } = useToast();

    const handleSendPhoneOtp = async () => {
        if (!phone.trim() || !name.trim()) {
            toast({ variant: "destructive", title: "Campos obrigatórios", description: "Preencha nome e telefone." });
            return;
        }

        setSaving(true);
        try {
            const auth = getAuth();
            const formattedPhone = phone.startsWith('+') ? phone : `+55${phone.replace(/\D/g, '')}`;

            // @ts-ignore
            if (!window.recaptchaVerifier) {
                // @ts-ignore
                window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container-admin', {
                    size: 'invisible',
                });
            }

            // @ts-ignore
            const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, window.recaptchaVerifier);
            setVerificationId(confirmationResult.verificationId);
            setStep("verify-phone");
            toast({ title: "OTP enviado!", description: "Verifique seu telefone." });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Erro ao enviar OTP", description: error.message });
        } finally {
            setSaving(false);
        }
    };

    const handleVerifyPhone = async () => {
        if (!phoneOtp.trim()) {
            toast({ variant: "destructive", title: "OTP obrigatório" });
            return;
        }

        setSaving(true);
        try {
            const auth = getAuth();
            const credential = PhoneAuthProvider.credential(verificationId, phoneOtp);
            await linkWithCredential(auth.currentUser!, credential);

            setStep("verify-email");
            toast({ title: "Telefone verificado!", description: "Agora preencha o e-mail." });
        } catch (error: any) {
            toast({ variant: "destructive", title: "OTP inválido", description: error.message });
        } finally {
            setSaving(false);
        }
    };

    const handleSendEmailOtp = async () => {
        if (!email.trim() || !password.trim()) {
            toast({ variant: "destructive", title: "Campos obrigatórios", description: "Preencha e-mail e senha." });
            return;
        }

        setSaving(true);
        try {
            const auth = getAuth();
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, { displayName: name });
            await sendEmailVerification(userCredential.user);

            toast({ title: "E-mail de verificação enviado!", description: "Verifique sua caixa de entrada." });

            // Finalizar cadastro
            await ensureAdminDoc(userCredential.user, name);
            setStep("done");
            toast({ title: "Cadastro concluído!", description: "Você já pode fazer login." });

            setTimeout(() => {
                onOpenChange(false);
                // Resetar form
                setName("");
                setPhone("");
                setPhoneOtp("");
                setEmail("");
                setEmailOtp("");
                setPassword("");
                setStep("form");
            }, 2000);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Erro no cadastro", description: error.message });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm p-0">
                <Card className="w-full border-0 shadow-none">
                    <CardContent className="pt-6">
                        <div className="flex justify-center mb-4">
                            <ShieldCheck className="h-10 w-10 text-primary" />
                        </div>
                        <DialogHeader className="text-center space-y-2 mb-6">
                            <DialogTitle className="text-2xl">Cadastro de Administrador</DialogTitle>
                            <DialogDescription>
                                Preencha os campos abaixo para criar sua conta de admin.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            {step === "form" && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="admin-name">Nome</Label>
                                        <Input
                                            id="admin-name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Seu nome completo"
                                            disabled={saving}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="admin-phone">Telefone</Label>
                                        <Input
                                            id="admin-phone"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="+5511999999999"
                                            disabled={saving}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="admin-email">E-mail</Label>
                                        <Input
                                            id="admin-email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="admin@exemplo.com"
                                            disabled={saving}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="admin-password">Senha</Label>
                                        <Input
                                            id="admin-password"
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="********"
                                            disabled={saving}
                                        />
                                    </div>

                                    <div id="recaptcha-container-admin"></div>

                                    <div className="flex flex-col gap-2 pt-2">
                                        <Button
                                            className="w-full"
                                            onClick={handleSendPhoneOtp}
                                            disabled={saving || !name || !phone || !email || !password}
                                        >
                                            {saving ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Enviando...
                                                </>
                                            ) : (
                                                'Enviar OTP (Telefone)'
                                            )}
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            onClick={() => onOpenChange(false)}
                                            disabled={saving}
                                        >
                                            Cancelar
                                        </Button>
                                    </div>
                                </>
                            )}

                            {step === "verify-phone" && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone-otp">Código OTP (Telefone)</Label>
                                        <Input
                                            id="phone-otp"
                                            value={phoneOtp}
                                            onChange={(e) => setPhoneOtp(e.target.value)}
                                            placeholder="123456"
                                            maxLength={6}
                                            disabled={saving}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <Button
                                            className="w-full"
                                            onClick={handleVerifyPhone}
                                            disabled={saving || !phoneOtp}
                                        >
                                            {saving ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Verificando...
                                                </>
                                            ) : (
                                                'Verificar Telefone'
                                            )}
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            onClick={() => onOpenChange(false)}
                                            disabled={saving}
                                        >
                                            Cancelar
                                        </Button>
                                    </div>
                                </>
                            )}

                            {step === "verify-email" && (
                                <>
                                    <div className="text-center space-y-2">
                                        <p className="text-sm text-muted-foreground">
                                            Finalizando cadastro e enviando verificação de e-mail...
                                        </p>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <Button
                                            className="w-full"
                                            onClick={handleSendEmailOtp}
                                            disabled={saving}
                                        >
                                            {saving ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Criando conta...
                                                </>
                                            ) : (
                                                'Criar Conta e Enviar E-mail'
                                            )}
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            onClick={() => onOpenChange(false)}
                                            disabled={saving}
                                        >
                                            Cancelar
                                        </Button>
                                    </div>
                                </>
                            )}

                            {step === "done" && (
                                <div className="text-center space-y-4">
                                    <div className="flex justify-center">
                                        <ShieldCheck className="h-16 w-16 text-green-500" />
                                    </div>
                                    <p className="text-lg font-semibold">Cadastro Concluído!</p>
                                    <p className="text-sm text-muted-foreground">
                                        Verifique seu e-mail e faça login.
                                    </p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </DialogContent>
        </Dialog>
    );
}
