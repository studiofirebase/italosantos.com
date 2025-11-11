"use client";

import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, ImageIcon } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useAdminGallery } from '@/hooks/use-admin-gallery';

const GallerySection = () => {
    const { galleryPhotos, galleryNames, loading: galleryLoading, error: galleryError, refreshSettings } = useAdminGallery();

    // Criar galerias usando as fotos e nomes do painel admin, filtrando apenas as que têm fotos configuradas
    const galleries = galleryNames
        .map((galleryName, i) => {
            // Pegar a foto correspondente do admin
            const adminPhoto = galleryPhotos[i];
            const photoUrl = adminPhoto?.url;
            
            // Só incluir se a foto existe e não é placeholder
            if (!photoUrl || photoUrl === 'https://placehold.co/400x600.png') {
                return null;
            }
                
            return {
                id: i,
                word: galleryName, // Usar o nome personalizado da galeria
                photos: [{
                    src: photoUrl,
                    hint: i % 2 === 0 ? "fashion editorial" : "urban model",
                    id: 0
                }]
            };
        })
        .filter((gallery): gallery is NonNullable<typeof gallery> => gallery !== null); // Remove nulls e type assertion

    return (
        <>
            <Separator className="my-4 bg-gray-400" />
            <div className="py-8 space-y-8">
                {galleryLoading ? (
                    // Estado de loading das galerias
                    <div className="flex flex-col items-center justify-center py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-white mb-4" />
                        <p className="text-muted-foreground">Carregando galerias...</p>
                    </div>
                ) : galleryError ? (
                    // Estado de erro das galerias
                    <div className="flex flex-col items-center justify-center py-16">
                        <AlertCircle className="h-8 w-8 text-red-400 mb-4" />
                        <p className="text-red-400 mb-4">Erro ao carregar galerias</p>
                        <Button 
                            variant="outline" 
                            onClick={refreshSettings}
                            className="text-white border-gray-400 hover:bg-white hover:text-black"
                        >
                            Tentar Novamente
                        </Button>
                    </div>
                ) : galleries.length === 0 ? (
                    // Estado quando não há fotos configuradas
                    <div className="flex flex-col items-center justify-center py-16">
                        <ImageIcon className="h-8 w-8 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground text-center">
                            Galeria em breve...
                        </p>
                    </div>
                ) : (
                    // Galerias com fotos configuradas
                    galleries.map((gallery) => (
                      <div key={gallery.id}>
                        <div className="w-full px-4 md:px-8">
                          <Carousel className="w-full" opts={{ loop: true }}>
                              <CarouselContent>
                                  {gallery.photos.map((photo) => (
                                    <CarouselItem key={photo.id} className="basis-full">
                                      <div className="p-1 space-y-2">
                                        <Card className="overflow-hidden border-gray-700 hover:border-gray-400 hover:shadow-lg transition-all duration-300">
                                          <CardContent className="flex aspect-[9/16] items-center justify-center p-0">
                                            <Image
                                                src={photo.src}
                                                alt={`Foto da galeria ${gallery.word}`}
                                                width={400}
                                                height={800}
                                                className="w-full h-full object-cover"
                                                data-ai-hint={photo.hint}
                                              />
                                          </CardContent>
                                        </Card>
                                      </div>
                                    </CarouselItem>
                                  ))}
                              </CarouselContent>
                              <CarouselPrevious className="ml-14 bg-background/50 border-gray-400 text-white hover:bg-white hover:text-black" />
                              <CarouselNext className="mr-14 bg-background/50 border-gray-400 text-white hover:bg-white hover:text-black" />
                          </Carousel>
                          <p className="text-center text-white text-4xl tracking-widest uppercase mt-2">
                            {gallery.word}
                          </p>
                        </div>
                        <Separator className="max-w-xl mx-auto my-8 bg-border/30" />
                      </div>
                    ))
                )}
            </div>
        </>
    );
};

export default GallerySection;
