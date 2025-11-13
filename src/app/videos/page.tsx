
"use client";

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Loader2, AlertCircle, Video, Twitter, Upload, Play, ExternalLink, RefreshCw } from 'lucide-react';
import { processVideoUrl } from '@/utils/video-url-processor';
import { Button } from "@/components/ui/button";
import { useToast } from "../../hooks/use-toast";
import { getCachedVideos, cacheVideos, getCacheStats } from '@/services/twitter-media-cache';
import { collection, getDocs, Timestamp, orderBy, query } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

// Interfaces
interface TwitterMedia {
    url?: string;
    preview_image_url?: string;
    type: string;
    media_key: string;
    variants?: any[];
}

interface TweetWithMedia {
    id: string;
    text: string;
    created_at?: string;
    media: TwitterMedia[];
    username: string;
    profile_image_url?: string;
}

interface UploadedVideo {
    id: string;
    title: string;
    videoUrl: string;
    thumbnailUrl?: string;
    createdAt: Timestamp;
}

// Reusable components
const FeedLoading = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">{message}</p>
    </div>
);

const FeedError = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-destructive bg-destructive/10 rounded-lg p-4">
        <AlertCircle className="h-12 w-12" />
        <p className="mt-4 font-semibold">Erro ao carregar</p>
        <p className="text-sm text-center">{message}</p>
    </div>
);

const FeedEmpty = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
        <Video className="h-12 w-12" />
        <p className="mt-4 text-lg font-semibold text-center">{message}</p>
    </div>
);

const getBestVideoUrl = (media: TwitterMedia) => {
    if (media.variants && Array.isArray(media.variants) && media.variants.length > 0) {
        const mp4Variants = media.variants
            .filter((v: any) => v.content_type === 'video/mp4' && v.url)
            .sort((a: any, b: any) => (b.bit_rate || 0) - (a.bit_rate || 0));
        if (mp4Variants.length > 0) return mp4Variants[0].url;
        const otherVariants = media.variants.filter((v: any) => v.url);
        if (otherVariants.length > 0) return otherVariants[0].url;
    }
    if (media.url && !media.url.includes('twimg.com/media/') && !media.url.includes('.jpg') && !media.url.includes('.png')) {
        return media.url;
    }
    return null;
};

