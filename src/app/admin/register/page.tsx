
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, ArrowLeft, User } from 'lucide-react';
import FaceIDSetup from '@/components/face-id-setup';
import AdminDualFirebaseUi from '@/components/admin/AdminDualFirebaseUi';
import { ensureAdminDoc } from '@/services/admin-auth-service';
import { getAuth } from 'firebase/auth';

export default function AdminRegisterPage() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  const handleDualComplete = async () => {
    try {
      if (!name.trim()) {
        throw new Error('Informe seu nome antes de continuar.');
      }
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('Usuário não autenticado após verificação.');
      if (!user.emailVerified) throw new Error('E-mail não verificado.');
      if (!user.phoneNumber) throw new Error('Telefone não vinculado.');

      await ensureAdminDoc(user, name);
      toast({ title: 'Verificação concluída!', description: 'Continue para o cadastro facial.' });
      setStep(2);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Falha ao concluir verificação', description: e?.message || 'Erro desconhecido' });
    }
  };

  const handleRegistrationSuccess = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('Usuário não autenticado.');
      await ensureAdminDoc(user, name);
      toast({ title: "Cadastro de administrador concluído!", description: "Você será redirecionado para o painel de administração." });
      router.push('/admin');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao finalizar cadastro", description: error.message || "Tente novamente mais tarde." });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center relative">
          <Button variant="ghost" size="icon" className="absolute top-4 left-4" onClick={() => router.push('/admin')}>
            <ArrowLeft />
          </Button>
          <div className="flex justify-center mb-4 pt-8">
            <ShieldCheck className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Cadastro de Administrador</CardTitle>
          <CardDescription>
            {step === 1 ? "Preencha seus dados para se cadastrar." : "Realize o cadastro facial para continuar."}
          </CardDescription>
        </CardHeader>

        {step === 1 && (
          <>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name"><User className="inline-block mr-2 h-4 w-4" />Nome</Label>
                <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome completo" />
              </div>

              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Para se cadastrar como administrador, complete os dois passos do FirebaseUI:</p>
                <ol className="list-decimal text-sm pl-4 space-y-1 text-muted-foreground">
                  <li>Criar conta com Email e verificar o e-mail</li>
                  <li>Vincular número de telefone via SMS</li>
                </ol>
              </div>

              <AdminDualFirebaseUi onComplete={handleDualComplete} />
            </CardContent>
          </>
        )}

        {step === 2 && (
          <CardContent>
            <FaceIDSetup onRegistrationSuccess={handleRegistrationSuccess} userEmail={(typeof window !== 'undefined' ? (getAuth().currentUser?.email || '') : '')} />
          </CardContent>
        )}
      </Card>
    </div>
  );
}
