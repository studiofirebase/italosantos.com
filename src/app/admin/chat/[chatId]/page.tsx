"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, query, orderBy, onSnapshot, addDoc, Timestamp, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Send, Paperclip, MapPin, Video, Image as ImageIcon, FileText, Loader2, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useProfileConfig } from '@/hooks/use-profile-config';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Message {
    id: string;
    text: string;
    senderId: string;
    timestamp: Timestamp;
    imageUrl?: string;
    videoUrl?: string;
    fileUrl?: string;
    fileName?: string;
    isLocation?: boolean;
    latitude?: number;
    longitude?: number;
}

interface UserInfo {
    uid: string;
    displayName?: string;
    photoURL?: string;
    email?: string;
}

export default function AdminChatPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { settings: profileSettings } = useProfileConfig();
    const chatId = params.chatId as string;

    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);

    // Buscar informações do usuário
    useEffect(() => {
        const fetchUserInfo = async () => {
            try {
                // Tentar extrair UID do chatId
                if (chatId.startsWith('secret-chat-')) {
                    const userId = chatId.replace('secret-chat-', '');

                    // Buscar no Firestore
                    const userDoc = await getDoc(doc(db, 'users', userId));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        setUserInfo({
                            uid: userId,
                            displayName: data.displayName || data.name || 'Usuário',
                            photoURL: data.photoURL || data.profilePictureUrl,
                            email: data.email
                        });
                    } else {
                        setUserInfo({
                            uid: userId,
                            displayName: 'Visitante',
                            photoURL: undefined,
                            email: undefined
                        });
                    }
                }
            } catch (error) {
                console.error('Erro ao buscar informações do usuário:', error);
            }
        };

        fetchUserInfo();
    }, [chatId]);

    // Carregar mensagens em tempo real
    useEffect(() => {
        setIsLoading(true);

        const messagesRef = collection(db, 'chats', chatId, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loadedMessages: Message[] = [];
            snapshot.forEach((doc) => {
                loadedMessages.push({ id: doc.id, ...doc.data() } as Message);
            });
            setMessages(loadedMessages);
            setIsLoading(false);

            // Scroll para o final
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        });

        return () => unsubscribe();
    }, [chatId]);

    // Auto-scroll quando novas mensagens chegam
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Enviar mensagem de texto
    const handleSendMessage = async () => {
        if (!newMessage.trim() || isSending) return;

        setIsSending(true);
        try {
            const messagesRef = collection(db, 'chats', chatId, 'messages');
            await addDoc(messagesRef, {
                text: newMessage,
                senderId: 'admin',
                timestamp: serverTimestamp(),
            });

            // Atualizar lastMessage do chat
            const chatRef = doc(db, 'chats', chatId);
            await updateDoc(chatRef, {
                lastMessage: {
                    text: newMessage,
                    senderId: 'admin',
                    timestamp: serverTimestamp(),
                }
            });

            setNewMessage('');
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            toast({
                title: 'Erro',
                description: 'Não foi possível enviar a mensagem.',
                variant: 'destructive'
            });
        } finally {
            setIsSending(false);
        }
    };

    // Enviar localização
    const handleSendLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        const { latitude, longitude } = position.coords;
                        const messagesRef = collection(db, 'chats', chatId, 'messages');

                        await addDoc(messagesRef, {
                            text: `📍 Localização: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                            senderId: 'admin',
                            timestamp: serverTimestamp(),
                            isLocation: true,
                            latitude,
                            longitude
                        });

                        // Atualizar lastMessage
                        const chatRef = doc(db, 'chats', chatId);
                        await updateDoc(chatRef, {
                            lastMessage: {
                                text: '📍 Localização',
                                senderId: 'admin',
                                timestamp: serverTimestamp(),
                                isLocation: true
                            }
                        });

                        toast({
                            title: 'Localização enviada',
                            description: 'Sua localização foi compartilhada com sucesso.'
                        });
                    } catch (error) {
                        console.error('Erro ao enviar localização:', error);
                        toast({
                            title: 'Erro',
                            description: 'Não foi possível enviar a localização.',
                            variant: 'destructive'
                        });
                    }
                },
                (error) => {
                    toast({
                        title: 'Erro de Localização',
                        description: 'Não foi possível obter sua localização. Verifique as permissões.',
                        variant: 'destructive'
                    });
                }
            );
        } else {
            toast({
                title: 'Não Suportado',
                description: 'Seu navegador não suporta geolocalização.',
                variant: 'destructive'
            });
        }
    };

    // Upload de imagem
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validar tipo de arquivo
        if (!file.type.startsWith('image/')) {
            toast({
                title: 'Arquivo Inválido',
                description: 'Por favor, selecione uma imagem válida.',
                variant: 'destructive'
            });
            return;
        }

        // Validar tamanho (máximo 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast({
                title: 'Arquivo Muito Grande',
                description: 'A imagem deve ter no máximo 5MB.',
                variant: 'destructive'
            });
            return;
        }

        setIsUploading(true);
        try {
            // Upload para Firebase Storage
            const storageRef = ref(storage, `chat-images/${chatId}/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const imageUrl = await getDownloadURL(storageRef);

            // Enviar mensagem com imagem
            const messagesRef = collection(db, 'chats', chatId, 'messages');
            await addDoc(messagesRef, {
                text: '📷 Imagem',
                senderId: 'admin',
                timestamp: serverTimestamp(),
                imageUrl
            });

            // Atualizar lastMessage
            const chatRef = doc(db, 'chats', chatId);
            await updateDoc(chatRef, {
                lastMessage: {
                    text: '📷 Imagem',
                    senderId: 'admin',
                    timestamp: serverTimestamp(),
                    imageUrl
                }
            });

            toast({
                title: 'Imagem Enviada',
                description: 'Sua imagem foi enviada com sucesso.'
            });
        } catch (error) {
            console.error('Erro ao enviar imagem:', error);
            toast({
                title: 'Erro',
                description: 'Não foi possível enviar a imagem.',
                variant: 'destructive'
            });
        } finally {
            setIsUploading(false);
            if (imageInputRef.current) {
                imageInputRef.current.value = '';
            }
        }
    };

    // Upload de vídeo
    const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validar tipo de arquivo
        if (!file.type.startsWith('video/')) {
            toast({
                title: 'Arquivo Inválido',
                description: 'Por favor, selecione um vídeo válido.',
                variant: 'destructive'
            });
            return;
        }

        // Validar tamanho (máximo 50MB)
        if (file.size > 50 * 1024 * 1024) {
            toast({
                title: 'Arquivo Muito Grande',
                description: 'O vídeo deve ter no máximo 50MB.',
                variant: 'destructive'
            });
            return;
        }

        setIsUploading(true);
        try {
            const storageRef = ref(storage, `chat-videos/${chatId}/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const videoUrl = await getDownloadURL(storageRef);

            const messagesRef = collection(db, 'chats', chatId, 'messages');
            await addDoc(messagesRef, {
                text: '🎥 Vídeo',
                senderId: 'admin',
                timestamp: serverTimestamp(),
                videoUrl
            });

            const chatRef = doc(db, 'chats', chatId);
            await updateDoc(chatRef, {
                lastMessage: {
                    text: '🎥 Vídeo',
                    senderId: 'admin',
                    timestamp: serverTimestamp(),
                    videoUrl
                }
            });

            toast({
                title: 'Vídeo Enviado',
                description: 'Seu vídeo foi enviado com sucesso.'
            });
        } catch (error) {
            console.error('Erro ao enviar vídeo:', error);
            toast({
                title: 'Erro',
                description: 'Não foi possível enviar o vídeo.',
                variant: 'destructive'
            });
        } finally {
            setIsUploading(false);
            if (videoInputRef.current) {
                videoInputRef.current.value = '';
            }
        }
    };

    // Upload de arquivo
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validar tamanho (máximo 10MB)
        if (file.size > 10 * 1024 * 1024) {
            toast({
                title: 'Arquivo Muito Grande',
                description: 'O arquivo deve ter no máximo 10MB.',
                variant: 'destructive'
            });
            return;
        }

        setIsUploading(true);
        try {
            const storageRef = ref(storage, `chat-files/${chatId}/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const fileUrl = await getDownloadURL(storageRef);

            const messagesRef = collection(db, 'chats', chatId, 'messages');
            await addDoc(messagesRef, {
                text: `📎 ${file.name}`,
                senderId: 'admin',
                timestamp: serverTimestamp(),
                fileUrl,
                fileName: file.name
            });

            const chatRef = doc(db, 'chats', chatId);
            await updateDoc(chatRef, {
                lastMessage: {
                    text: `📎 ${file.name}`,
                    senderId: 'admin',
                    timestamp: serverTimestamp(),
                    fileUrl
                }
            });

            toast({
                title: 'Arquivo Enviado',
                description: 'Seu arquivo foi enviado com sucesso.'
            });
        } catch (error) {
            console.error('Erro ao enviar arquivo:', error);
            toast({
                title: 'Erro',
                description: 'Não foi possível enviar o arquivo.',
                variant: 'destructive'
            });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    // Iniciar videochamada (placeholder)
    const handleVideoCall = () => {
        toast({
            title: 'Videochamada',
            description: 'Funcionalidade de videochamada em desenvolvimento.',
        });
        // TODO: Implementar integração com serviço de videochamada (Jitsi, WebRTC, etc.)
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)]">
            <Card className="flex-1 flex flex-col">
                <CardHeader className="border-b">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => router.push('/admin/conversations')}
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={userInfo?.photoURL} alt={userInfo?.displayName} />
                                <AvatarFallback>
                                    {userInfo?.displayName?.charAt(0) || 'U'}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <CardTitle className="text-lg">
                                    {userInfo?.displayName || 'Carregando...'}
                                </CardTitle>
                                {userInfo?.email && (
                                    <p className="text-xs text-muted-foreground">{userInfo.email}</p>
                                )}
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleVideoCall}
                            className="flex items-center gap-2"
                        >
                            <Video className="h-4 w-4" />
                            Videochamada
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <MessageSquare className="h-12 w-12 mb-2" />
                            <p>Nenhuma mensagem ainda</p>
                            <p className="text-sm">Envie uma mensagem para iniciar a conversa</p>
                        </div>
                    ) : (
                        messages.map((message) => {
                            const isAdmin = message.senderId === 'admin';
                            return (
                                <div
                                    key={message.id}
                                    className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[70%] rounded-lg p-3 ${isAdmin
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted'
                                            }`}
                                    >
                                        {message.imageUrl && (
                                            <img
                                                src={message.imageUrl}
                                                alt="Imagem"
                                                className="max-w-full rounded mb-2 cursor-pointer hover:opacity-90"
                                                onClick={() => window.open(message.imageUrl, '_blank')}
                                            />
                                        )}
                                        {message.videoUrl && (
                                            <video
                                                src={message.videoUrl}
                                                controls
                                                className="max-w-full rounded mb-2"
                                            />
                                        )}
                                        {message.fileUrl && (
                                            <a
                                                href={message.fileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 text-blue-500 hover:underline mb-2"
                                            >
                                                <FileText className="h-4 w-4" />
                                                {message.fileName || 'Arquivo'}
                                            </a>
                                        )}
                                        {message.isLocation && message.latitude && message.longitude ? (
                                            <a
                                                href={`https://www.google.com/maps?q=${message.latitude},${message.longitude}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 hover:underline"
                                            >
                                                <MapPin className="h-4 w-4" />
                                                {message.text}
                                            </a>
                                        ) : (
                                            <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
                                        )}
                                        <p className="text-xs opacity-70 mt-1">
                                            {message.timestamp && formatDistanceToNow(message.timestamp.toDate(), {
                                                addSuffix: true,
                                                locale: ptBR
                                            })}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </CardContent>

                <div className="border-t p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageUpload}
                            disabled={isUploading}
                        />
                        <input
                            ref={videoInputRef}
                            type="file"
                            accept="video/*"
                            className="hidden"
                            onChange={handleVideoUpload}
                            disabled={isUploading}
                        />
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            onChange={handleFileUpload}
                            disabled={isUploading}
                        />

                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => imageInputRef.current?.click()}
                            disabled={isUploading}
                            title="Enviar Imagem"
                        >
                            <ImageIcon className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => videoInputRef.current?.click()}
                            disabled={isUploading}
                            title="Enviar Vídeo"
                        >
                            <Video className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            title="Enviar Arquivo"
                        >
                            <Paperclip className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleSendLocation}
                            disabled={isUploading}
                            title="Enviar Localização"
                        >
                            <MapPin className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="flex items-center gap-2">
                        <Input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            placeholder="Digite sua mensagem..."
                            disabled={isSending || isUploading}
                            className="flex-1"
                        />
                        <Button
                            onClick={handleSendMessage}
                            disabled={isSending || isUploading || !newMessage.trim()}
                        >
                            {isSending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </Button>
                    </div>

                    {isUploading && (
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Enviando arquivo...
                        </p>
                    )}
                </div>
            </Card>
        </div>
    );
}
