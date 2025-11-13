
"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "next/navigation";
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
import { metaSDK } from "@/services/meta-sdk-integration";
import { getAuth } from "firebase/auth";
import { app } from "@/lib/firebase";

type Integration = 'twitter' | 'instagram' | 'facebook' | 'paypal' | 'mercadopago';

export default function AdminIntegrationsPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
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
  const [showTwitterSettings, setShowTwitterSettings] = useState(false);

  // Função auxiliar para atualizar isLoading com segurança
  const updateIsLoading = (platform: string, value: boolean) => {
    setIsLoading(prev => {
      if (!prev) return { [platform]: value };
      return { ...prev, [platform]: value };
    });
  };

  // Conectar Facebook via popup do SDK da Meta
  const handleFacebookConnect = async () => {
    updateIsLoading('facebook', true);

    try {
      console.log('[Facebook] Iniciando login via popup...');

      // Obter perfil via popup
      const profile = await metaSDK.loginWithFacebook();
      console.log('[Facebook] Perfil coletado:', profile);

      // Obter usuário atual autenticado no Firebase
      const auth = getAuth(app);
      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error('Usuário não autenticado. Faça login primeiro.');
      }

      // Salvar perfil no Firestore
      const response = await fetch('/api/admin/meta/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.uid,
          profile: profile,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erro ao salvar perfil');
      }

      setIntegrations(prev => ({ ...prev, facebook: true }));

      toast({
        title: "Facebook conectado!",
        description: `Bem-vindo, ${profile.name}! Seus dados foram salvos.`,
      });

    } catch (error) {
      console.error('[Facebook] Erro:', error);
      toast({
        variant: 'destructive',
        title: "Erro ao conectar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
      });
    } finally {
      updateIsLoading('facebook', false);
    }
  };

  // Conectar Instagram via OAuth Flow (Instagram Business Login)
  const handleInstagramConnect = async () => {
    updateIsLoading('instagram', true);

    try {
      console.log('[Instagram] Iniciando Instagram Business Login (OAuth)...');

      // Primeiro fazer login com Facebook SDK
      await metaSDK.initialize();
      
      console.log('[Instagram] Verificando status de login do Facebook...');
      const loginStatus = await metaSDK.getLoginStatus();

      let accessToken: string;

      if (loginStatus.status === 'connected' && loginStatus.authResponse) {
        console.log('[Instagram] Já está logado no Facebook, usando token existente');
        accessToken = loginStatus.authResponse.accessToken;
      } else {
        console.log('[Instagram] Não está logado, abrindo popup de login do Facebook...');
        
        // Fazer login via Facebook SDK com scopes necessários
        const facebookProfile = await metaSDK.loginWithFacebook();
        console.log('[Instagram] Login do Facebook concluído:', facebookProfile);

        // Pegar o novo token
        const newStatus = await metaSDK.getLoginStatus();
        if (!newStatus.authResponse) {
          throw new Error('Não foi possível obter access token do Facebook');
        }
        accessToken = newStatus.authResponse.accessToken;
      }

      console.log('[Instagram] Access token obtido, salvando e redirecionando...');

      // Salvar token no sessionStorage para usar no callback
      sessionStorage.setItem('fb_access_token', accessToken);

      // Gerar state para CSRF protection
      const state = Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem('instagram_oauth_state', state);

      // Obter URL de autorização oficial do Instagram
      const authUrl = metaSDK.getInstagramAuthUrl(state);

      console.log('[Instagram] Redirecionando para autorização oficial:', authUrl);

      // Redirecionar para autorização do Instagram
      window.location.href = authUrl;

    } catch (error) {
      console.error('[Instagram] Erro:', error);
      toast({
        variant: 'destructive',
        title: "Erro ao conectar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
      });
      updateIsLoading('instagram', false);
    }
  };

  // Verificar autenticação do Twitter ao carregar
  useEffect(() => {
    const checkTwitterAuth = async () => {
      try {
        const { getAuth } = await import('firebase/auth');
        const { app } = await import('@/lib/firebase');
        const auth = getAuth(app);

        // Verificar se há usuário autenticado
        const unsubscribe = auth.onAuthStateChanged((user) => {
          if (user) {
            // Usuário autenticado, verificar se tem username salvo
            const savedUsername = localStorage.getItem('twitter_username') || sessionStorage.getItem('twitter_username');
            if (savedUsername) {
              setIntegrations(prev => ({ ...prev, twitter: true }));
              localStorage.setItem('twitter_connected', 'true');
            }
          }
        });

        return unsubscribe;
      } catch (error) {
        console.warn('Erro ao verificar autenticação do Twitter:', error);
      }
    };

    checkTwitterAuth();
  }, []);

  // Verificar se retornou do OAuth do Instagram
  useEffect(() => {
    const instagramSuccess = searchParams.get('instagram_success');
    const instagramUsername = searchParams.get('username');
    const instagramError = searchParams.get('instagram_error');

    if (instagramSuccess === 'true') {
      toast({
        title: "Instagram conectado!",
        description: `Conta @${instagramUsername} conectada com sucesso! ✅`,
      });

      // Atualizar estado
      setIntegrations(prev => ({ ...prev, instagram: true }));

      // Limpar URL
      window.history.replaceState({}, '', '/admin/integrations');
    }

    if (instagramError) {
      toast({
        variant: 'destructive',
        title: "Erro ao conectar Instagram",
        description: decodeURIComponent(instagramError),
      });

      // Limpar URL
      window.history.replaceState({}, '', '/admin/integrations');
    }
  }, [searchParams, toast]);

  useEffect(() => {
    async function fetchAllStatus() {
      console.log('🔍 [ADMIN] Verificando status de integrações...');
      const services: Integration[] = ['twitter', 'instagram', 'facebook', 'paypal', 'mercadopago'];
      try {
        const res = await fetch(`/api/admin/integrations/status?services=${services.join(',')}`);
        console.log('📡 [ADMIN] Resposta status:', res.status);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        console.log('📦 [ADMIN] Status recebido:', data);
        const status = data.status || {};
        const newIntegrationsState: Record<string, boolean> = { ...integrations };
        const newLoadingState: Record<string, boolean> = { ...isLoading };
        services.forEach((s) => {
          const v = status[s];
          if (typeof v === 'object' && v !== null) newIntegrationsState[s] = !!v.connected;
          else newIntegrationsState[s] = !!v;
          newLoadingState[s] = false;
          console.log(`🔍 [ADMIN] ${s}:`, newIntegrationsState[s]);
        });

        // Para Twitter, também verificar localStorage
        const twitterConnected = localStorage.getItem('twitter_connected') === 'true';
        const twitterUsername = localStorage.getItem('twitter_username');
        console.log('🔍 [ADMIN] Twitter localStorage:', { twitterConnected, twitterUsername });
        if (twitterConnected && twitterUsername) {
          newIntegrationsState.twitter = true;
          console.log('✅ [ADMIN] Twitter conectado via localStorage:', twitterUsername);
        }

        setIntegrations(newIntegrationsState);
        setIsLoading(newLoadingState);
      } catch (e) {
        console.error('❌ [ADMIN] Status fetch failed:', e);
        const newLoadingState: Record<string, boolean> = { ...isLoading };
        (['twitter', 'instagram', 'facebook', 'paypal', 'mercadopago'] as const).forEach(s => newLoadingState[s] = false);
        setIsLoading(newLoadingState);
      }
    }
    fetchAllStatus();
  }, []);

  const handleConnect = (platform: Integration) => {
    console.log('🔌 [ADMIN] Conectando:', platform);

    // Facebook e Instagram têm funções dedicadas com popup Meta SDK
    if (platform === 'facebook') {
      console.log('🔵 [ADMIN] Redirecionando para handleFacebookConnect');
      handleFacebookConnect();
      return;
    }

    if (platform === 'instagram') {
      console.log('📷 [ADMIN] Redirecionando para handleInstagramConnect');
      handleInstagramConnect();
      return;
    }

    setIsLoading(prev => ({ ...prev, [platform]: true }));
    if (platform === 'twitter') {
      (async () => {
        try {
          console.log('🐦 [ADMIN] Iniciando login Twitter...');
          const { getAuth, TwitterAuthProvider, signInWithPopup, setPersistence, browserLocalPersistence } = await import('firebase/auth');
          const { app } = await import('@/lib/firebase');
          const auth = getAuth(app);

          // Forçar persistência local para que não desconecte ao atualizar
          await setPersistence(auth, browserLocalPersistence);
          console.log('✅ [ADMIN] Persistência local configurada');

          const provider = new TwitterAuthProvider();
          const result = await signInWithPopup(auth, provider);
          console.log('✅ [ADMIN] Popup concluído, resultado:', result);

          // Extrair e salvar username do Twitter
          let username = (result as any)?.additionalUserInfo?.username
            || (result as any)?.additionalUserInfo?.profile?.screen_name
            || (result as any)?._tokenResponse?.screenName;
          console.log('🔍 [ADMIN] Username extraído:', username);

          const accessToken = await result.user.getIdToken();

          // Se não encontrou username, buscar da API do Twitter
          if (!username) {
            console.log('⚠️ [ADMIN] Username não encontrado, buscando da API...');
            try {
              const response = await fetch('/api/admin/twitter/me', {
                headers: { Authorization: `Bearer ${accessToken}` }
              });
              if (response.ok) {
                const data = await response.json();
                username = data.username;
                console.log('✅ [ADMIN] Username obtido da API:', username);
              }
            } catch (fallbackError) {
              console.warn('⚠️ [ADMIN] Não foi possível buscar username da API:', fallbackError);
            }
          }

          if (username) {
            // Salvar no Firestore
            try {
              console.log('💾 [ADMIN] Salvando no Firestore...');
              const { getFirestore, doc, setDoc } = await import('firebase/firestore');
              const { app } = await import('@/lib/firebase');
              const db = getFirestore(app);
              const twitterAdminRef = doc(db, 'twitter_admins', result.user.uid);

              // Obter o Twitter User ID se disponível
              let twitterUserId: string | null = null;
              const twitterData = (result as any).user?.reloadUserInfo?.providerUserInfo?.find(
                (p: any) => p.providerId === 'twitter.com'
              );
              if (twitterData?.rawId) {
                twitterUserId = twitterData.rawId;
                console.log('✅ [ADMIN] Twitter User ID encontrado:', twitterUserId);
              }

              await setDoc(twitterAdminRef, {
                username: username,
                displayName: result.user.displayName || null,
                email: result.user.email || null,
                photoURL: result.user.photoURL || null,
                authenticatedAt: new Date().toISOString(),
                ...(twitterUserId && { twitterUserId })
              });

              console.log('✅ [ADMIN] Dados salvos no Firestore');
            } catch (dbError) {
              console.error('❌ [ADMIN] Erro ao salvar no Firestore:', dbError);
            }

            // Manter localStorage para compatibilidade (mas o sistema usará o Firebase)
            localStorage.setItem('twitter_username', username);
            sessionStorage.setItem('twitter_username', username);
            localStorage.setItem('twitter_connected', 'true');
            localStorage.setItem('twitter_uid', result.user.uid);
            console.log('✅ [ADMIN] Dados salvos no localStorage');

            setIntegrations(prev => ({ ...prev, twitter: true }));

            toast({
              title: 'Twitter conectado!',
              description: `Conta @${username} conectada com sucesso. Suas fotos e vídeos agora serão carregados dessa conta.`
            });
          } else {
            console.error('❌ [ADMIN] Não foi possível obter username do Twitter');
            toast({
              variant: 'destructive',
              title: 'Erro ao conectar Twitter',
              description: 'Não foi possível obter o nome de usuário do Twitter.'
            });
          }

          setIsLoading(prev => ({ ...prev, twitter: false }));
        } catch (e: any) {
          toast({
            variant: 'destructive',
            title: 'Falha ao conectar com Twitter',
            description: e?.message || 'Popup bloqueado ou configuração inválida.'
          });
          setIsLoading(prev => ({ ...prev, twitter: false }));
        }
      })();
      return;
    }

    // PayPal usa rota local, não Cloud Run
    if (platform === 'paypal') {
      console.log('💳 [ADMIN] Iniciando login PayPal...');
      const width = 600;
      const height = 700;
      const left = window.top ? (window.top.outerWidth - width) / 2 : 100;
      const top = window.top ? (window.top.outerHeight - height) / 2 : 100;
      const features = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=no`;

      try {
        const connectUrl = `${window.location.origin}/api/admin/paypal/connect`;
        console.log('🔗 [ADMIN] Abrindo popup PayPal:', connectUrl);
        const w = window.open(connectUrl, 'paypal_oauth', features);

        if (!w) {
          toast({
            variant: 'destructive',
            title: 'Popup bloqueado',
            description: 'Permita popups para conectar sua conta PayPal.'
          });
          updateIsLoading(platform, false);
          return;
        }

        const onMessage = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          const data = event.data || {};
          if (!data.platform || data.platform !== 'paypal') return;

          console.log('📨 [ADMIN] Mensagem recebida do PayPal:', data);

          if (data.success === '1' || data.success === true || data.connected === '1' || data.connected === true) {
            toast({
              title: "PayPal conectado!",
              description: "Sua conta PayPal foi conectada com sucesso.",
            });
            setIntegrations(prev => ({ ...prev, paypal: true }));
          } else {
            const err = data.error || 'Falha na autenticação PayPal.';
            toast({ variant: 'destructive', title: 'Erro na conexão PayPal', description: String(err) });
          }
          updateIsLoading('paypal', false);
          window.removeEventListener('message', onMessage);
        };

        window.addEventListener('message', onMessage);

        // Timeout de segurança
        const tid = window.setTimeout(() => {
          window.removeEventListener('message', onMessage);
          updateIsLoading('paypal', false);
          console.log('⏱️ [ADMIN] Timeout na conexão PayPal');
        }, 120000);

        return;
      } catch (error) {
        console.error('❌ [ADMIN] Erro ao abrir popup PayPal:', error);
        toast({
          variant: 'destructive',
          title: 'Erro ao conectar PayPal',
          description: 'Não foi possível abrir a janela de autenticação.'
        });
        updateIsLoading('paypal', false);
        return;
      }
    }

    // Fluxo padrão (Instagram, Mercado Pago): abrir janela OAuth no Cloud Run
    const w = openOAuthWindow(platform as any);
    if (!w) {
      toast({ variant: 'destructive', title: 'Popup bloqueado', description: 'Permita popups para conectar sua conta.' });
      updateIsLoading(platform, false);
      return;
    }

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data || {};
      if (!data.platform || data.platform !== platform) return;

      if (data.success === '1' || data.success === true || data.connected === '1' || data.connected === true) {
        // Se vier username nos dados (para qualquer plataforma), salvar
        // Nota: Twitter usa Firebase Auth e não passará por aqui normalmente,
        // mas se vier via OAuth2, salvamos o username
        if (data.username) {
          localStorage.setItem('twitter_username', data.username);
          sessionStorage.setItem('twitter_username', data.username);
          toast({
            title: "Twitter conectado!",
            description: `Conta @${data.username} conectada. Suas fotos e vídeos agora serão carregados dessa conta.`,
          });
        } else {
          toast({
            title: "Conexão realizada com sucesso!",
            description: `${platform.charAt(0).toUpperCase() + platform.slice(1)} foi conectado à sua conta.`,
          });
        }
        setIntegrations(prev => ({ ...prev, [platform]: true }));
      } else {
        const err = data.error || 'Falha na autenticação.';
        toast({ variant: 'destructive', title: 'Erro na conexão', description: String(err) });
      }
      updateIsLoading(platform, false);
      window.removeEventListener('message', onMessage);
    };
    window.addEventListener('message', onMessage);
    // Timeout de segurança para não manter loading infinito caso o popup não retorne
    const tid = window.setTimeout(() => {
      window.removeEventListener('message', onMessage);
      updateIsLoading(platform, false);
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

  const handleDisconnect = async (platform: Integration) => {
    setIsLoading(prev => ({ ...prev, [platform]: true }));
    try {
      // Para Facebook/Instagram, fazer logout do SDK antes
      if (platform === 'facebook' || platform === 'instagram') {
        console.log(`[${platform}] Fazendo logout do Facebook SDK...`);
        try {
          await metaSDK.logout();
          console.log(`[${platform}] ✅ Logout do SDK concluído`);
        } catch (sdkError) {
          console.warn(`[${platform}] Erro no logout do SDK (continuando):`, sdkError);
        }
      }

      const res = await fetch('/api/admin/integrations/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setIntegrations(prev => ({ ...prev, [platform]: false }));
        toast({ title: "Desconectado com sucesso", description: result.message });

        if (platform === 'twitter') {
          const username = localStorage.getItem('twitter_username');

          localStorage.removeItem('twitter_username');
          sessionStorage.removeItem('twitter_username');
          localStorage.removeItem('twitter_connected');
          localStorage.removeItem('twitter_uid');
          localStorage.removeItem('twitter_media_cache');

          // Limpar cache do Firestore
          if (username) {
            try {
              const { getAuth } = await import('firebase/auth');
              const { app } = await import('@/lib/firebase');
              const auth = getAuth(app);
              const user = auth.currentUser;

              if (user) {
                const accessToken = await user.getIdToken();
                await fetch('/api/admin/twitter/clear-cache', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ username })
                });
                console.log('✅ Cache do Twitter limpo');
              }
            } catch (error) {
              console.warn('⚠️ Erro ao limpar cache:', error);
            }
          }

          // Deslogar do Firebase Auth também
          try {
            const { getAuth, signOut } = await import('firebase/auth');
            const { app } = await import('@/lib/firebase');
            const auth = getAuth(app);
            await signOut(auth);
          } catch { }

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

  const handleSwitchTwitterAccount = async () => {
    if (!confirm('Deseja trocar de conta do Twitter? Você será deslogado e poderá conectar outra conta.')) {
      return;
    }

    setIsLoading(prev => ({ ...prev, twitter: true }));
    try {
      // Desconectar conta atual
      await handleDisconnect('twitter');

      // Aguardar um pouco e conectar nova conta
      setTimeout(() => {
        handleConnect('twitter');
      }, 500);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao trocar conta',
        description: 'Não foi possível trocar de conta. Tente novamente.'
      });
      setIsLoading(prev => ({ ...prev, twitter: false }));
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

        {/* Card do Instagram separado */}
        <IntegrationCard
          platform="instagram"
          title="Instagram Business"
          description="Conectar conta Instagram Business para gerenciar posts e mensagens."
          icon={<InstagramIcon />}
          isConnected={integrations.instagram}
          isLoading={isLoading.instagram}
          onConnect={handleInstagramConnect}
          onDisconnect={() => handleDisconnect('instagram')}
          onSync={() => handleSyncFeed('instagram')}
          syncing={isLoading.instagram}
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

        {integrationData.map((data) => {
          // Para Twitter, mostrar username quando conectado
          let description = data.description;
          if (data.platform === 'twitter' && integrations.twitter) {
            const twitterUsername = localStorage.getItem('twitter_username');
            if (twitterUsername) {
              description = `Conectado como @${twitterUsername}`;
            }
          }

          return (
            <IntegrationCard
              key={data.platform}
              platform={data.platform}
              title={data.title}
              description={description}
              icon={data.icon}
              isConnected={integrations[data.platform]}
              isLoading={isLoading[data.platform]}
              onConnect={() => handleConnect(data.platform as Integration)}
              onDisconnect={() => handleDisconnect(data.platform as Integration)}
              onSync={data.onSync}
              syncing={isLoading[data.platform]}
              onSettings={data.platform === 'twitter' ? () => {
                console.log('[INTEGRATIONS] Abrindo configurações do Twitter Bearer Token');
                setShowTwitterSettings(true);
              } : undefined}
            />
          );
        })}

        {/* Cards de cadastro (Auth Demo / Phone / FirebaseUI) removidos: fluxo foi movido para o modal de cadastro do admin */}
      </div>

      {/* Modal de Configurações do Twitter Bearer Token */}
      <TwitterBearerTokenModal
        isOpen={showTwitterSettings}
        onClose={() => setShowTwitterSettings(false)}
      />

      {/* Fluxo de Twitter via FirebaseUI Web executa em container oculto; nenhuma alteração visual aqui. */}
    </>
  );
}

// Modal compacto para configuração do Bearer Token
function TwitterBearerTokenModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [bearerToken, setBearerToken] = useState('');
  const [currentToken, setCurrentToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchCurrentToken();
    }
  }, [isOpen]);

  const fetchCurrentToken = async () => {
    setIsFetching(true);
    try {
      // Obter token de autenticação do Firebase
      const { getAuth } = await import('firebase/auth');
      const { app } = await import('@/lib/firebase');
      const auth = getAuth(app);
      const user = auth.currentUser;

      if (!user) {
        console.error('Usuário não autenticado');
        return;
      }

      const accessToken = await user.getIdToken();

      const res = await fetch('/api/admin/twitter/bearer-token', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentToken(data.source);
      }
    } catch (error) {
      console.error('Erro ao buscar token:', error);
    } finally {
      setIsFetching(false);
    }
  };

  const handleSaveToken = async () => {
    if (!bearerToken.trim()) {
      toast({
        variant: 'destructive',
        title: 'Token vazio',
        description: 'Por favor, insira um Bearer Token válido.'
      });
      return;
    }

    setIsLoading(true);
    try {
      // Obter token de autenticação do Firebase
      const { getAuth } = await import('firebase/auth');
      const { app } = await import('@/lib/firebase');
      const auth = getAuth(app);
      const user = auth.currentUser;

      if (!user) {
        toast({
          variant: 'destructive',
          title: 'Não autenticado',
          description: 'Você precisa estar logado para salvar o token.'
        });
        setIsLoading(false);
        return;
      }

      const accessToken = await user.getIdToken();

      const res = await fetch('/api/admin/twitter/bearer-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ token: bearerToken })
      });

      if (res.ok) {
        toast({
          title: 'Token salvo!',
          description: 'O Bearer Token foi atualizado com sucesso.'
        });
        setBearerToken('');
        fetchCurrentToken();
        onClose();
      } else {
        const error = await res.json();
        toast({
          variant: 'destructive',
          title: 'Erro ao salvar',
          description: error.error || 'Não foi possível salvar o token.'
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro de conexão',
        description: 'Não foi possível conectar ao servidor.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreDefault = async () => {
    setIsLoading(true);
    try {
      // Obter token de autenticação do Firebase
      const { getAuth } = await import('firebase/auth');
      const { app } = await import('@/lib/firebase');
      const auth = getAuth(app);
      const user = auth.currentUser;

      if (!user) {
        toast({
          variant: 'destructive',
          title: 'Não autenticado',
          description: 'Você precisa estar logado para restaurar o token.'
        });
        setIsLoading(false);
        return;
      }

      const accessToken = await user.getIdToken();

      const res = await fetch('/api/admin/twitter/bearer-token', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (res.ok) {
        toast({
          title: 'Token restaurado!',
          description: 'O sistema voltará a usar o token padrão do .env'
        });
        fetchCurrentToken();
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro ao restaurar',
          description: 'Não foi possível restaurar o token padrão.'
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro de conexão',
        description: 'Não foi possível conectar ao servidor.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md">
        <Card className="shadow-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TwitterIcon />
                <CardTitle className="text-lg">Twitter API Token</CardTitle>
              </div>
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            {!isFetching && currentToken && (
              <CardDescription className="text-xs">
                Token atual: <span className="font-mono text-[#1DA1F2]">{currentToken}</span>
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="bearer-token" className="text-sm font-medium">
                Novo Bearer Token
              </label>
              <input
                id="bearer-token"
                type="text"
                value={bearerToken}
                onChange={(e) => setBearerToken(e.target.value)}
                placeholder="AAAAAAAAAAAAAAAAAAAAAA..."
                className="w-full px-3 py-2 border rounded-md font-mono text-xs"
                disabled={isLoading}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSaveToken}
                disabled={isLoading || !bearerToken.trim()}
                className="flex-1 px-3 py-2 text-sm bg-[#1DA1F2] text-white rounded-md hover:bg-[#1A91DA] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Salvando...' : 'Salvar'}
              </button>

              {currentToken === 'firestore' && (
                <button
                  onClick={handleRestoreDefault}
                  disabled={isLoading}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Restaurar
                </button>
              )}
            </div>

            <p className="text-xs text-muted-foreground pt-2 border-t">
              💡 Troque quando atingir o limite de requisições
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}