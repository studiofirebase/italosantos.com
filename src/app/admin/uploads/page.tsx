"use client";

import { useState, useEffect, useRef } from 'react';
import { UploadCloud, ClipboardCopy, Link as LinkIcon, Trash2, Loader2, Eye, Send, Inbox, FileImage, ArrowRight, ImageIcon, VideoIcon, FolderOpen, Database, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getStorage, ref, listAll, deleteObject, getMetadata, getDownloadURL, uploadBytes, updateMetadata } from "firebase/storage";
import { app as firebaseApp, db } from '@/lib/firebase';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';
import Image from 'next/image';
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { collection, addDoc, Timestamp, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { Textarea } from "@/components/ui/textarea";

interface UploadedFile {
    id: string;
    name: string;
    url: string;
    fullPath?: string;
    size?: number;
    createdAt: string;
    type: string;
    visibility?: 'public' | 'subscribers' | undefined;
    isSubscriberOnly?: boolean;
    metadata?: {
        visibility?: 'public' | 'subscribers';
        customMetadata?: Record<string, string>;
    };
    source: 'firestore' | 'storage';
    collection?: string;
    title?: string;
    description?: string;
    storageType?: string;
}

export default function AdminUploadsPage() {
    const { toast } = useToast();
    const storage = getStorage(firebaseApp);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [file, setFile] = useState<File | null>(null);
    const [linkUrl, setLinkUrl] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [isLoadingFiles, setIsLoadingFiles] = useState(true);
    const [activeTab, setActiveTab] = useState<'all' | 'exclusive' | 'photos' | 'videos' | 'storage'>('all');
    
    // Estados para gerenciamento de arquivos
    const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
    const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
    const [targetCollection, setTargetCollection] = useState<'photos' | 'videos'>('photos');
    const [actionTitle, setActionTitle] = useState('');
    const [actionDescription, setActionDescription] = useState('');
    const [actionPrice, setActionPrice] = useState(0);
    const [actionVisibility, setActionVisibility] = useState<'public' | 'subscribers'>('public');
    const [isSendingToCollection, setIsSendingToCollection] = useState(false);

    const fetchAllFiles = async () => {
        setIsLoadingFiles(true);
        try {
            const response = await fetch('/api/admin/uploads');
            const data = await response.json();
            
            if (data.success) {
                setUploadedFiles(data.files || []);
            } else {
                console.error("Erro ao buscar arquivos:", data.message);
                toast({ 
                    variant: "destructive", 
                    title: "Falha ao carregar arquivos",
                    description: data.message || 'Erro desconhecido'
                });
            }
        } catch (error) {
            console.error("Erro ao buscar arquivos:", error);
            toast({ 
                variant: "destructive", 
                title: "Falha ao carregar arquivos",
                description: "Erro de conexão"
            });
        } finally {
            setIsLoadingFiles(false);
        }
    };

    useEffect(() => {
        fetchAllFiles();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    // Upload via API (servidor)
    const handleUploadViaAPI = async () => {
        if (!file) {
            toast({ variant: "destructive", title: "Nenhum arquivo selecionado" });
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('visibility', 'public');
        formData.append('isSubscriberOnly', 'false');

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                toast({
                    title: "Upload via API Concluído!",
                    description: "Seu arquivo foi enviado através do servidor.",
                });
                await fetchAllFiles();
            } else {
                throw new Error(data.message || 'Erro no upload');
            }

        } catch (error: any) {
            console.error("Erro no upload via API:", error);
            toast({ 
                variant: "destructive", 
                title: "Erro no Upload via API", 
                description: error.message || "Não foi possível enviar o arquivo."
            });
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
            setFile(null);
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    // Upload direto para Firebase Storage (client-side)
    const handleDirectFirebaseUpload = async () => {
        if (!file) {
            toast({ variant: "destructive", title: "Nenhum arquivo selecionado" });
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
            const fileName = `italosantos.com/general-uploads/${Date.now()}_${sanitizedFileName}`;
            const storageRef = ref(storage, fileName);
            
            // Simular progresso para upload direto
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return prev;
                    }
                    return prev + 10;
                });
            }, 100);

            await uploadBytes(storageRef, file);
            
            // Adicionar metadados básicos sem visibilidade (será definida depois)
            const metadata = {
                customMetadata: {
                    uploadedBy: 'admin',
                    uploadDate: new Date().toISOString()
                }
            };
            await updateMetadata(storageRef, metadata);
            
            setUploadProgress(100);
            clearInterval(progressInterval);

            toast({
                title: "Upload Direto Concluído!",
                description: "Arquivo enviado diretamente para o Firebase Storage.",
            });
            
            await fetchAllFiles();

        } catch (error: any) {
            console.error("Erro no upload direto:", error);
            toast({ 
                variant: "destructive", 
                title: "Erro no Upload Direto", 
                description: "Não foi possível enviar o arquivo diretamente." 
            });
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
            setFile(null);
            setIsUploading(false);
            setUploadProgress(0);
        }
    };
    
    const handleImportFromLink = async () => {
        if(!linkUrl || !URL.canParse(linkUrl)) {
            toast({ variant: "destructive", title: "URL Inválida", description: "Por favor, insira um link válido." });
            return;
        }
        
        setIsImporting(true);
        toast({ title: "Importando mídia...", description: "Isso pode levar alguns segundos."});
        try {
            const response = await fetch('/api/import-from-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: linkUrl }),
            });
            
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Falha ao importar o arquivo.');
            }
            
            toast({ title: "Importação Concluída!", description: `Arquivo salvo como ${result.fileName}`});
            setLinkUrl('');
            await fetchAllFiles();

        } catch (error: any) {
             toast({ variant: "destructive", title: "Erro na Importação", description: error.message });
        } finally {
            setIsImporting(false);
        }
    }

    const handleDelete = async (file: UploadedFile) => {
        if (!confirm("Tem certeza que deseja excluir este arquivo? A ação é irreversível.")) return;
        
        try {
            // Usar a API para deletar o arquivo
            const response = await fetch(`/api/file/${file.collection || 'photos'}/${file.id}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                toast({ title: "Arquivo Excluído!" });
                await fetchAllFiles();
            } else {
                throw new Error(data.message || 'Erro ao excluir arquivo');
            }
        } catch (error) {
             console.error("Erro ao excluir: ", error);
             toast({ 
                 variant: "destructive", 
                 title: "Erro ao Excluir",
                 description: error instanceof Error ? error.message : 'Erro desconhecido'
             });
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Link copiado!" });
    };

    const isImageFile = (type: string) => {
        return type.startsWith('image/');
    };

    const formatFileSize = (bytes: number) => {
        if (!bytes) return '0 MB';
        return (bytes / 1024 / 1024).toFixed(2);
    };

    const getFileTypeColor = (type: string) => {
        if (type.startsWith('image/')) return 'bg-green-100 text-green-800';
        if (type.startsWith('video/')) return 'bg-blue-100 text-blue-800';
        if (type.startsWith('audio/')) return 'bg-purple-100 text-purple-800';
        return 'bg-gray-100 text-gray-800';
    };

    const getSourceColor = (source: string) => {
        if (source === 'firestore') return 'bg-blue-100 text-blue-800';
        if (source === 'storage') return 'bg-orange-100 text-orange-800';
        return 'bg-gray-100 text-gray-800';
    };

    const getCollectionColor = (collection?: string) => {
        if (collection === 'exclusiveContent') return 'bg-purple-100 text-purple-800';
        if (collection === 'photos') return 'bg-green-100 text-green-800';
        if (collection === 'videos') return 'bg-red-100 text-red-800';
        return 'bg-gray-100 text-gray-800';
    };

    // Filtrar arquivos baseado na aba ativa
    const filteredFiles = uploadedFiles.filter(file => {
        switch (activeTab) {
            case 'exclusive':
                return file.collection === 'exclusiveContent';
            case 'photos':
                return file.collection === 'photos';
            case 'videos':
                return file.collection === 'videos';
            case 'storage':
                return file.source === 'storage';
            default:
                return true; // 'all'
        }
    });

    // Função para abrir o diálogo de gerenciamento
    const handleManageFile = (file: UploadedFile) => {
        setSelectedFile(file);
        setActionTitle(file.title || file.name.replace(/\.[^/.]+$/, ""));
        setActionDescription(file.description || '');
        setActionPrice(0);
        setActionVisibility(file.visibility || 'public');
        setTargetCollection(file.type.startsWith('video/') ? 'videos' : 'photos');
        setIsManageDialogOpen(true);
    };

    // Função para enviar arquivo para a coleção específica
    const handleSendToCollection = async () => {
        if (!selectedFile) return;

        setIsSendingToCollection(true);
        try {
            if (targetCollection === 'photos') {
                // Adicionar à coleção de fotos
                await addDoc(collection(db, "photos"), {
                    title: actionTitle,
                    imageUrl: selectedFile.url,
                    storagePath: selectedFile.fullPath,
                    visibility: actionVisibility,
                    isSubscriberOnly: actionVisibility === 'subscribers',
                    createdAt: Timestamp.now(),
                    uploadedFrom: 'admin-uploads'
                });
                toast({
                    title: "Foto Adicionada!",
                    description: `A foto "${actionTitle}" foi adicionada à galeria de fotos com visibilidade ${actionVisibility === 'public' ? 'pública' : 'para assinantes'}.`,
                });
            } else {
                // Adicionar à coleção de vídeos
                await addDoc(collection(db, "videos"), {
                    title: actionTitle,
                    description: actionDescription,
                    price: actionPrice,
                    videoUrl: selectedFile.url,
                    thumbnailUrl: selectedFile.type.startsWith('video/') ? 'https://placehold.co/600x400.png' : selectedFile.url,
                    videoStoragePath: selectedFile.fullPath,
                    visibility: actionVisibility,
                    isSubscriberOnly: actionVisibility === 'subscribers',
                    createdAt: Timestamp.now(),
                    uploadedFrom: 'admin-uploads'
                });
                toast({
                    title: "Vídeo Adicionado!",
                    description: `O vídeo "${actionTitle}" foi adicionado à galeria de vídeos com visibilidade ${actionVisibility === 'public' ? 'pública' : 'para assinantes'}.`,
                });
            }

            // Atualizar metadados do arquivo no Storage para indicar que foi processado
            if (selectedFile.fullPath) {
                const fileRef = ref(storage, selectedFile.fullPath);
                await updateMetadata(fileRef, {
                    customMetadata: {
                        ...selectedFile.metadata?.customMetadata,
                        processedToCollection: targetCollection,
                        processedAt: new Date().toISOString(),
                        visibility: actionVisibility
                    }
                });
            }

            setIsManageDialogOpen(false);
            setSelectedFile(null);
            await fetchAllFiles(); // Refresh da lista

        } catch (error: any) {
            console.error("Erro ao enviar arquivo para coleção:", error);
            toast({
                variant: "destructive",
                title: "Erro ao processar arquivo",
                description: `Não foi possível adicionar o arquivo à coleção.\n\n${error?.message || error}`,
            });
        } finally {
            setIsSendingToCollection(false);
        }
    };

    return (
        <div className="space-y-4 md:space-y-6 p-4 md:p-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                        <Database className="h-5 w-5 md:h-6 md:w-6" />
                        <span className="hidden sm:inline">Gerenciador Completo de Arquivos - Admin</span>
                        <span className="sm:hidden">Gerenciador de Arquivos</span>
                    </CardTitle>
                    <CardDescription className="text-sm md:text-base">
                       <span className="hidden md:block">
                           Visualize todos os arquivos enviados através do painel admin, incluindo conteúdo exclusivo, fotos, vídeos e arquivos do Firebase Storage.
                           <br />
                           <span className="text-blue-600 font-medium mt-2 block">
                               📁 Fontes: Firestore (exclusiveContent, photos, videos) • Firebase Storage (uploads)
                           </span>
                       </span>
                       <span className="md:hidden">
                           Gerencie todos os arquivos do sistema em um só lugar.
                       </span>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="direct" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="direct" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                                <UploadCloud className="h-3 w-3 md:h-4 md:w-4" />
                                <span className="hidden sm:inline">Upload Direto</span>
                                <span className="sm:hidden">Upload</span>
                            </TabsTrigger>
                            <TabsTrigger value="link" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                                <Inbox className="h-3 w-3 md:h-4 md:w-4" />
                                <span className="hidden sm:inline">Importar Link</span>
                                <span className="sm:hidden">Link</span>
                            </TabsTrigger>
                        </TabsList>
                        
                        
                        <TabsContent value="direct">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base md:text-lg flex items-center gap-2 flex-wrap">
                                        <span className="flex items-center gap-2">
                                            Upload Direto ao Firebase
                                            <Badge className="bg-green-100 text-green-800 text-xs">Recomendado</Badge>
                                        </span>
                                    </CardTitle>
                                    <CardDescription className="text-sm">
                                        <span className="hidden md:block">
                                            Envio direto do navegador para o Firebase Storage (mais rápido e confiável)
                                            <br />
                                            <span className="text-green-600 font-medium">
                                                ✅ Funciona sem configuração adicional no servidor
                                            </span>
                                        </span>
                                        <span className="md:hidden">
                                            Upload direto e rápido para o Firebase Storage.
                                        </span>
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <Label htmlFor="file-upload-direct">Selecione um arquivo</Label>
                                        <Input 
                                            id="file-upload-direct" 
                                            type="file" 
                                            onChange={handleFileChange} 
                                            className="mt-1" 
                                            disabled={isUploading}
                                        />
                                    </div>
                                    
                                    {file && (
                                        <div className="p-3 bg-muted rounded-lg">
                                            <p className="text-sm font-medium">{file.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatFileSize(file.size)} MB • {file.type}
                                            </p>
                                        </div>
                                    )}
                                    {isUploading && (
                                        <div className="space-y-2">
                                            <Progress value={uploadProgress} className="w-full" />
                                            <p className="text-sm text-muted-foreground text-center">
                                                {uploadProgress}% concluído
                                            </p>
                                        </div>
                                    )}
                                    <Button onClick={handleDirectFirebaseUpload} disabled={!file || isUploading} className="w-full">
                                        {isUploading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                                Upload Direto...
                                            </>
                                        ) : (
                                            <>
                                                <UploadCloud className="mr-2 h-4 w-4"/>
                                                Upload Direto Firebase
                                            </>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* TabsContent value="upload" - COMENTADO TEMPORARIAMENTE
                        <TabsContent value="upload">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Upload via Servidor (API)</CardTitle>
                                    <CardDescription>
                                        Envio através do servidor backend com processamento de metadados
                                        <br />
                                        <span className="text-amber-600 font-medium">
                                            ⚠️ Requer configuração de Service Account. Use "Upload Direto" se houver erros.
                                        </span>
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <Label htmlFor="file-upload-api">Selecione um arquivo</Label>
                                        <Input 
                                            ref={fileInputRef} 
                                            id="file-upload-api" 
                                            type="file" 
                                            onChange={handleFileChange} 
                                            className="mt-1" 
                                            disabled={isUploading}
                                        />
                                    </div>
                                    
                                    {file && (
                                        <div className="p-3 bg-muted rounded-lg">
                                            <p className="text-sm font-medium">{file.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatFileSize(file.size)} MB • {file.type}
                                            </p>
                                        </div>
                                    )}
                                    {isUploading && (
                                        <div className="space-y-2">
                                            <Progress value={uploadProgress} className="w-full" />
                                            <p className="text-sm text-muted-foreground text-center">
                                                {uploadProgress}% concluído
                                            </p>
                                        </div>
                                    )}
                                    <Button onClick={handleUploadViaAPI} disabled={!file || isUploading} className="w-full">
                                        {isUploading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                                Enviando via API...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="mr-2 h-4 w-4"/>
                                                Enviar via Servidor
                                            </>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>
                        </TabsContent>
                        */}

                        <TabsContent value="link">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Importar de Link Externo</CardTitle>
                                    <CardDescription>
                                        Baixe e salve arquivos de URLs externas
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <Label htmlFor="link-url">URL da Mídia</Label>
                                        <Input 
                                            id="link-url" 
                                            type="url" 
                                            placeholder="https://exemplo.com/imagem.jpg" 
                                            value={linkUrl} 
                                            onChange={(e) => setLinkUrl(e.target.value)} 
                                            className="mt-1" 
                                            disabled={isImporting} 
                                        />
                                    </div>
                                    <Button onClick={handleImportFromLink} disabled={!linkUrl || isImporting} className="w-full">
                                        {isImporting ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                                Importando...
                                            </>
                                        ) : (
                                            <>
                                                <LinkIcon className="mr-2 h-4 w-4"/>
                                                Importar via Link
                                            </>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileImage className="h-5 w-5" />
                        Todos os Arquivos do Admin
                    </CardTitle>
                    <CardDescription>
                        Lista completa de todos os arquivos enviados através do painel admin, organizados por fonte e coleção.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Tabs para filtrar arquivos */}
                    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full mb-4">
                        <TabsList className="grid w-full grid-cols-5">
                            <TabsTrigger value="all" className="flex items-center gap-2">
                                <Database className="h-4 w-4" />
                                Todos
                            </TabsTrigger>
                            <TabsTrigger value="exclusive" className="flex items-center gap-2">
                                <ImageIcon className="h-4 w-4" />
                                Exclusivo
                            </TabsTrigger>
                            <TabsTrigger value="photos" className="flex items-center gap-2">
                                <ImageIcon className="h-4 w-4" />
                                Fotos
                            </TabsTrigger>
                            <TabsTrigger value="videos" className="flex items-center gap-2">
                                <VideoIcon className="h-4 w-4" />
                                Vídeos
                            </TabsTrigger>
                            <TabsTrigger value="storage" className="flex items-center gap-2">
                                <Store className="h-4 w-4" />
                                Storage
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {isLoadingFiles ? (
                        <div className="flex justify-center items-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="hidden md:table-cell">Preview</TableHead>
                                        <TableHead>Nome/Título</TableHead>
                                        <TableHead className="hidden lg:table-cell">Tipo</TableHead>
                                        <TableHead className="hidden lg:table-cell">Fonte</TableHead>
                                        <TableHead className="hidden xl:table-cell">Coleção</TableHead>
                                        <TableHead className="hidden md:table-cell">Tamanho</TableHead>
                                        <TableHead className="hidden lg:table-cell">Visibilidade</TableHead>
                                        <TableHead className="hidden xl:table-cell">Criado em</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                            <TableBody>
                                {filteredFiles.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                                            Nenhum arquivo encontrado nesta categoria.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredFiles.map((f) => (
                                        <TableRow key={`${f.source}-${f.id}`}>
                                            <TableCell className="hidden md:table-cell">
                                                {isImageFile(f.type) ? (
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <button className="hover:opacity-80 transition-opacity">
                                                                <Image 
                                                                    src={f.url} 
                                                                    alt={f.name}
                                                                    width={50} 
                                                                    height={50} 
                                                                    className="rounded object-cover"
                                                                />
                                                            </button>
                                                        </DialogTrigger>
                                                        <DialogContent className="max-w-3xl">
                                                            <Image 
                                                                src={f.url} 
                                                                alt={f.name}
                                                                width={800} 
                                                                height={600} 
                                                                className="rounded object-contain w-full h-auto"
                                                            />
                                                        </DialogContent>
                                                    </Dialog>
                                                ) : (
                                                    <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                                                        <VideoIcon className="h-6 w-6 text-muted-foreground" />
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                <div className="max-w-[150px] md:max-w-xs truncate" title={f.title || f.name}>
                                                    {f.title || f.name}
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell">
                                                <Badge className={getFileTypeColor(f.type)}>
                                                    {f.type.split('/')[0]}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell">
                                                <Badge className={getSourceColor(f.source)}>
                                                    {f.source === 'firestore' ? 'Firestore' : 'Storage'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="hidden xl:table-cell">
                                                <Badge className={getCollectionColor(f.collection)}>
                                                    {f.collection || 'N/A'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">{formatFileSize(f.size || 0)} MB</TableCell>
                                            <TableCell className="hidden lg:table-cell">
                                                <Badge variant={f.visibility === 'public' ? 'default' : 'secondary'}>
                                                    {f.visibility === 'public' ? 'Público' : 'Assinantes'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="hidden xl:table-cell">
                                                {format(new Date(f.createdAt), "dd/MM/yyyy HH:mm")}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex gap-1 justify-end flex-wrap">
                                                    {f.source === 'storage' && !f.metadata?.customMetadata?.processedToCollection && (
                                                        <Button 
                                                            variant="outline" 
                                                            size="icon" 
                                                            onClick={() => handleManageFile(f)}
                                                            title="Gerenciar Arquivo"
                                                            className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 h-8 w-8 md:h-10 md:w-10"
                                                        >
                                                            <FolderOpen className="h-3 w-3 md:h-4 md:w-4" />
                                                        </Button>
                                                    )}
                                                    <Button 
                                                        variant="outline" 
                                                        size="icon" 
                                                        onClick={() => window.open(f.url, '_blank')}
                                                        title="Visualizar"
                                                        className="h-8 w-8 md:h-10 md:w-10"
                                                    >
                                                        <Eye className="h-3 w-3 md:h-4 md:w-4" />
                                                    </Button>
                                                    <Button 
                                                        variant="outline" 
                                                        size="icon" 
                                                        onClick={() => copyToClipboard(f.url)}
                                                        title="Copiar Link"
                                                        className="h-8 w-8 md:h-10 md:w-10"
                                                    >
                                                        <ClipboardCopy className="h-3 w-3 md:h-4 md:w-4" />
                                                    </Button>
                                                    <Button 
                                                        variant="destructive" 
                                                        size="icon" 
                                                        onClick={() => handleDelete(f)}
                                                        title="Excluir"
                                                        className="h-8 w-8 md:h-10 md:w-10"
                                                    >
                                                        <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Diálogo de Gerenciamento de Arquivos */}
            <Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
                <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FolderOpen className="h-5 w-5" />
                            Gerenciar Arquivo
                        </DialogTitle>
                    </DialogHeader>
                    
                    {selectedFile && (
                        <div className="space-y-6">
                            {/* Preview do arquivo */}
                            <div className="flex flex-col md:flex-row items-start gap-4 p-4 bg-muted/50 rounded-lg">
                                <div className="flex-shrink-0">
                                    {selectedFile.type.startsWith('image/') ? (
                                        <Image 
                                            src={selectedFile.url} 
                                            alt={selectedFile.name}
                                            width={80} 
                                            height={80} 
                                            className="rounded object-cover"
                                        />
                                    ) : selectedFile.type.startsWith('video/') ? (
                                        <div className="w-20 h-20 bg-blue-100 rounded flex items-center justify-center">
                                            <VideoIcon className="h-8 w-8 text-blue-600" />
                                        </div>
                                    ) : (
                                        <div className="w-20 h-20 bg-gray-100 rounded flex items-center justify-center">
                                            <FileImage className="h-8 w-8 text-gray-600" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-medium truncate">{selectedFile.title || selectedFile.name}</h4>
                                    <p className="text-sm text-muted-foreground">
                                        {selectedFile.type} • {formatFileSize(selectedFile.size || 0)} MB
                                    </p>
                                    <Badge className={getFileTypeColor(selectedFile.type)} variant="secondary">
                                        {selectedFile.type.split('/')[0]}
                                    </Badge>
                                </div>
                            </div>

                            {/* Seleção de destino */}
                            <div className="space-y-4">
                                <div>
                                    <Label>Enviar para qual seção?</Label>
                                    <Select 
                                        value={targetCollection} 
                                        onValueChange={(value: 'photos' | 'videos') => setTargetCollection(value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione o destino" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="photos">
                                                <div className="flex items-center gap-2">
                                                    <ImageIcon className="h-4 w-4" />
                                                    <span>Galeria de Fotos</span>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="videos">
                                                <div className="flex items-center gap-2">
                                                    <VideoIcon className="h-4 w-4" />
                                                    <span>Galeria de Vídeos</span>
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Configurações */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="action-title">Título</Label>
                                        <Input
                                            id="action-title"
                                            value={actionTitle}
                                            onChange={(e) => setActionTitle(e.target.value)}
                                            placeholder="Digite um título"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Visibilidade</Label>
                                        <Select 
                                            value={actionVisibility} 
                                            onValueChange={(value: 'public' | 'subscribers') => setActionVisibility(value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione a visibilidade" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="public">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                        <span>Público</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="subscribers">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                                        <span>Apenas Assinantes</span>
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Campos específicos para vídeos */}
                                {targetCollection === 'videos' && (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="action-description">Descrição</Label>
                                            <Textarea
                                                id="action-description"
                                                value={actionDescription}
                                                onChange={(e) => setActionDescription(e.target.value)}
                                                placeholder="Digite uma descrição para o vídeo"
                                                rows={3}
                                                className="min-h-[80px]"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="action-price">Preço (R$)</Label>
                                            <Input
                                                id="action-price"
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={actionPrice}
                                                onChange={(e) => setActionPrice(parseFloat(e.target.value) || 0)}
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </>
                                )}

                                {/* Informações de visibilidade */}
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div className="flex items-start gap-2">
                                        <div className={`w-2 h-2 rounded-full mt-2 ${
                                            actionVisibility === 'subscribers' ? 'bg-yellow-500' : 'bg-green-500'
                                        }`}></div>
                                        <div>
                                            <p className="text-sm font-medium text-blue-900">
                                                {actionVisibility === 'subscribers' ? 'Conteúdo para Assinantes' : 'Conteúdo Público'}
                                            </p>
                                            <p className="text-xs text-blue-700">
                                                {actionVisibility === 'subscribers' 
                                                    ? 'Apenas usuários com assinatura ativa poderão visualizar este conteúdo.'
                                                    : 'Todos os visitantes poderão visualizar este conteúdo.'
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="flex flex-col sm:flex-row gap-2">
                        <Button 
                            variant="outline" 
                            onClick={() => setIsManageDialogOpen(false)}
                            disabled={isSendingToCollection}
                            className="w-full sm:w-auto"
                        >
                            Cancelar
                        </Button>
                        <Button 
                            onClick={handleSendToCollection}
                            disabled={!actionTitle || isSendingToCollection}
                            className="w-full sm:w-auto"
                        >
                            {isSendingToCollection ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    <ArrowRight className="mr-2 h-4 w-4" />
                                    <span className="hidden sm:inline">Enviar para {targetCollection === 'photos' ? 'Fotos' : 'Vídeos'}</span>
                                    <span className="sm:hidden">Enviar</span>
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
