
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock, Mail, ShieldCheck, ArrowLeft } from 'lucide-react';
import AdminRegisterModal from '@/components/admin/AdminRegisterModal';
import AdminForgotPasswordModal from '@/components/admin/AdminForgotPasswordModal';

const ADMIN_PASSWORD = "Severe123@";
const ADMIN_EMAIL = "pix@italosantos.com";

interface AdminLoginFormProps {
  onAuthSuccess: () => void;
}

export default function AdminLoginForm({ onAuthSuccess }: AdminLoginFormProps) {
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const [isRegisterOpen, setRegisterOpen] = useState(false);
  const [isForgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  const handleLogin = () => {
    setIsLoggingIn(true);
    setError('');

    console.log('[Admin Login] Tentativa de login:', { email: email.toLowerCase() });

    // Adicionado um pequeno delay para simular uma chamada de rede
    setTimeout(() => {
      if (email.toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        console.log('[Admin Login] Login bem-sucedido');

        toast({ title: "Login bem-sucedido!", description: "Bem-vindo ao painel." });

        // Definir localStorage específico do admin
        localStorage.setItem("adminAuthenticated", "true");
        localStorage.setItem("adminUser", email);

        // Definir cookies específicos do admin
        document.cookie = `isAuthenticated=true; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = `isAdmin=true; path=/; max-age=86400; SameSite=Lax`;

        setIsAuthenticated(true);
        setIsLoggingIn(false);
        onAuthSuccess();
      } else {
        console.log('[Admin Login] Login falhou - credenciais inválidas');
        setError("E-mail ou senha incorretos.");
        toast({ variant: "destructive", title: "Falha na Autenticação" });
        setIsLoggingIn(false);
      }
    }, 500);
  };

  const handleRegisterClick = () => {
    if (isAuthenticated) {
      toast({
        title: "Você já está autenticado",
        description: "Não é necessário criar uma nova conta."
      });
      return;
    }
    setRegisterOpen(true);
  };

  const handleForgotPasswordClick = () => {
    if (isAuthenticated) {
      toast({
        title: "Você já está autenticado",
        description: "Não é necessário recuperar a senha."
      });
      return;
    }
    setForgotPasswordOpen(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center relative">
          <Button variant="ghost" size="icon" className="absolute top-4 left-4 text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={() => router.push('/')}>
            <ArrowLeft />
            <span className="sr-only">Voltar para a página inicial</span>
          </Button>
          <div className="flex justify-center mb-4 pt-8">
            <ShieldCheck className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Acesso Restrito ao Painel</CardTitle>
          <CardDescription>
            Insira suas credenciais de administrador.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="admin@exemplo.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="********"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>

        <CardFooter className="flex-col items-center">
          <Button
            type="button"
            className="w-full"
            onClick={handleLogin}
            disabled={isLoggingIn || !email || !password}
          >
            <Lock className="mr-2 h-4 w-4" />
            {isLoggingIn ? 'Verificando...' : 'Entrar'}
          </Button>
          {!isAuthenticated && (
            <div className="mt-4 text-center text-sm">
              <button
                className="underline hover:text-primary"
                onClick={handleRegisterClick}
              >
                Cadastre-se como admin
              </button>
              <span className="mx-2">/</span>
              <button
                className="underline hover:text-primary"
                onClick={handleForgotPasswordClick}
              >
                Esqueci minha senha
              </button>
            </div>
          )}
        </CardFooter>
      </Card>
      <AdminRegisterModal open={isRegisterOpen && !isAuthenticated} onOpenChange={setRegisterOpen} />
      <AdminForgotPasswordModal open={isForgotPasswordOpen && !isAuthenticated} onOpenChange={setForgotPasswordOpen} />
    </div>
  );
}
