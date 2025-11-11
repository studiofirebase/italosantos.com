
"use client";

import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/use-subscription';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, User as UserIcon, CheckCircle, BellRing, CreditCard, Lock, ArrowRight, Video, Star, PlayCircle, Mail, CornerDownRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { collection, getDocs, orderBy, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import ReviewsSection from '@/components/reviews/reviews-section';

interface Video {
  id: string;
  title: string;
  thumbnailUrl: string;
  aiHint?: string;
}

const subscriptionVideos: Video[] = [
  { id: 'sub_vid_1', title: 'Tutorial Exclusivo de Shibari', thumbnailUrl: 'https://placehold.co/600x400.png', aiHint: 'rope art' },
  { id: 'sub_vid_2', title: 'Sessão Completa de Wax Play', thumbnailUrl: 'https://placehold.co/600x400.png', aiHint: 'candle wax' },
  { id: 'sub_vid_3', title: 'Introdução ao Findom', thumbnailUrl: 'https://placehold.co/600x400.png', aiHint: 'luxury money' },
  { id: 'sub_vid_4', title: 'Guia de Pet Play para Iniciantes', thumbnailUrl: 'https://placehold.co/600x400.png', aiHint: 'person collar' },
];

// Dados de exemplo para os vídeos comprados avulsos
const purchasedVideosExample: Video[] = [
    { id: 'pur_vid_1', title: 'Bastidores Exclusivos #1', thumbnailUrl: 'https://placehold.co/600x400.png', aiHint: 'backstage exclusive' },
    { id: 'pur_vid_2', title: 'Cena Deletada: O Encontro', thumbnailUrl: 'https://placehold.co/600x400.png', aiHint: 'deleted scene' },
]

