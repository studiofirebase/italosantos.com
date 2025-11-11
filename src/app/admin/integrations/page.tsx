
"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import IntegrationCard from "./components/IntegrationCard";
import PayPalLoginButton from "@/components/auth/PayPalLoginButton";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

// Importar os ícones
import { FacebookIcon } from '@/components/icons/FacebookIcon';
import { InstagramIcon } from '@/components/icons/InstagramIcon';
import { TwitterIcon } from '@/components/icons/TwitterIcon';
import { PayPalIcon } from '@/components/icons/PayPalIcon';
import { MercadoPagoIcon } from '@/components/icons/MercadoPagoIcon';
// Removidos os cards de demo/cadastro (FirebaseUI/Phone/AuthDemo) — agora o cadastro acontece via modal
// import FirebaseAuthDemo from "@/components/admin/FirebaseAuthDemo";
// import FirebasePhoneAuthWidget from "@/components/admin/FirebasePhoneAuthWidget";
// import FirebaseUiDemo from "@/components/admin/FirebaseUiDemo";
import { getEndpoint, openOAuthWindow, postLogout } from "@/lib/integrations";

type Integration = 'twitter' | 'instagram' | 'facebook' | 'paypal' | 'mercadopago';

export default function AdminIntegrationsPage() {
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<Record<string, boolean>>({
    twitter: false,
    instagram: false,
    facebook: false,
    paypal: false,
    mercadopago: false,
  });
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({
    twitter: true,
    instagram: true,
    facebook: true,
    paypal: true,
    mercadopago: true,
  });

  // (Twitter agora usa signInWithPopup direto; não há mais carregamento de FirebaseUI por CDN aqui)

  useEffect(() => {
    async function fetchAllStatus() {
      const services: Integration[] = ['twitter', 'instagram', 'facebook', 'paypal', 'mercadopago'];
      try {
        const res = await fetch(`/api/admin/integrations/status?services=${services.join(',')}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const status = data.status || {};
        const newIntegrationsState: Record<string, boolean> = { ...integrations };
        const newLoadingState: Record<string, boolean> = { ...isLoading };
        services.forEach((s) => {
          const v = status[s];
          if (typeof v === 'object' && v !== null) newIntegrationsState[s] = !!v.connected;
          else newIntegrationsState[s] = !!v;
          newLoadingState[s] = false;
        });
        setIntegrations(newIntegrationsState);
        setIsLoading(newLoadingState);
      } catch (e) {
        console.error('Status fetch failed', e);
        const newLoadingState: Record<string, boolean> = { ...isLoading };
        (['twitter', 'instagram', 'facebook', 'paypal', 'mercadopago'] as const).forEach(s => newLoadingState[s] = false);
        setIsLoading(newLoadingState);
      }
    }
    fetchAllStatus();
  }, []);

  const handleConnect = (platform: Integration) => {
    setIsLoading(prev => ({ ...prev, [platform]: true }));
    if (platform === 'twitter') {
      (async () => {
        try {
          const { getAuth, TwitterAuthProvider, signInWithPopup } = await import('firebase/auth');
          const { app } = await import('@/lib/firebase');
          const auth = getAuth(app);
          const provider = new TwitterAuthProvider();
          const result = await signInWithPopup(auth, provider);
          setIntegrations(prev => ({ ...prev, twitter: true }));
          try {
            const username = (result as any)?.additionalUserInfo?.username
              || (result as any)?.additionalUserInfo?.profile?.screen_name;
            if (username) {
              localStorage.setItem('twitter_username', username);
              toast({ title: 'Nome de usuário salvo!', description: `O feed de vídeos agora usará @${username}.` });
            }
          } catch { }
          setIsLoading(prev => ({ ...prev, twitter: false }));
        } catch (e: any) {
          toast({ variant: 'destructive', title: 'Falha ao conectar com Twitter', description: e?.message || 'Popup bloqueado ou configuração inválida.' });
          setIsLoading(prev => ({ ...prev, twitter: false }));
        }
      })();
      return;
    }

    // Fluxo padrão (Facebook, Instagram, PayPal, Mercado Pago): abrir janela OAuth no Cloud Run
    const w = openOAuthWindow(platform as any);
    if (!w) {
      toast({ variant: 'destructive', title: 'Popup bloqueado', description: 'Permita popups para conectar sua conta.' });
      setIsLoading(prev => ({ ...prev, [platform]: false }));
      return;
    }

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data || {};
      if (!data.platform || data.platform !== platform) return;

      if (data.success === '1' || data.success === true || data.connected === '1' || data.connected === true) {
        toast({
          title: "Conexão realizada com sucesso!",
          description: `${platform.charAt(0).toUpperCase() + platform.slice(1)} foi conectado à sua conta.`,
        });
        setIntegrations(prev => ({ ...prev, [platform]: true, ...(platform === 'instagram' && { facebook: true }) }));
      } else {
        const err = data.error || 'Falha na autenticação.';
        toast({ variant: 'destructive', title: 'Erro na conexão', description: String(err) });
      }
      setIsLoading(prev => ({ ...prev, [platform]: false }));
      window.removeEventListener('message', onMessage);
    };
    window.addEventListener('message', onMessage);
    // Timeout de segurança para não manter loading infinito caso o popup não retorne
    const tid = window.setTimeout(() => {
      window.removeEventListener('message', onMessage);
      setIsLoading(prev => ({ ...prev, [platform]: false }));
    }, 120000);
    // Best-effort: limpar timeout quando receber mensagem
    const cleanupOnMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data || {};
      if (!data.platform || data.platform !== platform) return;
      window.clearTimeout(tid);
      window.removeEventListener('message', cleanupOnMessage);
    };
    window.addEventListener('message', cleanupOnMessage);
  };

  const handleFacebookConnect = () => {
    setIsLoading(prev => ({ ...prev, facebook: true }));

    // @ts-ignore
    window.FB.login(function (response) {
      if (response.authResponse) {
        toast({ title: "Conectado com sucesso!", description: "Sua conta do Facebook foi conectada." });
        setIntegrations(prev => ({ ...prev, facebook: true }));
      } else {
        toast({ variant: 'destructive', title: "Falha no Login", description: "O login com o Facebook foi cancelado ou falhou." });
      }
      setIsLoading(prev => ({ ...prev, facebook: false }));
    }, { scope: 'public_profile,email' });
  };

  const handleDisconnect = async (platform: Integration) => {
    setIsLoading(prev => ({ ...prev, [platform]: true }));
    try {
      const res = await fetch('/api/admin/integrations/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setIntegrations(prev => ({ ...prev, [platform]: false, ...(platform === 'instagram' && { facebook: false }) }));
        toast({ title: "Desconectado com sucesso", description: result.message });

        if (platform === 'twitter') {
          localStorage.removeItem('twitter_username');
          try { await postLogout('twitter'); } catch { }
        }
        if (platform === 'facebook') {
          // @ts-ignore
          window.FB.logout();
          try { await postLogout('facebook'); } catch { }
        }
        if (platform === 'instagram') { try { await postLogout('instagram'); } catch { } }
        if (platform === 'mercadopago') { try { await postLogout('mercadopago'); } catch { } }
        if (platform === 'paypal') { try { await postLogout('paypal'); } catch { } }
      } else {
        toast({ variant: 'destructive', title: "Falha ao desconectar", description: result.message });
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: "Erro no servidor", description: error.message });
    } finally {
      setIsLoading(prev => ({ ...prev, [platform]: false }));
    }
  };

  const handleSyncFeed = async (platform: 'instagram' | 'facebook') => {
    setIsLoading(prev => ({ ...prev, [platform]: true }));
    try {
      const response = await fetch(`/api/admin/${platform}-feed`);
      const result = await response.json();
      if (result.success) {
        toast({ title: "Sincronização Concluída", description: result.message });
      } else {
        toast({ variant: 'destructive', title: "Falha na Sincronização", description: result.message });
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: "Erro de Rede", description: "Não foi possível conectar ao servidor para sincronizar o feed." });
    } finally {
      setIsLoading(prev => ({ ...prev, [platform]: false }));
    }
  };

  const integrationData = [
    {
      platform: 'mercadopago',
      title: 'Mercado Pago',
      description: 'Conecte sua conta para receber pagamentos via Pix e outros métodos.',
      icon: <MercadoPagoIcon />,
    },
    {
      platform: 'instagram',
      title: 'Instagram',
      description: 'Exibir galeria de fotos e posts recentes.',
      icon: <InstagramIcon />,
      onSync: () => handleSyncFeed('instagram'),
    },
    {
      platform: 'twitter',
      title: 'Twitter / X',
      description: 'Exibir feed de fotos recentes.',
      icon: <TwitterIcon />,
    },
  ];

  return (
    <>
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Integrações de Plataformas</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {/* Card do Facebook separado */}
        <IntegrationCard
          platform="facebook"
          title="Facebook"
          description="Exibir galeria de fotos e posts recentes."
          icon={<FacebookIcon />}
          isConnected={integrations.facebook}
          isLoading={isLoading.facebook}
          onConnect={handleFacebookConnect}
          onDisconnect={() => handleDisconnect('facebook')}
          onSync={() => handleSyncFeed('facebook')}
          syncing={isLoading.facebook}
        />

        {/* Card do PayPal separado */}
        <Card className="w-full max-w-sm">
          <CardHeader>
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 flex items-center justify-center rounded-lg">
                <PayPalIcon />
              </div>
              <div>
                <CardTitle>PayPal</CardTitle>
                <CardDescription>Conecte sua conta para receber pagamentos na loja.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col space-y-2">
            <PayPalLoginButton
              isConnected={integrations.paypal}
              isLoading={isLoading.paypal}
              onConnect={() => handleConnect('paypal' as any)}
              onDisconnect={() => handleDisconnect('paypal' as any)}
            />
          </CardContent>
        </Card>

        {integrationData.map((data) => (
          <IntegrationCard
            key={data.platform}
            platform={data.platform}
            title={data.title}
            description={data.description}
            icon={data.icon}
            isConnected={integrations[data.platform]}
            isLoading={isLoading[data.platform]}
            onConnect={() => handleConnect(data.platform as Integration)}
            onDisconnect={() => handleDisconnect(data.platform as Integration)}
            onSync={data.onSync}
            syncing={isLoading[data.platform]}
          />
        ))}

        {/* Cards de cadastro (Auth Demo / Phone / FirebaseUI) removidos: fluxo foi movido para o modal de cadastro do admin */}
      </div>

      {/* Fluxo de Twitter via FirebaseUI Web executa em container oculto; nenhuma alteração visual aqui. */}
    </>
  );
}
