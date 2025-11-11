"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DeleteSecretChatButton from '@/components/delete-secret-chat-button';
import { Send, Loader2, MapPin, Paperclip, Video, Mic, CheckCircle, X } from 'lucide-react';
import { db, storage } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, serverTimestamp, query, orderBy, doc, setDoc, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { useUserAuth } from '@/hooks/use-user-auth';
import { useProfileConfig } from '@/hooks/use-profile-config';

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Timestamp;
  imageUrl?: string;
  videoUrl?: string;
  isLocation?: boolean;
}

// Cria ou recupera um chatId persistente por dispositivo (localStorage)
function getOrCreateChatId(): string {
    if (typeof window === 'undefined') {
        return '';
    }
    let chatId = localStorage.getItem('secretChatId');
    if (!chatId) {
        const randomId = Math.random().toString(36).substring(2, 8);
        chatId = `secret-chat-${randomId}`;
        localStorage.setItem('secretChatId', chatId);
    }
    return chatId;
}

interface SecretChatWidgetProps {
    isOpen: boolean;
    onClose?: () => void;
}

export default function SecretChatWidget({ isOpen, onClose }: SecretChatWidgetProps) {
    const { toast } = useToast();
    const { user, userProfile } = useUserAuth();
    const { settings: profileSettings } = useProfileConfig();
    const [messages, setMessages] = useState<Message[]>([]);
    const sessionMessages = useRef<Message[]>([]);
    const sessionStart = useRef<number>(0);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [sessionId, setSessionId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatId = useRef<string>('');
    const [showVideoCall, setShowVideoCall] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [showVideoRecorder, setShowVideoRecorder] = useState(false);
    const [recordedVideo, setRecordedVideo] = useState<string | null>(null);
    const [isPreviewActive, setIsPreviewActive] = useState(false);
    const [currentCamera, setCurrentCamera] = useState<'user' | 'environment'>('user');
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const videoStreamRef = useRef<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [showHelpModal, setShowHelpModal] = useState(false);

    // Função de teste para debug da geolocalização (disponível no console)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            (window as any).testGeolocation = () => {
                console.log('[Chat] Testando geolocalização...');
                if (!navigator.geolocation) {
                    console.error('[Chat] Geolocalização não suportada');
                    return;
                }
                
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        console.log('[Chat] ✅ Localização obtida com sucesso:', {
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            accuracy: position.coords.accuracy,
                            timestamp: new Date(position.timestamp).toLocaleString()
                        });
                    },
                    (error) => {
                        console.error('[Chat] ❌ Erro na geolocalização:', {
                            code: error.code,
                            message: error.message,
                            PERMISSION_DENIED: error.PERMISSION_DENIED,
                            POSITION_UNAVAILABLE: error.POSITION_UNAVAILABLE,
                            TIMEOUT: error.TIMEOUT
                        });
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 60000
                    }
                );
            };

            // Função de teste mais robusta
            (window as any).testGeolocationAdvanced = () => {
                console.log('[Chat] Teste avançado de geolocalização...');
                
                if (!navigator.geolocation) {
                    console.error('[Chat] Geolocalização não suportada');
                    return;
                }

                // Teste 1: getCurrentPosition com alta precisão
                console.log('[Chat] Teste 1: getCurrentPosition (alta precisão)');
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        console.log('[Chat] ✅ Teste 1 - Sucesso:', {
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            accuracy: position.coords.accuracy
                        });
                    },
                    (error) => {
                        console.error('[Chat] ❌ Teste 1 - Falhou:', error);
                        
                        // Teste 2: getCurrentPosition com baixa precisão
                        console.log('[Chat] Teste 2: getCurrentPosition (baixa precisão)');
                        navigator.geolocation.getCurrentPosition(
                            (position) => {
                                console.log('[Chat] ✅ Teste 2 - Sucesso:', {
                                    latitude: position.coords.latitude,
                                    longitude: position.coords.longitude,
                                    accuracy: position.coords.accuracy
                                });
                            },
                            (error) => {
                                console.error('[Chat] ❌ Teste 2 - Falhou:', error);
                                
                                // Teste 3: watchPosition
                                console.log('[Chat] Teste 3: watchPosition');
                                const watchId = navigator.geolocation.watchPosition(
                                    (position) => {
                                        console.log('[Chat] ✅ Teste 3 - Sucesso:', {
                                            latitude: position.coords.latitude,
                                            longitude: position.coords.longitude,
                                            accuracy: position.coords.accuracy
                                        });
                                        navigator.geolocation.clearWatch(watchId);
                                    },
                                    (error) => {
                                        console.error('[Chat] ❌ Teste 3 - Falhou:', error);
                                        navigator.geolocation.clearWatch(watchId);
                                    },
                                    { enableHighAccuracy: false, timeout: 15000 }
                                );
                                
                                setTimeout(() => {
                                    navigator.geolocation.clearWatch(watchId);
                                    console.log('[Chat] Teste 3 - Timeout');
                                }, 15000);
                            },
                            { enableHighAccuracy: false, timeout: 15000 }
                        );
                    },
                    { enableHighAccuracy: true, timeout: 15000 }
                );
            };
            
            // Função de teste simples e direta
            (window as any).testGeolocationSimple = () => {
                console.log('[Chat] Teste simples de geolocalização...');
                
                if (!navigator.geolocation) {
                    console.error('[Chat] Geolocalização não suportada');
                    return;
                }

                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        console.log('[Chat] ✅ Sucesso:', {
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            accuracy: position.coords.accuracy
                        });
                    },
                    (error) => {
                        console.error('[Chat] ❌ Falha:', {
                            code: error.code,
                            message: error.message
                        });
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 300000
                    }
                );
            };
            
        }
    }, []);

    // Inicializar sessão simples sem autenticação
    useEffect(() => {
        if (!isOpen) {
            // Quando o chat é fechado, limpar o sessionId para garantir nova sessão na próxima abertura
            setSessionId('');
            setMessages([]);
            sessionMessages.current = [];

            return;
        }

        // Sempre gerar um NOVO sessionId a cada abertura do chat (não reutilizar)
        // Isso garante que o usuário não veja histórico de sessões anteriores
        const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setSessionId(newSessionId);
        console.log('[Chat] Nova sessão iniciada (histórico limpo):', newSessionId);
        
        // Gerar chat ID se necessário
        if (!chatId.current) {
            chatId.current = getOrCreateChatId();
            console.log('[Chat] Chat ID:', chatId.current);
        }
        
        // Marcar início da sessão
        sessionStart.current = Date.now();
        
        // Limpar mensagens da sessão anterior
        setMessages([]);
        sessionMessages.current = [];
    }, [isOpen]);

    // Carregar mensagens do Firestore (sem autenticação)
    useEffect(() => {
        if (!sessionId || !chatId.current || !isOpen) {
            if (!isOpen) setIsLoading(true);
            return;
        }

        setIsLoading(true);
        console.log('[Chat] Carregando mensagens para sessão:', sessionId);

        try {
            if (!db) {
                console.error('[Chat] Firestore não está inicializado');
                throw new Error('Firestore não está inicializado');
            }
            
            const chatDocRef = doc(db, 'chats', chatId.current);
            const messagesCollection = collection(chatDocRef, 'messages');
            const q = query(messagesCollection, orderBy('timestamp', 'asc'));

            // Limpar mensagens da sessão anterior
            sessionMessages.current = [];

            const unsubscribeMessages = onSnapshot(q, (querySnapshot) => {
                const msgs: Message[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
                
                // COMPORTAMENTO DO CHAT SECRETO:
                // - Usuário comum: Vê apenas mensagens da sessão atual (desde que abriu o chat)
                // - Admin: Vê todo o histórico (implementado na página admin)
                
                const sessionMsgs = msgs.filter(m => {
                    // 1. Mensagens do admin enviadas APÓS o usuário abrir o chat nesta sessão
                    if (m.senderId === 'admin' && m.timestamp && m.timestamp.toMillis() >= sessionStart.current) {
                        return true;
                    }
                    // 2. Mensagens enviadas pelo próprio usuário nesta sessão
                    if (m.senderId === sessionId) {
                        return true;
                    }
                    // 3. Rejeitar todo o resto (histórico anterior, outras sessões)
                    return false;
                });

                console.log(`[Chat] Filtrando mensagens: ${msgs.length} total -> ${sessionMsgs.length} da sessão atual`);
                setMessages(sessionMsgs);
                setIsLoading(false);
            }, (error) => {
                console.error("Erro ao carregar mensagens:", error);
                setIsLoading(false);
                toast({
                    variant: 'destructive',
                    title: 'Erro no chat',
                    description: `Não foi possível carregar mensagens: ${error.code || error.message}`
                });
            });

            return () => {
                try {
                    unsubscribeMessages();
                } catch (error) {
                    console.error("Erro ao desinscrever listener:", error);
                }
            };
        } catch (error: any) {
            console.error("Erro ao inicializar chat:", error);
            setIsLoading(false);
            toast({
                variant: 'destructive',
                title: 'Erro no chat',
                description: `Erro ao inicializar: ${error.code || error.message || 'Erro desconhecido'}`
            });
        }
    }, [sessionId, isOpen, toast]);

    // Auto-scroll para última mensagem
    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    // Função para enviar mensagem (sem autenticação)
    const handleSendMessage = useCallback(async (text: string, options: { isLocation?: boolean; imageUrl?: string; videoUrl?: string } = {}) => {
        const { isLocation = false, imageUrl = '', videoUrl = '' } = options;
        const trimmedMessage = text.trim();
        
        // Permitir envio de localização ou vídeo mesmo com texto vazio
        if ((trimmedMessage === '' && !imageUrl && !videoUrl && !isLocation) || isSending || !sessionId || !chatId.current) {
            console.log('[Chat] Validação falhou:', { 
                trimmedMessage, 
                imageUrl, 
                videoUrl,
                isLocation, 
                isSending, 
                sessionId: !!sessionId, 
                chatId: !!chatId.current 
            });
            return;
        }
        
        setIsSending(true);
        try {
            if (!db) throw new Error('Firestore não está inicializado');
            
            const chatDocRef = doc(db, 'chats', chatId.current);
            const messagesCollection = collection(chatDocRef, 'messages');
            
            // Criar o documento do chat se não existir
            await setDoc(chatDocRef, { 
                createdAt: serverTimestamp(),
                lastActivity: serverTimestamp()
            }, { merge: true });
            
            // Enviar mensagem usando sessionId como senderId
            // Preparar dados da mensagem
            const messageData: any = {
                senderId: sessionId,
                text: trimmedMessage,
                timestamp: serverTimestamp(),
                imageUrl: imageUrl || '',
                videoUrl: videoUrl || '',
                isLocation: isLocation
            };
            
            // Se usuário estiver logado, adicionar UID real para busca de avatar
            if (user?.uid) {
                messageData.realUserId = user.uid;
            }
            
            await addDoc(messagesCollection, messageData);
            
            setNewMessage('');
            console.log('[Chat] Mensagem enviada:', trimmedMessage);
            
        } catch (error: any) {
            console.error("Erro ao enviar mensagem:", error);
            toast({
                variant: 'destructive', 
                title: 'Erro ao Enviar',
                description: `Falha ao enviar mensagem: ${error.message || 'Erro desconhecido'}`
            });
        } finally {
            setIsSending(false);
        }
    }, [isSending, sessionId, toast]);

    const sendLocation = useCallback(() => {
        console.log('[Chat] Iniciando envio de localização...');
        
        if (!navigator.geolocation) {
            console.error('[Chat] Geolocalização não suportada pelo navegador');
            toast({ 
                variant: 'destructive', 
                title: 'Geolocalização não suportada',
                description: 'Seu navegador não suporta geolocalização. Tente usar um navegador mais recente.'
            });
            return;
        }

        if (!sessionId || !chatId.current) {
            console.error('[Chat] Sessão não inicializada:', { sessionId, chatId: chatId.current });
            toast({
                variant: 'destructive',
                title: 'Erro de sessão',
                description: 'Chat não inicializado. Tente fechar e abrir novamente.'
            });
            return;
        }

        // Verificar se está rodando localmente
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        if (isLocalhost) {
            console.log('[Chat] Detectado ambiente local - usando coordenadas de teste');
            
            // Para desenvolvimento local, usar coordenadas de teste
            const testCoordinates = [
                { lat: -23.5505, lng: -46.6333, name: 'São Paulo, SP' },
                { lat: -22.9068, lng: -43.1729, name: 'Rio de Janeiro, RJ' },
                { lat: -15.7942, lng: -47.8822, name: 'Brasília, DF' }
            ];
            
            const randomCoord = testCoordinates[Math.floor(Math.random() * testCoordinates.length)];
            const link = `https://maps.google.com/?q=${randomCoord.lat},${randomCoord.lng}`;
            
            console.log('[Chat] Usando coordenadas de teste:', randomCoord);
            
            // Enviar a localização de teste
            handleSendMessage(link, { isLocation: true });
            
            toast({
                title: 'Localização de teste enviada!',
                description: `📍 ${randomCoord.name} (ambiente local)`,
            });
            
            return;
        }

        // Mostrar toast de carregamento
        toast({
            title: 'Obtendo localização...',
            description: 'Aguarde um momento...',
        });

        // Verificar permissão primeiro (se disponível)
        if ('permissions' in navigator) {
            navigator.permissions.query({ name: 'geolocation' }).then((permissionStatus) => {
                console.log('[Chat] Status da permissão:', permissionStatus.state);
                
                if (permissionStatus.state === 'denied') {
                    toast({
                        variant: 'destructive',
                        title: 'Permissão negada',
                        description: 'Acesse as configurações do navegador e permita o acesso à localização.',
                    });
                    return;
                }
                
                // Continuar com a obtenção da localização
                requestLocation();
            }).catch(() => {
                // Se não conseguir verificar permissão, tentar mesmo assim
                requestLocation();
            });
        } else {
            // Navegador não suporta verificação de permissão, tentar direto
            requestLocation();
        }

        function requestLocation() {
            // Implementação SIMPLES e DIRETA - como outros sites fazem
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    const link = `https://maps.google.com/?q=${latitude},${longitude}`;
                    
                    console.log('[Chat] ✅ Localização obtida com sucesso:', { 
                        latitude, 
                        longitude, 
                        accuracy: position.coords.accuracy,
                        link 
                    });
                    
                    // Enviar a localização
                    handleSendMessage(link, { isLocation: true });
                    
                    toast({
                        title: 'Localização enviada!',
                        description: 'Sua localização foi compartilhada com sucesso.',
                    });
                },
                (error) => {
                    console.error('[Chat] ❌ Erro na geolocalização:', {
                        code: error.code,
                        message: error.message,
                        PERMISSION_DENIED: error.PERMISSION_DENIED,
                        POSITION_UNAVAILABLE: error.POSITION_UNAVAILABLE,
                        TIMEOUT: error.TIMEOUT
                    });
                    
                    let errorMessage = 'Não foi possível obter sua localização.';
                    let detailedMessage = '';
                    
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = 'Permissão de localização negada.';
                            detailedMessage = 'Clique no ícone de localização na barra de endereços e permita o acesso.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = 'Localização indisponível.';
                            detailedMessage = 'Verifique se o GPS está ativado e tente novamente.';
                            break;
                        case error.TIMEOUT:
                            errorMessage = 'Tempo limite excedido.';
                            detailedMessage = 'O GPS demorou para responder. Tente novamente.';
                            break;
                        default:
                            errorMessage = 'Erro desconhecido na geolocalização.';
                            detailedMessage = 'Tente novamente ou use outro dispositivo.';
                    }
                    
                    toast({
                        variant: 'destructive',
                        title: errorMessage,
                        description: detailedMessage,
                        action: (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    // Mostrar modal de ajuda
                                    setShowHelpModal(true);
                                }}
                            >
                                Como resolver?
                            </Button>
                        ),
                    });
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000, // 10 segundos
                    maximumAge: 60000 // 1 minuto
                }
            );
        }
    }, [isSending, sessionId, toast]);

    // Funções para gravação de vídeo
    const startVideoRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 640 }, 
                    height: { ideal: 480 },
                    facingMode: currentCamera
                }, 
                audio: true 
            });
            
            videoStreamRef.current = stream;
            
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
            
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'video/webm;codecs=vp9'
            });
            
            const chunks: Blob[] = [];
            
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunks.push(event.data);
                }
            };
            
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                const videoUrl = URL.createObjectURL(blob);
                setRecordedVideo(videoUrl);
                setIsRecording(false);
                setIsPreviewActive(false);
                
                // Parar o stream
                if (videoStreamRef.current) {
                    videoStreamRef.current.getTracks().forEach(track => track.stop());
                    videoStreamRef.current = null;
                }
            };
            
            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start();
            setIsRecording(true);
            setIsPreviewActive(true);
            
            toast({
                title: 'Gravação iniciada',
                description: 'Clique em parar quando terminar',
            });
            
        } catch (error: any) {
            console.error('Erro ao iniciar gravação:', error);
            toast({
                variant: 'destructive',
                title: 'Erro ao acessar câmera',
                description: 'Verifique as permissões da câmera e microfone.',
            });
        }
    }, [currentCamera, toast]);

    const stopVideoRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
        }
    }, [isRecording]);

    const sendVideo = useCallback(async () => {
        if (!recordedVideo || !sessionId || !chatId.current) {
            return;
        }

        try {
            setIsSending(true);
            
            // Converter blob URL para blob
            const response = await fetch(recordedVideo);
            const blob = await response.blob();
            
            // Upload para Firebase Storage
            const storageRef = ref(storage, `chat-videos/${chatId.current}/${Date.now()}_video.webm`);
            const snapshot = await uploadBytes(storageRef, blob);
            const downloadURL = await getDownloadURL(snapshot.ref);
            
            // Enviar mensagem com vídeo
            await handleSendMessage('', { videoUrl: downloadURL });
            
            toast({ title: 'Vídeo enviado com sucesso!' });
            
            // Limpar
            setRecordedVideo(null);
            setShowVideoRecorder(false);
            
        } catch (error: any) {
            console.error("Erro ao enviar vídeo:", error);
            toast({ 
                variant: 'destructive', 
                title: 'Erro ao enviar vídeo',
                description: error.message 
            });
        } finally {
            setIsSending(false);
        }
    }, [recordedVideo, sessionId, handleSendMessage, toast]);

    const cancelVideoRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
        }
        
        if (videoStreamRef.current) {
            videoStreamRef.current.getTracks().forEach(track => track.stop());
            videoStreamRef.current = null;
        }
        
        setRecordedVideo(null);
        setShowVideoRecorder(false);
        setIsRecording(false);
        setIsPreviewActive(false);
    }, [isRecording]);

    const switchCamera = useCallback(async () => {
        try {
            // Parar stream atual se existir
            if (videoStreamRef.current) {
                videoStreamRef.current.getTracks().forEach(track => track.stop());
                videoStreamRef.current = null;
            }
            
            // Trocar câmera
            const newCamera = currentCamera === 'user' ? 'environment' : 'user';
            setCurrentCamera(newCamera);
            
            // Se estiver gravando, parar e reiniciar com nova câmera
            if (isRecording && mediaRecorderRef.current) {
                mediaRecorderRef.current.stop();
                // A gravação será reiniciada automaticamente no onstop
            } else {
                // Se não estiver gravando, apenas iniciar preview
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        width: { ideal: 640 }, 
                        height: { ideal: 480 },
                        facingMode: newCamera
                    }, 
                    audio: true 
                });
                
                videoStreamRef.current = stream;
                
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play();
                }
                
                setIsPreviewActive(true);
            }
            
            toast({
                title: 'Câmera trocada',
                description: `Agora usando câmera ${newCamera === 'user' ? 'frontal' : 'traseira'}`,
            });
            
        } catch (error: any) {
            console.error('Erro ao trocar câmera:', error);
            toast({
                variant: 'destructive',
                title: 'Erro ao trocar câmera',
                description: 'Não foi possível trocar de câmera.',
            });
        }
    }, [currentCamera, isRecording, toast]);

    const startPreview = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 640 }, 
                    height: { ideal: 480 },
                    facingMode: currentCamera
                }, 
                audio: true 
            });
            
            videoStreamRef.current = stream;
            
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
            
            setIsPreviewActive(true);
            
        } catch (error: any) {
            console.error('Erro ao iniciar preview:', error);
            toast({
                variant: 'destructive',
                title: 'Erro ao acessar câmera',
                description: 'Verifique as permissões da câmera e microfone.',
            });
        }
    }, [currentCamera, toast]);

    // Função de teste para debug do envio de localização (disponível no console)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            (window as any).testChatLocation = () => {
                console.log('[Chat] Testando envio de localização no chat...');
                console.log('[Chat] Estado atual:', {
                    sessionId,
                    chatId: chatId.current,
                    isOpen,
                    isSending
                });
                
                if (isOpen && sessionId && chatId.current) {
                    sendLocation();
                } else {
                    console.error('[Chat] Chat não está pronto para enviar localização');
                }
            };
            

        }
    }, [sessionId, isOpen, isSending, sendLocation]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !sessionId || !chatId.current) {
            return;
        }

        try {
            setIsSending(true);
            const storageRef = ref(storage, `chat-images/${chatId.current}/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            
            await handleSendMessage('', { imageUrl: downloadURL });
            toast({ title: 'Imagem enviada com sucesso!' });
        } catch (error: any) {
            console.error("Erro ao enviar imagem:", error);
            toast({ 
                variant: 'destructive', 
                title: 'Erro ao enviar imagem',
                description: error.message 
            });
        } finally {
            setIsSending(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const renderMessageContent = (msg: Message) => {
        // console.log('[Chat] Renderizando mensagem:', { 
        //     id: msg.id, 
        //     isLocation: msg.isLocation, 
        //     text: msg.text, 
        //     imageUrl: msg.imageUrl,
        //     videoUrl: msg.videoUrl
        // });

        if (msg.videoUrl) {
            return (
                <div className="relative">
                    <video
                        src={msg.videoUrl}
                        controls
                        className="rounded-lg max-w-full h-auto max-h-64"
                        preload="metadata"
                    >
                        Seu navegador não suporta vídeos.
                    </video>
                </div>
            );
        }

        if (msg.imageUrl) {
            return (
                <div className="relative">
                    <Image
                        src={msg.imageUrl}
                        alt="Imagem enviada"
                        width={200}
                        height={200}
                        className="rounded-lg max-w-full h-auto"
                        unoptimized
                    />
                </div>
            );
        }
        
        if (msg.isLocation && msg.text) {
            return (
                <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-500" />
                    <a 
                        href={msg.text} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-500 underline hover:text-blue-400 transition-colors"
                        onClick={() => {/* console.log('[Chat] Clicou na localização:', msg.text) */}}
                    >
                        📍 Ver localização no Google Maps
                    </a>
                </div>
            );
        }
        
        return msg.text;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed bottom-4 left-4 z-40" style={{ position: 'fixed', bottom: '1rem', left: '1rem', zIndex: 40 }}>
            <Card className="w-[360px] h-[500px] max-w-md flex flex-col animate-in fade-in-0 zoom-in-95 duration-500 shadow-lg border-gray-400 bg-black/90 backdrop-blur-xl md:rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between relative border-b border-gray-400">
                    <div></div> {/* Spacer esquerdo */}
                    <CardTitle className="text-xl text-white">
                        CHAT SECRETO
                    </CardTitle>
                    {onClose && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="text-white hover:bg-white/10 h-8 w-8"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                     {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-10 w-10 animate-spin text-white"/>
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <div key={msg.id} className={cn("flex items-end gap-2", msg.senderId === 'admin' ? 'justify-start' : 'justify-end')}>
                                {msg.senderId === 'admin' && (
                                    <div className="relative">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage 
                                                src={profileSettings?.profilePictureUrl} 
                                                alt="Admin"
                                            />
                                            <AvatarFallback>A</AvatarFallback>
                                        </Avatar>
                                        <CheckCircle 
                                            className="absolute -bottom-1 -right-1 h-4 w-4 text-blue-500 bg-white rounded-full"
                                        />
                                    </div>
                                )}
                                <div className={cn(
                                    "max-w-xs md:max-w-md rounded-lg px-3 py-2 relative",
                                    msg.senderId === 'admin' ? 'bg-secondary text-secondary-foreground rounded-bl-sm' : 'bg-white text-black rounded-br-sm'
                                )}>
                                    <div className="text-sm" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                        {renderMessageContent(msg)}
                                    </div>
                                    <p className="text-xs text-right opacity-70 mt-1">
                                        {msg.timestamp?.toDate()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Enviando...'}
                                    </p>
                                </div>
                                {msg.senderId !== 'admin' && (
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage 
                                            src={userProfile?.photoURL || user?.photoURL || undefined} 
                                            alt="Usuário"
                                        />
                                        <AvatarFallback>
                                            {userProfile?.displayName?.charAt(0) || user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                                        </AvatarFallback>
                                    </Avatar>
                                )}
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </CardContent>
                                 <CardFooter className="border-t border-gray-400 p-2.5 flex flex-col items-start gap-2">
                      <div className="flex w-full items-center space-x-1">
                                                   <Button variant="ghost" size="icon" className="text-white" onClick={() => {
                              setShowVideoRecorder(true);
                              // Iniciar preview automaticamente quando abrir o modal
                              setTimeout(() => startPreview(), 100);
                          }} disabled={!sessionId}><Video className="h-5 w-5"/></Button>
                         <Button variant="ghost" size="icon" className="text-white" onClick={sendLocation} disabled={!sessionId}><MapPin className="h-5 w-5"/></Button>
                         <Button variant="ghost" size="icon" className="text-white" onClick={() => fileInputRef.current?.click()} disabled={!sessionId}><Paperclip className="h-5 w-5"/></Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        <Textarea 
                            placeholder="Mensagem..." 
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage(newMessage);
                                }
                            }}
                            className="flex-1 bg-transparent border-gray-600 text-white placeholder-gray-400 min-h-[40px] h-10 max-h-20 resize-none"
                            disabled={isSending || !sessionId}
                            rows={1}
                        />
                        <Button 
                            type="submit" 
                            size="icon" 
                            onClick={() => handleSendMessage(newMessage)} 
                            disabled={isSending || !sessionId || newMessage.trim() === ''}
                            className="bg-white text-black hover:bg-gray-200"
                        >
                            <Send className="h-5 w-5" />
                        </Button>
                                         </div>
                 </CardFooter>
             </Card>
             
                                                       {/* Modal do Gravador de Vídeo */}
               {showVideoRecorder && (
                   <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50">
                       <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
                           <div className="flex justify-between items-center mb-6">
                               <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                   <Video className="h-5 w-5 text-red-400" />
                                   Gravar Vídeo
                               </h3>
                               <Button
                                   variant="ghost"
                                   size="icon"
                                   onClick={cancelVideoRecording}
                                   className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800"
                               >
                                   <X className="h-4 w-4" />
                               </Button>
                           </div>
                           
                           <div className="space-y-6">
                               {/* Preview do vídeo */}
                               <div className="relative bg-black rounded-xl overflow-hidden border border-gray-700">
                                   {/* Preview em tempo real */}
                                   {isPreviewActive && !recordedVideo && (
                                       <video
                                           ref={videoRef}
                                           className="w-full h-56 object-cover"
                                           autoPlay
                                           muted
                                           playsInline
                                       />
                                   )}
                                   
                                   {/* Vídeo gravado */}
                                   {recordedVideo && (
                                       <video
                                           src={recordedVideo}
                                           className="w-full h-56 object-cover"
                                           controls
                                           controlsList="nodownload"
                                       />
                                   )}
                                   
                                   {/* Placeholder quando não há preview */}
                                   {!isPreviewActive && !recordedVideo && (
                                       <div className="w-full h-56 flex items-center justify-center bg-gray-800">
                                           <div className="text-center text-gray-400">
                                               <Video className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                            <p className="text-sm">Clique em &quot;Iniciar Gravação&quot; para começar</p>
                                           </div>
                                       </div>
                                   )}
                                   
                                   {/* Overlay de status */}
                                   {isRecording && (
                                       <div className="absolute top-3 right-3 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                                           <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                           Gravando...
                                       </div>
                                   )}
                                   
                                   {/* Botão trocar câmera */}
                                   {isPreviewActive && !recordedVideo && (
                                       <Button
                                           variant="ghost"
                                           size="icon"
                                           onClick={switchCamera}
                                           className="absolute top-3 left-3 bg-black/50 text-white hover:bg-black/70 h-8 w-8"
                                           disabled={isRecording}
                                       >
                                           <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                           </svg>
                                       </Button>
                                   )}
                               </div>
                              
                                                             {/* Controles de gravação */}
                               <div className="flex justify-center space-x-3">
                                   {!isRecording && !recordedVideo && !isPreviewActive && (
                                       <Button
                                           onClick={startVideoRecording}
                                           className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-red-500/25"
                                           disabled={isSending}
                                       >
                                           <Video className="h-4 w-4 mr-2" />
                                           Iniciar Gravação
                                       </Button>
                                   )}
                                   
                                   {!isRecording && !recordedVideo && isPreviewActive && (
                                       <>
                                           <Button
                                               onClick={startVideoRecording}
                                               className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-red-500/25"
                                               disabled={isSending}
                                           >
                                               <Video className="h-4 w-4 mr-2" />
                                               Iniciar Gravação
                                           </Button>
                                           
                                           <Button
                                               onClick={cancelVideoRecording}
                                               variant="outline"
                                               className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white px-6 py-2 rounded-lg font-medium transition-all duration-200"
                                           >
                                               Cancelar
                                           </Button>
                                       </>
                                   )}
                                   
                                   {isRecording && (
                                       <Button
                                           onClick={stopVideoRecording}
                                           className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-red-500/25"
                                       >
                                           <X className="h-4 w-4 mr-2" />
                                           Parar Gravação
                                       </Button>
                                   )}
                                   
                                   {recordedVideo && (
                                       <>
                                           <Button
                                               onClick={sendVideo}
                                               className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-green-500/25"
                                               disabled={isSending}
                                           >
                                               {isSending ? (
                                                   <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                               ) : (
                                                   <Video className="h-4 w-4 mr-2" />
                                               )}
                                               {isSending ? 'Enviando...' : 'Enviar Vídeo'}
                                           </Button>
                                           
                                           <Button
                                               onClick={cancelVideoRecording}
                                               variant="outline"
                                               className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white px-6 py-2 rounded-lg font-medium transition-all duration-200"
                                           >
                                               Cancelar
                                           </Button>
                                       </>
                                   )}
                               </div>
                              
                                                             {/* Dicas */}
                               <div className="text-center text-gray-400 text-sm">
                                   {!isRecording && !recordedVideo && !isPreviewActive && (
                                    <p>Clique em &quot;Iniciar Gravação&quot; para começar</p>
                                   )}
                                   {!isRecording && !recordedVideo && isPreviewActive && (
                                       <p>Use o botão de trocar câmera (↻) para alternar entre frontal e traseira</p>
                                   )}
                                   {isRecording && (
                                    <p>Gravação em andamento... Clique em &quot;Parar Gravação&quot; quando terminar</p>
                                   )}
                                   {recordedVideo && (
                                    <p>Revise o vídeo e clique em &quot;Enviar Vídeo&quot; para compartilhar</p>
                                   )}
                               </div>
                          </div>
                      </div>
                  </div>
              )}

              {/* Modal de Ajuda para Geolocalização */}
              {showHelpModal && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
                          <div className="flex justify-between items-center mb-4">
                              <h3 className="text-lg font-semibold text-white">Como resolver problemas de localização</h3>
                              <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setShowHelpModal(false)}
                                  className="text-gray-400 hover:text-white"
                              >
                                  <X className="h-4 w-4" />
                              </Button>
                          </div>
                          
                          <div className="space-y-4 text-gray-300">
                              <div>
                                  <h4 className="font-medium text-white mb-2">1. Verificar permissões do navegador</h4>
                                  <ul className="text-sm space-y-1 ml-4">
                                      <li>• Clique no ícone de localização na barra de endereços</li>
                                    <li>• Selecione &quot;Permitir&quot; para este site</li>
                                      <li>• Recarregue a página e tente novamente</li>
                                  </ul>
                              </div>
                              
                              <div>
                                  <h4 className="font-medium text-white mb-2">2. Verificar configurações do dispositivo</h4>
                                  <ul className="text-sm space-y-1 ml-4">
                                      <li>• Ative o GPS/Localização no seu dispositivo</li>
                                      <li>• Verifique se o navegador tem permissão para localização</li>
                                      <li>• Tente em outro navegador (Chrome, Firefox, Safari)</li>
                                  </ul>
                              </div>
                              
                              <div>
                                  <h4 className="font-medium text-white mb-2">3. Problemas comuns</h4>
                                  <ul className="text-sm space-y-1 ml-4">
                                      <li>• <strong>Permissão negada:</strong> Clique no ícone de localização e permita</li>
                                      <li>• <strong>GPS desativado:</strong> Ative a localização no dispositivo</li>
                                      <li>• <strong>Tempo limite:</strong> Aguarde mais tempo ou tente novamente</li>
                                      <li>• <strong>Navegador antigo:</strong> Use um navegador mais recente</li>
                                  </ul>
                              </div>
                              
                              <div>
                                  <h4 className="font-medium text-white mb-2">4. Alternativas</h4>
                                  <ul className="text-sm space-y-1 ml-4">
                                      <li>• Use um dispositivo móvel (GPS mais preciso)</li>
                                      <li>• Tente em modo de navegação privada</li>
                                      <li>• Verifique se não há bloqueadores de localização</li>
                                  </ul>
                              </div>
                          </div>
                          
                          <div className="flex justify-end mt-6">
                              <Button
                                  onClick={() => setShowHelpModal(false)}
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                  Entendi
                              </Button>
                          </div>
                      </div>
                  </div>
              )}
         </div>
     );
 }
