
"use client";

import { useState, useEffect, useRef } from 'react';
import { PlusCircle, Trash2, Edit, Upload, Link as LinkIcon, Video, Eye, Play, Loader2, AlertCircle, Save, X, ExternalLink } from "lucide-react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SmartVideoPlayer, { SmartVideoThumbnail } from '@/components/smart-video-player';
import { processVideoUrl, detectContentType, isValidUrl } from '@/utils/video-url-processor';
import { useEnvironment } from '@/hooks/use-environment';
import { isFeatureEnabled } from '@/utils/build-config';

interface Video {
  id: string;
  title: string;
  description?: string;
  price?: number;
  videoUrl: string;
  thumbnailUrl?: string;
  videoStoragePath?: string;
  thumbnailStoragePath?: string;
  createdAt?: any;
  updatedAt?: any;
  storageType?: string;
}

export default function AdminVideosPage() {
  const { toast } = useToast();
  const environment = useEnvironment();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewingVideo, setViewingVideo] = useState<Video | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState('');

  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState("upload");

  const fetchVideos = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/videos');
      const data = await response.json();
      
      if (data.success) {
        console.log('Vídeos carregados:', data.videos);
        setVideos(data.videos || []);
      } else {
        toast({
          variant: "destructive",
          title: "Erro ao carregar vídeos",
          description: data.message || 'Erro desconhecido'
        });
      }
    } catch (error) {
      console.error("Error fetching videos: ", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar vídeos",
        description: "Erro de conexão"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const resetForm = () => {
    setTitle('');
    setDescription('');

    setVideoFile(null);
    setVideoUrl('');

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
      if (!file.type.startsWith('video/')) {
        toast({
          variant: "destructive",
          title: "Arquivo inválido",
          description: "Por favor, selecione um arquivo de vídeo válido."
        });
        return;
      }

      // Validar tamanho (máximo 2GB)
      const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
      if (file.size > maxSize) {
        toast({
          variant: "destructive",
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 2GB. Para arquivos maiores, use um link externo."
        });
        return;
      }

      setVideoFile(file);
      setVideoUrl(''); // Limpar URL se arquivo for selecionado
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({ variant: "destructive", title: "Título é obrigatório." });
      return;
    }

    if (activeTab === 'upload' && !videoFile && !editingId) {
      toast({ variant: "destructive", title: "Arquivo de vídeo é obrigatório." });
      return;
    }
    if (activeTab === 'link' && (!videoUrl || !videoUrl.trim())) {
      toast({ variant: "destructive", title: "URL do vídeo é obrigatória." });
      return;
    }
    
    // Validar URL se for link externo
    if (activeTab === 'link' && videoUrl) {
      if (!isValidUrl(videoUrl)) {
        toast({ variant: "destructive", title: "URL inválida. Verifique o formato da URL." });
        return;
      }
    }
    
    // Para edição, se não há arquivo nem URL, mas há editingId, permitir (vai usar a URL existente)
    if (editingId && activeTab === 'upload' && !videoFile && (!videoUrl || !videoUrl.trim())) {
      // Permitir edição sem novo arquivo ou URL
    }

    setIsSubmitting(true);
    setUploadProgress(0);
    let finalVideoUrl = videoUrl || '';
    let storageType = 'external';

    try {
      if (activeTab === 'upload' && videoFile && !editingId) {
        console.log('Iniciando upload do arquivo:', videoFile.name, 'Tamanho:', videoFile.size);
        
        // Usar apenas a API de upload que já funciona
        const formData = new FormData();
        formData.append('file', videoFile);
        formData.append('uploadType', 'video');
        formData.append('title', title.trim());
        formData.append('description', description.trim());

        formData.append('folder', 'videos');
        
        // Simular progresso
        const isLargeFile = videoFile.size > 50 * 1024 * 1024; // 50MB
        let progressInterval: NodeJS.Timeout | undefined = undefined;
        
        if (isLargeFile) {
          progressInterval = setInterval(() => {
            setUploadProgress(prev => {
              if (prev >= 90) return prev;
              return prev + Math.random() * 10;
            });
          }, 500);
        }

        console.log('Enviando para API de upload...');
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
          finalVideoUrl = data.url;
          storageType = data.storageType || 'api-upload';
          setUploadProgress(100);
          console.log('Upload via API bem-sucedido:', finalVideoUrl);
          
          // Se o upload foi bem-sucedido, não precisamos salvar novamente na coleção videos
          // A API de upload já salvou na coleção correta
          toast({
            title: "Vídeo Adicionado!",
            description: `Vídeo enviado com sucesso! (${storageType})`,
          });
          
          resetForm();
          setIsDialogOpen(false);
          await fetchVideos();
          return; // Sair da função aqui para evitar duplicação
        } else {
          throw new Error(data.message || 'Falha no upload via API');
        }
        
        if (progressInterval) {
          clearInterval(progressInterval);
        }
      }

      // Para links externos ou edição
      console.log('Salvando vídeo...');
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId 
        ? `/api/admin/videos/${editingId}`
        : '/api/admin/videos';
      
      // Para edição, se não há nova URL mas há editingId, usar a URL existente
      let finalVideoUrlForSave = finalVideoUrl;
      if (editingId && (!finalVideoUrl || !finalVideoUrl.trim())) {
        // Buscar o vídeo atual para pegar a URL existente
        const currentVideo = videos.find(v => v.id === editingId);
        if (currentVideo) {
          finalVideoUrlForSave = currentVideo.videoUrl;
        }
      }
      
      const videoData = {
        title: title.trim(),
        description: (description || '').trim(),

        videoUrl: finalVideoUrlForSave,
        thumbnailUrl: '', // Sempre vazio para usar thumbnail nativa
        storageType,
      };
      
      console.log('Dados do vídeo:', videoData);
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(videoData)
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: editingId ? "Vídeo Atualizado!" : "Vídeo Adicionado!",
          description: editingId 
            ? "Vídeo atualizado com sucesso!"
            : "Vídeo com link externo adicionado com sucesso!",
        });
        
        resetForm();
        setIsDialogOpen(false);
        await fetchVideos();
      } else {
        throw new Error(data.message || 'Erro ao salvar vídeo');
      }
      
    } catch (error: any) {
      console.error("Erro detalhado ao salvar vídeo:", error);
      
      let errorMessage = "Ocorreu um erro ao salvar o vídeo.";
      let suggestion = "";
      
      if (error.code === 'storage/unauthorized') {
        errorMessage = "Acesso negado ao Firebase Storage.";
        suggestion = "Verifique as regras de segurança do Storage.";
      } else if (error.code === 'storage/quota-exceeded') {
        errorMessage = "Quota do Firebase Storage excedida.";
        suggestion = "Use um link externo ou libere espaço.";
      } else if (error.code === 'storage/invalid-format') {
        errorMessage = "Formato de arquivo inválido.";
        suggestion = "Use apenas arquivos de vídeo válidos.";
      } else if (error.code === 'storage/retry-limit-exceeded') {
        errorMessage = "Tempo limite excedido no upload.";
        suggestion = "Tente novamente ou use um link externo.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        variant: "destructive",
        title: "Erro ao salvar vídeo",
        description: suggestion ? `${errorMessage}\n\n💡 ${suggestion}` : errorMessage
      });
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const handleEdit = (video: Video) => {
    setTitle(video.title);
    setDescription(video.description || '');

    setVideoUrl(video.videoUrl);

    setEditingId(video.id);
    
    // Determinar a aba baseada no tipo de vídeo
    // Se o vídeo tem storageType que indica upload, usar aba upload
    if (video.storageType && (video.storageType === 'firebase-storage' || video.storageType === 'api-upload')) {
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

  const handleViewVideo = (video: Video) => {
    setViewingVideo(video);
    setIsViewDialogOpen(true);
  };

  const handleDeleteVideo = async (video: Video) => {
    if (!confirm("Tem certeza que deseja excluir este vídeo? Esta ação é irreversível.")) return;
    
    try {
      const response = await fetch(`/api/admin/videos/${video.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Vídeo Excluído",
          description: "Vídeo removido com sucesso."
        });
        await fetchVideos();
      } else {
        throw new Error(data.message || 'Erro ao excluir vídeo');
      }
    } catch (error) {
      console.error("Error deleting video: ", error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir vídeo",
        description: "Erro de conexão"
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 MB';
    return (bytes / 1024 / 1024).toFixed(2);
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
          <h1 className="text-2xl font-bold">Gerenciar Vídeos</h1>
          <p className="text-muted-foreground">
            Adicione e gerencie vídeos para venda avulsa
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <PlusCircle className="h-4 w-4" />
              Adicionar Vídeo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Vídeo' : 'Adicionar Novo Vídeo'}</DialogTitle>
              <DialogDescription>
                {editingId 
                  ? 'Edite as informações do vídeo selecionado.'
                  : 'Adicione um novo vídeo à sua videoteca.'
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
                    <Label htmlFor="videoFile">Arquivo de Vídeo</Label>
                    <Input
                      id="videoFile"
                      type="file"
                      accept="video/*"
                      onChange={handleFileChange}
                      ref={fileInputRef}
                      disabled={isSubmitting}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Formatos aceitos: MP4, AVI, MOV, etc. Máximo 2GB.
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
                  <Label htmlFor="videoUrl">URL do Vídeo</Label>
                  <Input
                    id="videoUrl"
                    type="url"
                    placeholder="https://youtube.com/watch?v=... ou https://vimeo.com/..."
                    value={videoUrl}
                    onChange={e => setVideoUrl(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <p className="text-sm text-blue-600 mt-1">
                    ✅ Suporte completo: <strong>YouTube</strong>, <strong>Vimeo</strong>, <strong>Dailymotion</strong>, Google Drive
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Também aceita links diretos de vídeo (.mp4, .webm, etc.)
                  </p>
                  
                  {/* Preview da URL */}
                  {videoUrl && isValidUrl(videoUrl) && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                      <div className="text-xs text-gray-600 mb-2">Preview:</div>
                      {(() => {
                        const videoInfo = processVideoUrl(videoUrl);
                        return (
                          <div className="flex items-center gap-2">
                            <Badge variant={videoInfo.platform === 'unknown' ? 'secondary' : 'default'}>
                              {videoInfo.platform === 'youtube' && '📺 YouTube'}
                              {videoInfo.platform === 'vimeo' && '🎬 Vimeo'}
                              {videoInfo.platform === 'dailymotion' && '📹 Dailymotion'}
                              {videoInfo.platform === 'direct' && '🎥 Vídeo Direto'}
                              {videoInfo.platform === 'unknown' && '🔗 Link Externo'}
                            </Badge>
                            {videoInfo.isEmbeddable && (
                              <Badge variant="outline" className="text-green-600 border-green-300">
                                ✅ Embed Suportado
                              </Badge>
                            )}
                          </div>
                        );
                      })()}
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
                  placeholder="Título do vídeo"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Descrição do vídeo"
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
                    {editingId ? 'Atualizar Vídeo' : 'Salvar Vídeo'}
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
            <Video className="h-5 w-5" />
            Videoteca
          </CardTitle>
          <CardDescription>
            Gerencie os vídeos disponíveis para venda avulsa no seu site.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : videos.length === 0 ? (
            <div className="text-center py-10">
              <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum vídeo adicionado ainda.</p>
              <p className="text-sm text-muted-foreground mt-1">
                  Clique em &quot;Adicionar Vídeo&quot; para começar.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {videos.map((video) => (
                <Card key={video.id} className="overflow-hidden">
                  <CardHeader className="p-0">
                    <div className="aspect-video bg-muted overflow-hidden relative group">
                      <SmartVideoThumbnail
                        url={video.videoUrl}
                        title={video.title}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="gap-2"
                          onClick={() => handleViewVideo(video)}
                        >
                          <Play className="h-4 w-4" />
                          Visualizar
                        </Button>
                      </div>
                      <Badge className="absolute top-2 right-2">
                        {(() => {
                          const videoInfo = processVideoUrl(video.videoUrl);
                          return videoInfo.platform === 'youtube' ? '📺 YouTube' :
                                 videoInfo.platform === 'vimeo' ? '🎬 Vimeo' :
                                 videoInfo.platform === 'dailymotion' ? '📹 Dailymotion' :
                                 videoInfo.platform === 'direct' ? '🎥 Direto' :
                                 video.storageType === 'firebase-storage' ? 'Storage' : 'Externo';
                        })()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <h3 className="font-semibold truncate">{video.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {video.description || 'Sem descrição'}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-xs text-muted-foreground">
                        {formatDate(video.createdAt)}
                      </p>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end gap-2 p-4 pt-0">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEdit(video)}
                      disabled={editingId === video.id}
                    >
                      <Edit className="h-3 w-3 mr-1" /> 
                      Editar
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => handleDeleteVideo(video)}
                      disabled={editingId === video.id}
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

      {/* Modal para visualizar vídeo */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{viewingVideo?.title}</DialogTitle>
            <DialogDescription>
              {viewingVideo?.description || 'Sem descrição'}
            </DialogDescription>
          </DialogHeader>
          
          {viewingVideo && (
            <div className="space-y-4">
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <SmartVideoPlayer
                  url={viewingVideo.videoUrl}
                  title={viewingVideo.title}
                  showControls={true}
                  className="w-full h-full"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Criado em: {formatDate(viewingVideo.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge>
                      {(() => {
                        const videoInfo = processVideoUrl(viewingVideo.videoUrl);
                        return videoInfo.platform === 'youtube' ? '📺 YouTube' :
                               videoInfo.platform === 'vimeo' ? '🎬 Vimeo' :
                               videoInfo.platform === 'dailymotion' ? '📹 Dailymotion' :
                               videoInfo.platform === 'direct' ? '🎥 Vídeo Direto' :
                               viewingVideo.storageType === 'firebase-storage' ? 'Firebase Storage' : 'Link Externo';
                      })()}
                    </Badge>
                    {processVideoUrl(viewingVideo.videoUrl).isEmbeddable && (
                      <Badge variant="outline" className="text-green-600 border-green-300">
                        ✅ Embed
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Ações</h4>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(viewingVideo.videoUrl, '_blank')}
                      className="text-xs"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Abrir Original
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(viewingVideo.videoUrl);
                        toast({
                          title: "✅ URL Copiada!",
                          description: "URL do vídeo copiada para a área de transferência",
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