const TwitterVideoPlayer = ({ media, tweet }: { media: TwitterMedia, tweet: TweetWithMedia | undefined }) => {
    const [videoError, setVideoError] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const videoUrl = getBestVideoUrl(media);

    const openInTwitter = () => {
        if (tweet?.id) window.open(`https://twitter.com/user/status/${tweet.id}`, '_blank');
    };

    if (!videoUrl) {
        return null; // Don't render if no video URL
    }

    if (videoError) {
        return (
            <div className="group relative aspect-video overflow-hidden rounded-lg border border-primary/20 bg-gray-900 flex flex-col items-center justify-center p-4">
                <p className="text-white text-sm mb-3 text-center">Erro ao carregar vídeo</p>
                <div className="space-y-2 w-full">
                    <Button onClick={openInTwitter} className="w-full" variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4 mr-2" /> Abrir no Twitter
                    </Button>
                    <Button onClick={() => setVideoError(false)} className="w-full" variant="secondary" size="sm">
                        🔄 Tentar Novamente
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative aspect-video overflow-hidden rounded-lg border border-primary/20 hover:border-primary hover:shadow-neon-red-light transition-all">
            <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-full object-cover bg-black"
                controls
                preload="metadata"
                onError={() => setVideoError(true)}
                playsInline
                controlsList="nodownload"
            >
                <source src={videoUrl} type="video/mp4" />
                Seu navegador não suporta reprodução de vídeo.
            </video>
        </div>
    );
};

const TwitterVideos = () => {
    const { toast } = useToast();
    const [tweets, setTweets] = useState<TweetWithMedia[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentUsername, setCurrentUsername] = useState<string | null>(null);
    const [nextToken, setNextToken] = useState<string | undefined>(undefined);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [usingCache, setUsingCache] = useState(false);

    useEffect(() => {
        const fetchTwitterVideos = async () => {
            console.log('🔄 [VIDEOS] Iniciando fetch híbrido (Firebase Auth + Twitter API)...');
            setIsLoading(true);
            setError(null);

            try {
                // Buscar usuário autenticado do Firebase
                const { getAuth } = await import('firebase/auth');
                const { app } = await import('@/lib/firebase');
                const auth = getAuth(app);

                const user = auth.currentUser;
                if (!user) {
                    console.log('❌ [VIDEOS] Usuário não autenticado no Firebase');
                    setError('Nenhuma conta do Twitter conectada. Por favor, autentique-se na página de administração.');
                    setIsLoading(false);
                    return;
                }

                console.log('✅ [VIDEOS] Usuário autenticado:', user.uid);

                // Obter token de autenticação
                const accessToken = await user.getIdToken();
                console.log('🔑 [VIDEOS] Token obtido');

                // Verificar cache FIRESTORE primeiro (compartilhado entre dispositivos)
                const cachedVideos = await getCachedVideos(user.uid);
                if (cachedVideos && cachedVideos.length > 0) {
                    console.log('📦 [VIDEOS] Usando cache FIRESTORE com', cachedVideos.length, 'vídeos');
                    setTweets(cachedVideos);
                    setUsingCache(true);
                    setIsLoading(false);

                    const stats = getCacheStats();
                    toast({
                        title: '📦 Cache Compartilhado',
                        description: `${cachedVideos.length} vídeos do Firestore (visível em todos dispositivos)`,
                    });
                }

                // Chamar API híbrida (não precisa passar username, a API busca do Firebase)
                console.log('🌐 [VIDEOS] Chamando API híbrida...');

                const response = await fetch('/api/twitter/videos', {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                    },
                });

                console.log('📡 [VIDEOS] Resposta HTTP:', response.status, response.statusText);

                const data = await response.json();
                console.log('📦 [VIDEOS] Dados recebidos:', {
                    success: data.success,
                    tweets_count: data.tweets?.length || 0,
                    username: data.username,
                    cached: data.cached,
                    error: data.error
                });

                if (data.success) {
                    const newTweets = data.tweets || [];
                    console.log('✅ [VIDEOS] Vídeos carregados com sucesso:', newTweets.length);
                    setTweets(newTweets);
                    setCurrentUsername(data.username);
                    setUsingCache(false);

                    // Salvar no cache (5-10 primeiros)
                    if (newTweets.length > 0) {
                        console.log('💾 [VIDEOS] Salvando', newTweets.length, 'vídeos no cache');
                        cacheVideos(newTweets, user.uid);
                    }

                    if (newTweets.length === 0) {
                        console.log('⚠️ [VIDEOS] Nenhum vídeo encontrado');
                        toast({ title: 'Aviso', description: `Nenhum vídeo encontrado para @${data.username}` });
                    }
                } else {
                    console.log('❌ [VIDEOS] Resposta de erro da API:', data.error);
                    throw new Error(data.error || 'Falha ao buscar vídeos do Twitter');
                }
            } catch (e: any) {
                const errorMessage = e.message || 'Erro desconhecido';
                console.error('❌ [VIDEOS] Erro ao buscar vídeos:', e);
                console.log('❌ [VIDEOS] Detalhes do erro:', {
                    message: errorMessage,
                    name: e.name,
                    stack: e.stack
                });

                // Se temos cache, continuar usando ele
                if (usingCache) {
                    console.log('📦 [VIDEOS] Mantendo cache após erro');
                    toast({
                        title: 'Erro ao atualizar',
                        description: 'Usando vídeos do cache. ' + errorMessage,
                    });
                } else {
                    console.log('❌ [VIDEOS] Exibindo erro (sem cache disponível)');
                    setError(`Não foi possível carregar o feed do Twitter. Motivo: ${errorMessage}`);
                    toast({ variant: 'destructive', title: 'Erro ao Carregar Feed', description: errorMessage });
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchTwitterVideos();
    }, [toast]);

    const loadMore = async () => {
        // API híbrida retorna cache limitado - paginação desabilitada temporariamente
        console.log('⚠️ [VIDEOS] Paginação não disponível na API híbrida');
        return;
    };

    const videos = tweets.flatMap(tweet =>
        tweet.media.filter(m => (m.type === 'video' || m.type === 'animated_gif'))
    );

    if (isLoading) return <FeedLoading message={`Carregando vídeos do X (@${currentUsername})...`} />;
    if (error) return <FeedError message={error} />;
    if (!currentUsername) return <FeedError message="Nenhuma conta do Twitter conectada. Por favor, conecte sua conta na página de administração para ver os vídeos." />;
    if (videos.length === 0) return <FeedEmpty message={`Nenhum vídeo encontrado no feed de @${currentUsername}.`} />;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                    <Twitter className="h-5 w-5 text-blue-500" />
                    <span className="font-medium">Conta: @{currentUsername}</span>
                    <span className="text-sm text-muted-foreground">({videos.length} vídeos)</span>
                </div>
                <Button onClick={() => window.location.reload()} variant="outline" size="sm">Atualizar</Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {videos.map((media) => {
                    const tweet = tweets.find(t => t.media.some(m => m.media_key === media.media_key));
                    return <TwitterVideoPlayer key={media.media_key} media={media} tweet={tweet} />;
                })}
            </div>
            {nextToken && (
                <div className="flex justify-center mt-6">
                    <Button onClick={loadMore} disabled={isLoadingMore} variant="outline">
                        {isLoadingMore ? 'Carregando...' : 'Carregar mais'}
                    </Button>
                </div>
            )}
        </div>
    );
};

const UploadsFeed = () => {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [videos, setVideos] = useState<UploadedVideo[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchVideos = async () => {
            setIsLoading(true);
            try {
                const q = query(collection(db, "videos"), orderBy("createdAt", "desc"));
                const querySnapshot = await getDocs(q);
                setVideos(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UploadedVideo)));
            } catch (e) {
                setError("Não foi possível carregar os vídeos do servidor.");
                toast({ variant: "destructive", title: "Erro ao Carregar Vídeos" });
            } finally {
                setIsLoading(false);
            }
        };
        fetchVideos();
    }, [toast]);

    if (isLoading) return <FeedLoading message="Carregando vídeos enviados..." />;
    if (error) return <FeedError message={error} />;
    if (videos.length === 0) return <FeedEmpty message="Nenhum vídeo foi enviado ainda." />;

    const IntelligentPlayer = ({ video }: { video: UploadedVideo }) => {
        const { platform, embedUrl } = processVideoUrl(video.videoUrl);
        const [videoError, setVideoError] = useState(false);

        if (['youtube', 'vimeo', 'dailymotion'].includes(platform)) {
            return <iframe src={embedUrl} className="w-full h-full" frameBorder="0" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title={video.title} loading="lazy" />;
        }

        if (videoError) {
            return (
                <div className="bg-gray-900 flex flex-col items-center justify-center p-4 h-full">
                    <p className="text-white text-sm mb-3">Erro ao carregar</p>
                    <div className="space-y-2 w-full">
                        <Button onClick={() => window.open(video.videoUrl, '_blank')} variant="outline" size="sm" className="w-full">
                            <ExternalLink className="h-4 w-4 mr-2" /> Abrir Link
                        </Button>
                        <Button onClick={() => setVideoError(false)} variant="secondary" size="sm" className="w-full">
                            🔄 Recarregar
                        </Button>
                    </div>
                </div>
            );
        }

        return <video src={video.videoUrl} poster={video.thumbnailUrl} className="w-full h-full object-cover" controls preload="metadata" onError={() => setVideoError(true)} playsInline controlsList="nodownload" />;
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map(video => (
                <div key={video.id} className="group relative aspect-video overflow-hidden rounded-lg border border-primary/20 hover:border-primary hover:shadow-neon-red-light transition-all">
                    <IntelligentPlayer video={video} />
                </div>
            ))}
        </div>
    );
}

export default function VideosPage() {
    return (
        <main className="flex flex-1 w-full flex-col items-center p-4 bg-background">
            <Card className="w-full max-w-6xl animate-in fade-in-0 zoom-in-95 duration-500 shadow-neon-red-strong border-primary/50 bg-card/90 backdrop-blur-xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl text-primary text-shadow-neon-red-light flex items-center justify-center gap-3">
                        <Video /> Galeria de Vídeos
                    </CardTitle>
                    <CardDescription className="text-lg text-muted-foreground">
                        Feeds de vídeos de várias fontes.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="twitter" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="twitter" className="flex items-center gap-2">
                                <Twitter className="h-4 w-4" /> Vídeos do X
                            </TabsTrigger>
                            <TabsTrigger value="uploads" className="flex items-center gap-2">
                                <Upload className="h-4 w-4" /> Uploads
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="twitter" className="mt-6">
                            <TwitterVideos />
                        </TabsContent>
                        <TabsContent value="uploads" className="mt-6">
                            <UploadsFeed />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </main>
    );
}
