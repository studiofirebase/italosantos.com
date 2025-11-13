"use client";

import { useState, useEffect, useRef } from 'react';
import { PlusCircle, Trash2, Edit, Upload, Link as LinkIcon, Image as ImageIcon, Eye, Loader2, Save, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Photo {
    id: string;
    title: string;
    description?: string;
    price?: number;
    photoUrl: string;
    photoStoragePath?: string;
    createdAt?: any;
    updatedAt?: any;
    storageType?: string;
}

export default function AdminFotosPage() {
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [photos, setPhotos] = useState<Photo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [viewingPhoto, setViewingPhoto] = useState<Photo | null>(null);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoUrl, setPhotoUrl] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [activeTab, setActiveTab] = useState("upload");

    const fetchPhotos = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/admin/fotos');
            const data = await response.json();

            if (data.success) {
                console.log('Fotos carregadas:', data.photos);
                setPhotos(data.photos || []);
            } else {
                toast({
                    variant: "destructive",
                    title: "Erro ao carregar fotos",
                    description: data.message || 'Erro desconhecido'
                });
            }
        } catch (error) {
            console.error("Error fetching photos: ", error);
            toast({
                variant: "destructive",
                title: "Erro ao carregar fotos",
                description: "Erro de conexão"
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPhotos();
    }, []);

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setPhotoFile(null);
        setPhotoUrl('');
        setUploadProgress(0);
        setActiveTab("upload");
        setEditingId(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validar tipo de arquivo
            if (!file.type.startsWith('image/')) {
                toast({
                    variant: "destructive",
                    title: "Arquivo inválido",
                    description: "Por favor, selecione um arquivo de imagem válido."
                });
                return;
            }

            // Validar tamanho (máximo 10MB)
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (file.size > maxSize) {
                toast({
                    variant: "destructive",
                    title: "Arquivo muito grande",
                    description: "O arquivo deve ter no máximo 10MB. Para arquivos maiores, use um link externo."
                });
                return;
            }

            setPhotoFile(file);
            setPhotoUrl(''); // Limpar URL se arquivo for selecionado
        }
    };

    const handleSubmit = async () => {
        if (!title.trim()) {
            toast({ variant: "destructive", title: "Título é obrigatório." });
            return;
        }

        if (activeTab === 'upload' && !photoFile && !editingId) {
            toast({ variant: "destructive", title: "Arquivo de foto é obrigatório." });
            return;
        }
        if (activeTab === 'link' && (!photoUrl || !photoUrl.trim())) {
            toast({ variant: "destructive", title: "URL da foto é obrigatória." });
            return;
        }

        setIsSubmitting(true);
        setUploadProgress(0);
        let finalPhotoUrl = photoUrl || '';
        let storageType = 'external';

        try {
            if (activeTab === 'upload' && photoFile && !editingId) {
                console.log('Iniciando upload do arquivo:', photoFile.name, 'Tamanho:', photoFile.size);

                const formData = new FormData();
                formData.append('file', photoFile);
                formData.append('uploadType', 'photo');
                formData.append('title', title.trim());
                formData.append('description', description.trim());
                formData.append('folder', 'photos');

                // Simular progresso
                const progressInterval = setInterval(() => {
                    setUploadProgress(prev => {
                        if (prev >= 90) return prev;
                        return prev + Math.random() * 10;
                    });
                }, 300);

                console.log('Enviando para API de upload...');
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();
                clearInterval(progressInterval);

                if (data.success) {
                    finalPhotoUrl = data.url;
                    storageType = data.storageType || 'api-upload';
                    setUploadProgress(100);
                    console.log('Upload via API bem-sucedido:', finalPhotoUrl);

                    toast({
                        title: "Foto Adicionada!",
                        description: `Foto enviada com sucesso! (${storageType})`,
                    });

                    resetForm();
                    setIsDialogOpen(false);
                    await fetchPhotos();
                    return;
                } else {
                    throw new Error(data.message || 'Falha no upload via API');
                }
            }

            // Para links externos ou edição
            console.log('Salvando foto...');
            const method = editingId ? 'PUT' : 'POST';
            const url = editingId
                ? `/api/admin/fotos/${editingId}`
                : '/api/admin/fotos';

            let finalPhotoUrlForSave = finalPhotoUrl;
            if (editingId && (!finalPhotoUrl || !finalPhotoUrl.trim())) {
                const currentPhoto = photos.find(p => p.id === editingId);
                if (currentPhoto) {
                    finalPhotoUrlForSave = currentPhoto.photoUrl;
                }
            }

            const photoData = {
                title: title.trim(),
                description: (description || '').trim(),
                photoUrl: finalPhotoUrlForSave,
                storageType,
            };

            console.log('Dados da foto:', photoData);

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(photoData)
            });

            const data = await response.json();

            if (data.success) {
                toast({
                    title: editingId ? "Foto Atualizada!" : "Foto Adicionada!",
                    description: editingId
                        ? "Foto atualizada com sucesso!"
                        : "Foto com link externo adicionada com sucesso!",
                });

                resetForm();
                setIsDialogOpen(false);
                await fetchPhotos();
            } else {
                throw new Error(data.message || 'Erro ao salvar foto');
            }

        } catch (error: any) {
            console.error("Erro detalhado ao salvar foto:", error);

            let errorMessage = "Ocorreu um erro ao salvar a foto.";

            if (error.message) {
                errorMessage = error.message;
            }

            toast({
                variant: "destructive",
                title: "Erro ao salvar foto",
                description: errorMessage
            });
        } finally {
            setIsSubmitting(false);
            setUploadProgress(0);
        }
    };

    const handleEdit = (photo: Photo) => {
        setTitle(photo.title);
        setDescription(photo.description || '');
        setPhotoUrl(photo.photoUrl);
        setEditingId(photo.id);

        if (photo.storageType && (photo.storageType === 'firebase-storage' || photo.storageType === 'api-upload')) {
            setActiveTab('upload');
        } else {
            setActiveTab('link');
        }

        setIsDialogOpen(true);
    };

    const handleCancelEdit = () => {
        resetForm();
        setIsDialogOpen(false);
    };

    const handleViewPhoto = (photo: Photo) => {
        setViewingPhoto(photo);
        setIsViewDialogOpen(true);
    };

    const handleDeletePhoto = async (photo: Photo) => {
        if (!confirm("Tem certeza que deseja excluir esta foto? Esta ação é irreversível.")) return;

        try {
            const response = await fetch(`/api/admin/fotos/${photo.id}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                toast({
                    title: "Foto Excluída",
                    description: "Foto removida com sucesso."
                });
                await fetchPhotos();
            } else {
                throw new Error(data.message || 'Erro ao excluir foto');
            }
        } catch (error) {
            console.error("Error deleting photo: ", error);
            toast({
                variant: "destructive",
                title: "Erro ao excluir foto",
                description: "Erro de conexão"
            });
        }
    };

    const formatDate = (date: any) => {
        if (!date) return 'Data não disponível';
        try {
            if (date.toDate) {
                return date.toDate().toLocaleDateString('pt-BR');
            }
            if (date instanceof Date) {
                return date.toLocaleDateString('pt-BR');
            }
            return new Date(date).toLocaleDateString('pt-BR');
        } catch {
            return 'Data não disponível';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Gerenciar Fotos</h1>
                    <p className="text-muted-foreground">
                        Adicione e gerencie fotos para venda avulsa
                    </p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <PlusCircle className="h-4 w-4" />
                            Adicionar Foto
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>{editingId ? 'Editar Foto' : 'Adicionar Nova Foto'}</DialogTitle>
                            <DialogDescription>
                                {editingId
                                    ? 'Edite as informações da foto selecionada.'
                                    : 'Adicione uma nova foto à sua galeria.'
                                }
                            </DialogDescription>
                        </DialogHeader>

                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="upload">Upload de Arquivo</TabsTrigger>
                                <TabsTrigger value="link">Link Externo</TabsTrigger>
                            </TabsList>

                            <TabsContent value="upload" className="space-y-4">
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="photoFile">Arquivo de Foto</Label>
                                        <Input
                                            id="photoFile"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            ref={fileInputRef}
                                            disabled={isSubmitting}
                                        />
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Formatos aceitos: JPG, PNG, WEBP, etc. Máximo 10MB.
                                        </p>
                                    </div>

                                    {uploadProgress > 0 && (
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span>Progresso do upload</span>
                                                <span>{uploadProgress.toFixed(0)}%</span>
                                            </div>
                                            <Progress value={uploadProgress} />
                                        </div>
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="link" className="space-y-4">
                                <div>
                                    <Label htmlFor="photoUrl">URL da Foto</Label>
                                    <Input
                                        id="photoUrl"
                                        type="url"
                                        placeholder="https://exemplo.com/foto.jpg"
                                        value={photoUrl}
                                        onChange={e => setPhotoUrl(e.target.value)}
                                        disabled={isSubmitting}
                                    />
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Cole o link direto da imagem (.jpg, .png, .webp, etc.)
                                    </p>

                                    {/* Preview da URL */}
                                    {photoUrl && photoUrl.trim() && (
                                        <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                                            <div className="text-xs text-gray-600 mb-2">Preview:</div>
                                            <img
                                                src={photoUrl}
                                                alt="Preview"
                                                className="max-h-40 rounded object-contain"
                                                onError={(e) => {
                                                    e.currentTarget.src = 'https://placehold.co/400x300?text=Erro+ao+carregar';
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </TabsContent>
                        </Tabs>

                        <div className="grid gap-4">
                            <div>
                                <Label htmlFor="title">Título *</Label>
                                <Input
                                    id="title"
                                    placeholder="Título da foto"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    disabled={isSubmitting}
                                />
                            </div>

                            <div>
                                <Label htmlFor="description">Descrição</Label>
                                <Textarea
                                    id="description"
                                    placeholder="Descrição da foto"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    rows={3}
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={handleCancelEdit} disabled={isSubmitting}>
                                <X className="h-4 w-4 mr-2" />
                                Cancelar
                            </Button>
                            <Button onClick={handleSubmit} disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Salvando...
                                    </>
                                ) : (
                                    <>
                                        {editingId ? <Save className="h-4 w-4 mr-2" /> : <PlusCircle className="h-4 w-4 mr-2" />}
                                        {editingId ? 'Atualizar Foto' : 'Salvar Foto'}
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ImageIcon className="h-5 w-5" />
                        Fototeca
                    </CardTitle>
                    <CardDescription>
                        Gerencie as fotos disponíveis para venda avulsa no seu site.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : photos.length === 0 ? (
                        <div className="text-center py-10">
                            <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">Nenhuma foto adicionada ainda.</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Clique em &quot;Adicionar Foto&quot; para começar.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {photos.map((photo) => (
                                <Card key={photo.id} className="overflow-hidden">
                                    <CardHeader className="p-0">
                                        <div className="aspect-square bg-muted overflow-hidden relative group">
                                            <img
                                                src={photo.photoUrl}
                                                alt={photo.title}
                                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                                onError={(e) => {
                                                    e.currentTarget.src = 'https://placehold.co/400x400?text=Erro+ao+carregar';
                                                }}
                                            />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    className="gap-2"
                                                    onClick={() => handleViewPhoto(photo)}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                    Visualizar
                                                </Button>
                                            </div>
                                            <Badge className="absolute top-2 right-2">
                                                {photo.storageType === 'firebase-storage' || photo.storageType === 'api-upload' ? 'Storage' : 'Externo'}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4">
                                        <h3 className="font-semibold truncate">{photo.title}</h3>
                                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                            {photo.description || 'Sem descrição'}
                                        </p>
                                        <div className="flex items-center justify-between mt-3">
                                            <p className="text-xs text-muted-foreground">
                                                {formatDate(photo.createdAt)}
                                            </p>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="flex justify-end gap-2 p-4 pt-0">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleEdit(photo)}
                                            disabled={editingId === photo.id}
                                        >
                                            <Edit className="h-3 w-3 mr-1" />
                                            Editar
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => handleDeletePhoto(photo)}
                                            disabled={editingId === photo.id}
                                        >
                                            <Trash2 className="h-3 w-3 mr-1" />
                                            Excluir
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modal para visualizar foto */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>{viewingPhoto?.title}</DialogTitle>
                        <DialogDescription>
                            {viewingPhoto?.description || 'Sem descrição'}
                        </DialogDescription>
                    </DialogHeader>

                    {viewingPhoto && (
                        <div className="space-y-4">
                            <div className="bg-black rounded-lg overflow-hidden flex items-center justify-center min-h-[400px]">
                                <img
                                    src={viewingPhoto.photoUrl}
                                    alt={viewingPhoto.title}
                                    className="max-w-full max-h-[600px] object-contain"
                                    onError={(e) => {
                                        e.currentTarget.src = 'https://placehold.co/800x600?text=Erro+ao+carregar';
                                    }}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <div>
                                        <p className="text-sm text-muted-foreground">
                                            Criado em: {formatDate(viewingPhoto.createdAt)}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Badge>
                                            {viewingPhoto.storageType === 'firebase-storage' || viewingPhoto.storageType === 'api-upload' ? 'Firebase Storage' : 'Link Externo'}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h4 className="font-semibold text-sm">Ações</h4>
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => window.open(viewingPhoto.photoUrl, '_blank')}
                                            className="text-xs"
                                        >
                                            <ExternalLink className="h-3 w-3 mr-1" />
                                            Abrir Original
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                navigator.clipboard.writeText(viewingPhoto.photoUrl);
                                                toast({
                                                    title: "✅ URL Copiada!",
                                                    description: "URL da foto copiada para a área de transferência",
                                                    duration: 2000
                                                });
                                            }}
                                            className="text-xs"
                                        >
                                            📋 Copiar URL
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