export default function AssinantePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { subscription, plan, hasActiveSubscription, isLoading: subscriptionLoading } = useSubscription();
  const [purchasedVideos, setPurchasedVideos] = useState<Video[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('usuario@exemplo.com');
  
  useEffect(() => {
    setIsClient(true);
    // Buscar email do cliente do localStorage
    const savedEmail = localStorage.getItem('customerEmail');
    if (savedEmail) {
      setCustomerEmail(savedEmail);
    }
  }, []);

  useEffect(() => {
    const fetchPurchasedVideos = async () => {
      // Busca os vídeos vendidos avulsos
      setIsLoadingVideos(true);
      try {
        const videosCollection = collection(db, "videos");
        const q = query(videosCollection, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            // Se não houver vídeos reais, usa os de exemplo
            setPurchasedVideos(purchasedVideosExample);
        } else {
            const videosList = querySnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            } as Video));
            setPurchasedVideos(videosList);
        }
      } catch (error) {
        console.error("Error fetching videos: ", error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar vídeos comprados.",
        });
        // Em caso de erro, usa os vídeos de exemplo
        setPurchasedVideos(purchasedVideosExample);
      } finally {
        setIsLoadingVideos(false);
      }
    };

    if (isClient) {
      fetchPurchasedVideos();
    }
  }, [isClient, toast]);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('hasPaid');
      localStorage.removeItem('hasSubscription');
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('redirectAfterLogin');
      localStorage.removeItem('customerEmail');
    }
    router.push('/');
  };
  


  const UserProfileCard = () => (
     <Card className="w-full animate-in fade-in-0 zoom-in-95 duration-500 shadow-neon-red-strong border-primary/50 bg-card/90 backdrop-blur-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center gap-3 mb-4">
             <Avatar className="h-20 w-20 border-2 border-primary/50">
              <AvatarImage src="https://placehold.co/100x100.png" alt="Avatar do Usuário" data-ai-hint="profile avatar" />
              <AvatarFallback className="text-3xl bg-muted">U</AvatarFallback>
            </Avatar>
          </div>
           <CardTitle className="text-3xl text-white">
                Bem-vindo(a)!
            </CardTitle>
          <CardDescription>Painel do Assinante</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
            <div className="flex items-center gap-4">
                <UserIcon className="h-5 w-5 text-primary" />
                <p><span className="text-muted-foreground">Status: </span><strong>Verificado</strong></p>
            </div>
            <div className="flex items-center gap-4">
                <Mail className="h-5 w-5 text-primary" />
                <p><span className="text-muted-foreground">Email: </span><strong>{customerEmail}</strong></p>
            </div>
        </CardContent>
        <CardFooter>
             <Button className="w-full h-11 text-base" variant="secondary" onClick={handleLogout}>
                <LogOut className="mr-2" />
                Sair
            </Button>
        </CardFooter>
      </Card>
  );
  
  const VideoGrid = ({ videos, onVideoClick }: { videos: Video[], onVideoClick: (id: string) => void}) => (
     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {videos.map(video => (
            <button key={video.id} className="relative group overflow-hidden rounded-lg border border-primary/20 text-left" onClick={() => onVideoClick(video.id)}>
                <Image src={video.thumbnailUrl} alt={video.title} width={300} height={169} className="object-cover w-full aspect-video transition-transform duration-300 group-hover:scale-105" data-ai-hint={video.aiHint || 'video content'}/>
                 <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center p-4 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <PlayCircle className="h-12 w-12 text-white mb-2"/>
                    <h3 className="font-bold text-white line-clamp-2">{video.title}</h3>
                </div>
            </button>
        ))}
    </div>
  );

  const SubscriptionSection = () => (
    <Card className="w-full animate-in fade-in-0 zoom-in-95 duration-500 shadow-lg border-gray-400 bg-card/90 backdrop-blur-xl">
        <CardHeader>
            <CardTitle className="text-2xl text-white flex items-center gap-2">
              <Star /> 
              {hasActiveSubscription ? 'Sua Assinatura' : 'Vídeos da Assinatura'}
            </CardTitle>
            <CardDescription>
              {hasActiveSubscription
                ? `Plano ${plan?.name || 'Ativo'} - ${subscription ? `Expira em ${new Date(subscription.expirationDate).toLocaleDateString('pt-BR')}` : 'Ativo'}`
                : 'Conteúdo exclusivo liberado para assinantes.'
              }
            </CardDescription>
        </CardHeader>
        <CardContent>
             {hasActiveSubscription ? (
                <div className="space-y-4">
                  {subscription && plan && (
                    <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-white">{plan.name}</h4>
                          <p className="text-sm text-gray-400">
                            Ativo até {new Date(subscription.expirationDate).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-white">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(plan.price)}
                          </p>
                          <p className="text-xs text-green-600 dark:text-green-400">Via {subscription.paymentMethod}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  <VideoGrid videos={subscriptionVideos} onVideoClick={(id) => router.push(`/assinante/videos?id=${id}`)} />
                </div>
            ) : (
                <div className="text-center p-6 bg-muted/30 rounded-lg border border-dashed border-border">
                    <Lock className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">Assinatura Inativa</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Assine para ter acesso a tutoriais e vídeos exclusivos.
                    </p>
                    <Button className="mt-4 h-11 text-base bg-primary/90 hover:bg-primary text-primary-foreground shadow-neon-red-light hover:shadow-neon-red-strong" onClick={() => router.push('/')}>
                        <CreditCard className="mr-2" />
                        Assinar Agora
                    </Button>
                </div>
            )}
        </CardContent>
    </Card>
  );

  const PurchasedVideosSection = () => (
    <Card className="w-full animate-in fade-in-0 zoom-in-95 duration-500 shadow-neon-red-strong border-primary/50 bg-card/90 backdrop-blur-xl">
        <CardHeader>
            <CardTitle className="text-2xl text-white flex items-center gap-2"><Video /> Vídeos Comprados Avulsos</CardTitle>
            <CardDescription>Acesse aqui os vídeos que você comprou na loja.</CardDescription>
        </CardHeader>
        <CardContent>
            {isLoadingVideos ? (
                <div className="flex justify-center items-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : purchasedVideos.length > 0 ? (
                <VideoGrid videos={purchasedVideos} onVideoClick={(id) => router.push(`/assinante/videos?id=${id}`)} />
            ) : (
                 <div className="text-center p-6 bg-muted/30 rounded-lg border border-dashed border-border">
                    <p className="text-muted-foreground">Você ainda não comprou nenhum vídeo avulso.</p>
                </div>
            )}
        </CardContent>
    </Card>
  );

  if (!isClient || subscriptionLoading) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <main className="flex flex-1 w-full flex-col items-center justify-start p-4 bg-background gap-8">
       <div className="w-full max-w-4xl space-y-8">
            <UserProfileCard />
            <SubscriptionSection />
            <PurchasedVideosSection />

            <Separator className="my-8 bg-primary/20" />
            
            <ReviewsSection title="Comentários" maxReviews={10} />
       </div>
    </main>
  );
}

    