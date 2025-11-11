"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, Trash2, Image as ImageIcon, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

interface Photo {
    id: string;
    url: string;
    name: string;
    uploadedAt: string;
}

export default function AdminPhotosPage() {
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        loadPhotos();
    }, []);

    const loadPhotos = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/admin/photos');
            if (response.ok) {
                const data = await response.json();
                setPhotos(data.photos || []);
            }
        } catch (error) {
            console.error('Erro ao carregar fotos:', error);
            toast({
                variant: 'destructive',
                title: 'Erro ao carregar fotos',
                description: 'Não foi possível carregar as fotos.'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        const formData = new FormData();

        for (let i = 0; i < files.length; i++) {
            formData.append('photos', files[i]);
        }

        try {
            const response = await fetch('/api/admin/photos', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                toast({
                    title: 'Upload realizado com sucesso!',
                    description: `${files.length} foto(s) enviada(s).`
                });
                loadPhotos();
            } else {
                throw new Error('Erro no upload');
            }
        } catch (error) {
            console.error('Erro ao fazer upload:', error);
            toast({
                variant: 'destructive',
                title: 'Erro no upload',
                description: 'Não foi possível enviar as fotos.'
            });
        } finally {
            setIsUploading(false);
            e.target.value = '';
        }
    };

    const handleDelete = async (photoId: string) => {
        if (!confirm('Tem certeza que deseja excluir esta foto?')) return;

        try {
            const response = await fetch(`/api/admin/photos/${photoId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                toast({
                    title: 'Foto excluída',
                    description: 'A foto foi removida com sucesso.'
                });
                loadPhotos();
            } else {
                throw new Error('Erro ao excluir');
            }
        } catch (error) {
            console.error('Erro ao excluir foto:', error);
            toast({
                variant: 'destructive',
                title: 'Erro ao excluir',
                description: 'Não foi possível excluir a foto.'
            });
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold md:text-2xl">Gerenciar Fotos</h1>
                <Button
                    onClick={loadPhotos}
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Atualizar
                </Button>
            </div>

            {/* Card de Upload */}
            <Card>
                <CardHeader>
                    <CardTitle>Upload de Fotos</CardTitle>
                    <CardDescription>
                        Envie novas fotos para a galeria
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <Label
                                htmlFor="photo-upload"
                                className="cursor-pointer"
                            >
                                <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                                    <Upload className="h-4 w-4" />
                                    <span>Selecionar Fotos</span>
                                </div>
                            </Label>
                            <Input
                                id="photo-upload"
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleUpload}
                                disabled={isUploading}
                                className="hidden"
                            />
                            {isUploading && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Enviando...</span>
                                </div>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Formatos aceitos: JPG, PNG, GIF. Você pode selecionar múltiplas fotos.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Grid de Fotos */}
            <Card>
                <CardHeader>
                    <CardTitle>Galeria ({photos.length} fotos)</CardTitle>
                    <CardDescription>
                        Gerencie suas fotos enviadas
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : photos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">
                                Nenhuma foto enviada ainda
                            </p>
                            <p className="text-sm text-muted-foreground mt-2">
                                Comece enviando algumas fotos usando o botão acima
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {photos.map((photo) => (
                                <div
                                    key={photo.id}
                                    className="relative group aspect-square rounded-lg overflow-hidden border bg-muted"
                                >
                                    <Image
                                        src={photo.url}
                                        alt={photo.name}
                                        fill
                                        className="object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => handleDelete(photo.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                        <p className="text-xs text-white truncate">
                                            {photo.name}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
