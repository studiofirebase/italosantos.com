
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Loader2, AlertCircle, Camera, Twitter, Upload, Maximize2 } from 'lucide-react';
import Image from "next/image";
import { useToast } from "../../hooks/use-toast";
import { collection, getDocs, Timestamp, orderBy, query } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Interfaces para os tipos de mídia
interface TwitterMedia {
  url?: string;
  preview_image_url?: string;
  type: string;
  media_key: string;
}

// Tipo para tweet com mídia (baseado no novo schema)
interface TweetWithMedia {
  id: string;
  text: string;
  created_at?: string;
  media: TwitterMedia[];
  username: string;
  profile_image_url?: string;
  isRetweet?: boolean;
}

interface UploadedPhoto {
  id: string;
  title: string;
  imageUrl: string;
}

// Componentes de estado reutilizáveis
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
    <Camera className="h-12 w-12" />
    <p className="mt-4 text-lg font-semibold text-center">{message}</p>
  </div>
);

// Componente de card para fotos do Twitter
const TwitterPhotoCard = ({ media, tweet, index }: { media: TwitterMedia, tweet: TweetWithMedia | undefined, index: number }) => {
    const [imageError, setImageError] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const handleImageError = () => {
        setImageError(true);
    };

    const handleImageLoad = () => {
        setImageLoaded(true);
    };

    const openInTwitter = () => {
        if (tweet?.id) {
            window.open(`https://twitter.com/user/status/${tweet.id}`, '_blank');
        }
    };

    return (
        <>
            <div className="group relative aspect-square overflow-hidden rounded-lg border border-primary/20 hover:border-primary hover:shadow-neon-red-light transition-all">
                <div className="relative w-full h-full bg-black">
                    {media.url && !imageError ? (
                        <>
                            {/* Imagem principal */}
                            <Image 
                                src={media.url} 
                                alt={`Foto do Twitter #${index + 1}`}
                                width={600} 
                                height={600} 
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" 
                                onError={handleImageError}
                                onLoad={handleImageLoad}
                                data-ai-hint="twitter feed image"
                            />

                            {/* Overlay quando imagem não carregou ainda */}
                            {!imageLoaded && !imageError && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                    <div className="text-white text-center">
                                        <Camera className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        // Fallback quando imagem falha ou não há URL
                        <div className="relative w-full h-full bg-gray-900 flex flex-col items-center justify-center text-white">
                            <div className="text-center">
                                <Camera className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                            </div>
                        </div>
                    )}

                    {/* Info da foto */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="text-white">
                            <p className="text-sm font-medium">Foto #{index + 1}</p>
                            {tweet?.text && (
                                <p className="text-xs text-gray-300 mt-1 line-clamp-1">
                                    {tweet.text.slice(0, 60)}...
                                </p>
                            )}
                            <p className="text-xs text-blue-300 mt-1">
                                @{tweet?.username || 'twitter'}
                            </p>
                        </div>
                    </div>

                    {/* Botões de ação */}
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        {/* Botão de fullscreen */}
                        <button
                            onClick={() => setIsFullscreen(true)}
                            className="bg-black/70 hover:bg-black/90 text-white p-2 rounded-full transition-colors"
                            title="Visualizar em tela cheia"
                        >
                            <Maximize2 className="h-4 w-4" />
                        </button>
                        
                        {/* Botão do Twitter */}
                        <button
                            onClick={openInTwitter}
                            className="bg-black/70 hover:bg-black/90 text-white p-2 rounded-full transition-colors"
                            title="Abrir no Twitter"
                        >
                            <Twitter className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Modal de fullscreen */}
            <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
                <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 flex flex-col">
                    <DialogHeader className="p-4 pb-2 flex-shrink-0">
                        <DialogTitle>
                            Foto do Twitter
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 p-4 pt-0 min-h-0">
                        {media.url && (
                            <div className="w-full h-full flex items-center justify-center">
                                <Image 
                                    src={media.url} 
                                    alt={`Foto do Twitter #${index + 1}`}
                                    width={1200} 
                                    height={1200} 
                                    className="max-w-full max-h-full object-contain rounded-lg" 
                                    priority
                                />
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

// Componente para fotos enviadas
const UploadedPhotoCard = ({ photo }: { photo: UploadedPhoto }) => {
    const [imageError, setImageError] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const handleImageError = () => {
        setImageError(true);
    };

    const handleImageLoad = () => {
        setImageLoaded(true);
    };

    return (
        <>
            <div className="group relative aspect-square overflow-hidden rounded-lg border border-primary/20 hover:border-primary hover:shadow-neon-red-light transition-all">
                <div className="relative w-full h-full bg-black">
                    {photo.imageUrl && !imageError ? (
                        <>
                            {/* Imagem principal */}
                            <Image 
                                src={photo.imageUrl} 
                                alt={photo.title}
                                width={600} 
                                height={600} 
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" 
                                onError={handleImageError}
                                onLoad={handleImageLoad}
                            />

                            {/* Overlay quando imagem não carregou ainda */}
                            {!imageLoaded && !imageError && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                    <div className="text-white text-center">
                                        <Camera className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        // Fallback quando imagem falha
                        <div className="relative w-full h-full bg-gray-900 flex flex-col items-center justify-center text-white">
                            <div className="text-center">
                                <Camera className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                                <p className="text-sm">Erro ao carregar imagem</p>
                            </div>
                        </div>
                    )}

                    {/* Info da foto */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="text-white">
                            <p className="text-sm font-medium">{photo.title}</p>
                        </div>
                    </div>

                    {/* Botão de fullscreen */}
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => setIsFullscreen(true)}
                            className="bg-black/70 hover:bg-black/90 text-white p-2 rounded-full transition-colors"
                            title="Visualizar em tela cheia"
                        >
                            <Maximize2 className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
            
                         {/* Modal de fullscreen */}
             <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
                 <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 flex flex-col">
                     <DialogHeader className="p-4 pb-2 flex-shrink-0">
                         <DialogTitle>
                             {photo.title}
                         </DialogTitle>
                     </DialogHeader>
                     <div className="flex-1 p-4 pt-0 min-h-0">
                         {photo.imageUrl && (
                             <div className="w-full h-full flex items-center justify-center">
                                 <Image 
                                     src={photo.imageUrl} 
                                     alt={photo.title}
                                     width={1200} 
                                     height={1200} 
                                     className="max-w-full max-h-full object-contain rounded-lg" 
                                     priority
                                 />
                             </div>
                         )}
                     </div>
                 </DialogContent>
             </Dialog>
        </>
    );
};

const TwitterPhotos = () => {
    const { toast } = useToast();
    const [tweets, setTweets] = useState<TweetWithMedia[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentUsername, setCurrentUsername] = useState<string | null>(null);
    const [nextToken, setNextToken] = useState<string | undefined>(undefined);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // Carregar username do localStorage
    useEffect(() => {
        const savedUsername = localStorage.getItem('twitter_username');
        setCurrentUsername(savedUsername);
        if (!savedUsername) {
          setIsLoading(false);
          setError('Nenhuma conta do Twitter conectada. Conecte sua conta na página de administração.');
        }
    }, []);

    useEffect(() => {
        const fetchTwitter = async () => {
            if (!currentUsername) return;
            setIsLoading(true);
            setError(null);
            try {
                const params = new URLSearchParams({ username: currentUsername, max_results: '50' });
                const response = await fetch(`/api/twitter/fotos?${params.toString()}`);
                const data = await response.json();

                if (data.success) {
                    setTweets(data.tweets || []);
                    setNextToken(data.next_token);
                    if ((data.tweets || []).length === 0) {
                        toast({
                            title: 'Aviso',
                            description: `Nenhuma foto encontrada para @${currentUsername}`,
                        });
                    }
                } else {
                    throw new Error(data.message || 'Falha ao buscar fotos do Twitter');
                }
            } catch (e: any) {
                const errorMessage = e.message || "Ocorreu um erro desconhecido.";
                setError(`Não foi possível carregar o feed do Twitter. Motivo: ${errorMessage}`);
                console.error('Erro ao buscar fotos do Twitter:', e);
                toast({
                    variant: 'destructive',
                    title: 'Erro ao Carregar o Feed do Twitter',
                    description: errorMessage,
                });
            } finally {
                setIsLoading(false);
            }
        };
        
        if (currentUsername) {
            fetchTwitter();
        }
    }, [toast, currentUsername]);

    const loadMore = async () => {
        if (!currentUsername || !nextToken) return;
        setIsLoadingMore(true);
        try {
            const params = new URLSearchParams({ username: currentUsername, max_results: '50', pagination_token: nextToken });
            const response = await fetch(`/api/twitter/fotos?${params.toString()}`);
            const data = await response.json();
            if (data.success) {
                setTweets(prev => [...prev, ...(data.tweets || [])]);
                setNextToken(data.next_token);
            }
        } finally {
            setIsLoadingMore(false);
        }
    };

    const photos = tweets.flatMap(tweet => 
        tweet.media.filter(m => m.type === 'photo')
    );

    if (isLoading) return <FeedLoading message={`Carregando fotos do X (@${currentUsername})...`} />;
    if (error) return <FeedError message={error} />;
    if (!currentUsername) return <FeedError message="Nenhuma conta do Twitter conectada. Por favor, conecte sua conta na página de administração para ver as fotos." />;
    
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                    <Twitter className="h-5 w-5 text-blue-500" />
                    <span className="font-medium">Conta: @{currentUsername}</span>
                    <span className="text-sm text-muted-foreground">({photos.length} fotos)</span>
                </div>
                <button 
                    onClick={() => window.location.reload()} 
                    className="text-sm text-primary hover:underline"
                >
                    Atualizar
                </button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {photos.map((media, index) => {
                    const tweet = tweets.find(t => t.media.some(m => m.media_key === media.media_key));
                    
                    return (
                        <TwitterPhotoCard 
                            key={media.media_key}
                            media={media}
                            tweet={tweet}
                            index={index}
                        />
                    );
                })}
            </div>
            {nextToken && (
                <div className="flex justify-center mt-6">
                    <button onClick={loadMore} disabled={isLoadingMore} className="text-sm text-primary hover:underline">
                        {isLoadingMore ? 'Carregando...' : 'Carregar mais'}
                    </button>
                </div>
            )}
        </div>
    );
};

// Componente para a aba de Uploads
const UploadsFeed = () => {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPhotos = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const photosCollection = collection(db, "photos");
                const q = query(photosCollection, orderBy("createdAt", "desc"));
                const querySnapshot = await getDocs(q);
                const photosList = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as UploadedPhoto));
                setPhotos(photosList);
            } catch (e: any) {
                setError("Não foi possível carregar as fotos do servidor.");
                toast({
                    variant: "destructive",
                    title: "Erro ao Carregar Fotos",
                    description: "Houve um problema ao buscar as fotos enviadas.",
                });
            } finally {
                setIsLoading(false);
            }
        };
        fetchPhotos();
    }, [toast]);

    if (isLoading) return <FeedLoading message="Carregando fotos enviadas..." />;
    if (error) return <FeedError message={error} />;
    if (photos.length === 0) return <FeedEmpty message="Nenhuma foto foi enviada ainda." />;

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {photos.map(photo => (
                <UploadedPhotoCard key={photo.id} photo={photo} />
            ))}
        </div>
    );
};

export default function PhotosPage() {
  return (
    <main className="flex flex-1 w-full flex-col items-center p-4 bg-background">
      <Card className="w-full max-w-6xl animate-in fade-in-0 zoom-in-95 duration-500 shadow-neon-red-strong border-primary/50 bg-card/90 backdrop-blur-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl text-primary text-shadow-neon-red-light flex items-center justify-center gap-3">
            <Camera /> Galeria de Fotos
          </CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Feeds de fotos de várias fontes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="twitter" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="twitter" className="flex items-center gap-2">
                <Twitter className="h-4 w-4" />
                Fotos do X
              </TabsTrigger>
              <TabsTrigger value="uploads" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Uploads
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="twitter" className="mt-6">
              <TwitterPhotos />
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
