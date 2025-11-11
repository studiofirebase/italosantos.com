
"use client";

import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit, onSnapshot, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2, MessageSquare, UserCheck, MapPin } from 'lucide-react';
import DeleteSecretChatButton from '@/components/delete-secret-chat-button';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useProfileConfig } from '@/hooks/use-profile-config';

interface LastMessage {
    text: string;
    timestamp: Timestamp;
    senderId: string;
    realUserId?: string; // UID real do usuário se estiver logado
    imageUrl?: string;
    videoUrl?: string;
    isLocation?: boolean;
}

interface UserInfo {
    uid: string;
    displayName?: string;
    photoURL?: string;
    email?: string;
}

interface Chat {
    id: string;
    createdAt: Timestamp;
    lastMessage: LastMessage | null;
    userInfo?: UserInfo | null;
}

export default function AdminConversationsPage() {
    const { settings: profileSettings } = useProfileConfig();
    const [chats, setChats] = useState<Chat[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    // Função para buscar informações do usuário pelo senderId da mensagem
    const getUserInfoBySenderId = async (senderId: string): Promise<UserInfo | null> => {
        try {
            if (!senderId || senderId === 'admin' || senderId.startsWith('session_')) {
                return null;
            }
            
            // Buscar dados do usuário no Firestore usando o senderId como UID
            const userDoc = await getDoc(doc(db, 'users', senderId));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                return {
                    uid: senderId,
                    displayName: userData.displayName || userData.name || 'Usuário',
                    photoURL: userData.photoURL,
                    email: userData.email
                };
            }
            
            return null;
        } catch (error) {
            console.error('Erro ao buscar informações do usuário:', error);
            return null;
        }
    };

    useEffect(() => {
        setIsLoading(true);
        const chatsCollectionRef = collection(db, 'chats');
        const q = query(chatsCollectionRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, async (chatsSnapshot) => {
            const promises = chatsSnapshot.docs.map(async (chatDoc) => {
                const messagesCollectionRef = collection(chatDoc.ref, 'messages');
                const lastMessageQuery = query(messagesCollectionRef, orderBy('timestamp', 'desc'), limit(1));
                
                const lastMessageSnapshot = await getDocs(lastMessageQuery);
                let lastMessage: LastMessage | null = null;
                if (!lastMessageSnapshot.empty) {
                    const lastMessageDoc = lastMessageSnapshot.docs[0];
                    lastMessage = lastMessageDoc.data() as LastMessage;
                }

                // Buscar informações do usuário
                let userInfo: UserInfo | null = null;
                
                // Primeiro tentar com realUserId da última mensagem
                if (lastMessage?.realUserId) {
                    userInfo = await getUserInfoBySenderId(lastMessage.realUserId);
                } else if (lastMessage && lastMessage.senderId !== 'admin' && !lastMessage.senderId.startsWith('session_')) {
                    // Tentar com senderId se não for session
                    userInfo = await getUserInfoBySenderId(lastMessage.senderId);
                } else if (lastMessage) {
                    // Se não encontrou na última mensagem, buscar em todas as mensagens do chat
                    try {
                        const allMessagesQuery = query(messagesCollectionRef, orderBy('timestamp', 'desc'));
                        const allMessagesSnapshot = await getDocs(allMessagesQuery);
                        
                        for (const msgDoc of allMessagesSnapshot.docs) {
                            const msgData = msgDoc.data();
                            
                            // Priorizar realUserId se disponível
                            if (msgData.realUserId) {
                                userInfo = await getUserInfoBySenderId(msgData.realUserId);
                                if (userInfo) break;
                            } else if (msgData.senderId && msgData.senderId !== 'admin' && !msgData.senderId.startsWith('session_')) {
                                userInfo = await getUserInfoBySenderId(msgData.senderId);
                                if (userInfo) break;
                            }
                        }
                    } catch (error) {
                        // Se der erro, continua sem userInfo
                    }
                }

                return {
                    id: chatDoc.id,
                    createdAt: chatDoc.data().createdAt,
                    lastMessage,
                    userInfo,
                };
            });
            
            const chatsData = await Promise.all(promises);
            
            chatsData.sort((a, b) => {
                const timeA = a.lastMessage?.timestamp?.toMillis() || a.createdAt?.toMillis() || 0;
                const timeB = b.lastMessage?.timestamp?.toMillis() || b.createdAt?.toMillis() || 0;
                return timeB - timeA;
            });

            setChats(chatsData);
            setIsLoading(false);

        }, (error) => {
            console.error("Erro ao buscar conversas: ", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);
    
    const getChatParticipantName = (chat: Chat) => {
        // Se temos informações do usuário, usar o nome real
        if (chat.userInfo?.displayName) {
            return chat.userInfo.displayName;
        }
        
        const chatId = chat.id;
        if (chatId.startsWith('secret-chat-')) {
            // Se o chatId contém timestamp (novo formato), é uma conversa temporária
            const parts = chatId.split('-');
            if (parts.length >= 4 && !isNaN(parseInt(parts[3]))) {
                const timestamp = parseInt(parts[3]);
                const date = new Date(timestamp);
                const timeStr = date.toLocaleString('pt-BR');
                return `🔒 Chat Temporário (${timeStr})`;
            }
            // Formato antigo (permanente)
            return `💬 Cliente ${chatId.substring(12)}`;
        }
        return chatId;
    }

    const getChatType = (chatId: string): 'temporary' | 'permanent' => {
        if (chatId.startsWith('secret-chat-')) {
            const parts = chatId.split('-');
            // Se tem timestamp, é temporário
            if (parts.length >= 4 && !isNaN(parseInt(parts[2]))) {
                return 'temporary';
            }
        }
        return 'permanent';
    }

    const renderLastMessage = (message: LastMessage) => {
        if (message.videoUrl) {
            return (
                <div className="flex items-center gap-1">
                    <span className="text-purple-500">🎥 Vídeo</span>
                </div>
            );
        }
        
        if (message.imageUrl) {
            return (
                <div className="flex items-center gap-1">
                    <span className="text-green-500">📷 Imagem</span>
                </div>
            );
        }
        
        if (message.isLocation && message.text) {
            return (
                <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-blue-500" />
                    <span className="text-blue-500">📍 Localização</span>
                </div>
            );
        }
        return message.text;
    };

    const renderChatAvatar = (chat: Chat) => {
        // Se a última mensagem foi do admin, mostrar foto do admin
        if (chat.lastMessage?.senderId === 'admin') {
            return (
                <>
                    <AvatarImage 
                        src={profileSettings?.profilePictureUrl} 
                        alt="Admin"
                    />
                    <AvatarFallback className="bg-blue-100 text-blue-600">A</AvatarFallback>
                </>
            );
        }
        
        // Para usuários - mostrar foto se disponível
        if (chat.userInfo?.photoURL) {
            return (
                <>
                    <AvatarImage 
                        src={chat.userInfo.photoURL} 
                        alt={chat.userInfo.displayName || 'Usuário'}
                    />
                    <AvatarFallback className={getChatType(chat.id) === 'temporary' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}>
                        {chat.userInfo.displayName?.charAt(0) || 'U'}
                    </AvatarFallback>
                </>
            );
        }
        
        // Fallback para usuários sem foto
        const chatType = getChatType(chat.id);
        const chatSuffix = chat.id.split('-').pop() || 'user';
        const userLetter = chatSuffix.charAt(0).toUpperCase();
        
        return (
            <AvatarFallback className={chatType === 'temporary' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}>
                {userLetter}
            </AvatarFallback>
        );
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
                <h1 className="text-xl font-semibold md:text-2xl">Conversas Ativas</h1>
                <p className="text-sm text-muted-foreground md:text-base">
                    Gerencie todas as conversas com seus clientes
                </p>
            </div>
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg md:text-xl">Caixa de Entrada</CardTitle>
                    <CardDescription className="text-sm md:text-base">
                        Visualize e responda as mensagens dos seus clientes. Novos visitantes aparecerão aqui.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center py-8 md:py-10">
                            <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin text-primary" />
                        </div>
                    ) : chats.length === 0 ? (
                        <div className="text-center py-8 md:py-10">
                            <MessageSquare className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground" />
                            <h3 className="mt-3 md:mt-4 text-base md:text-lg font-semibold">Nenhuma conversa encontrada</h3>
                            <p className="mt-1 text-xs md:text-sm text-muted-foreground px-4">
                                Quando um visitante ou cliente iniciar um chat, ele aparecerá aqui.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table */}
                            <div className="hidden md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[80px]">Avatar</TableHead>
                                            <TableHead>Cliente</TableHead>
                                            <TableHead>Última Atividade</TableHead>
                                            <TableHead>Tipo</TableHead>
                                            <TableHead className="text-right">Horário</TableHead>
                                            <TableHead className="w-[100px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {chats.map((chat) => (
                                            <TableRow key={chat.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/admin/chat/${chat.id}`)}>
                                                <TableCell>
                                                    <Avatar>
                                                        {renderChatAvatar(chat)}
                                                    </Avatar>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{getChatParticipantName(chat)}</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {chat.userInfo?.email ? chat.userInfo.email : `ID: ${chat.id.length > 30 ? `${chat.id.substring(0, 30)}...` : chat.id}`}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="max-w-sm truncate">
                                                    {chat.lastMessage ? (
                                                        <>
                                                            <span className="font-semibold">{chat.lastMessage.senderId === 'admin' ? 'Você: ' : ''}</span>
                                                            {renderLastMessage(chat.lastMessage)}
                                                        </>
                                                    ) : (
                                                        <span className="text-muted-foreground italic flex items-center gap-2"><UserCheck className="h-4 w-4 text-green-500" /> Novo visitante online</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {getChatType(chat.id) === 'temporary' ? (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                                            🔒 Temporário
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                            💾 Permanente
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right text-muted-foreground text-xs">
                                                    {chat.lastMessage ? formatDistanceToNow(chat.lastMessage.timestamp.toDate(), { addSuffix: true, locale: ptBR }) : (chat.createdAt ? formatDistanceToNow(chat.createdAt.toDate(), { addSuffix: true, locale: ptBR }) : '-')}
                                                </TableCell>
                                                <TableCell className="text-right flex gap-2 items-center justify-end">
                                                    <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); router.push(`/admin/chat/${chat.id}`); }}>
                                                        Abrir Chat <ArrowRight className="ml-2 h-4 w-4" />
                                                    </Button>
                                                    <DeleteSecretChatButton chatId={chat.id} onDeleted={() => setChats(chats => chats.filter(c => c.id !== chat.id))} />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile Cards */}
                            <div className="md:hidden space-y-3">
                                {chats.map((chat) => (
                                    <Card key={chat.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => router.push(`/admin/chat/${chat.id}`)}>
                                        <CardContent className="p-4">
                                            <div className="flex items-start gap-3">
                                                <Avatar className="h-10 w-10 flex-shrink-0">
                                                    {renderChatAvatar(chat)}
                                                </Avatar>
                                                
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <h3 className="font-medium text-sm truncate">
                                                            {getChatParticipantName(chat)}
                                                        </h3>
                                                        <div className="flex items-center gap-2">
                                                            {getChatType(chat.id) === 'temporary' ? (
                                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                                                    🔒
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                                    💾
                                                                </span>
                                                            )}
                                                            <span className="text-xs text-muted-foreground">
                                                                {chat.lastMessage ? formatDistanceToNow(chat.lastMessage.timestamp.toDate(), { addSuffix: true, locale: ptBR }) : (chat.createdAt ? formatDistanceToNow(chat.createdAt.toDate(), { addSuffix: true, locale: ptBR }) : '-')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="text-sm text-muted-foreground mb-2">
                                                        {chat.userInfo?.email ? chat.userInfo.email : `ID: ${chat.id.length > 20 ? `${chat.id.substring(0, 20)}...` : chat.id}`}
                                                    </div>
                                                    
                                                    <div className="text-sm mb-3">
                                                        {chat.lastMessage ? (
                                                            <div className="flex items-center gap-1">
                                                                <span className="font-semibold text-xs">{chat.lastMessage.senderId === 'admin' ? 'Você: ' : ''}</span>
                                                                <span className="truncate">{renderLastMessage(chat.lastMessage)}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground italic flex items-center gap-2 text-xs">
                                                                <UserCheck className="h-3 w-3 text-green-500" /> 
                                                                Novo visitante online
                                                            </span>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="flex gap-2">
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            className="flex-1 text-xs h-8"
                                                            onClick={e => { 
                                                                e.stopPropagation(); 
                                                                router.push(`/admin/chat/${chat.id}`); 
                                                            }}
                                                        >
                                                            Abrir Chat <ArrowRight className="ml-1 h-3 w-3" />
                                                        </Button>
                                                        <div onClick={e => e.stopPropagation()}>
                                                            <DeleteSecretChatButton 
                                                                chatId={chat.id} 
                                                                onDeleted={() => setChats(chats => chats.filter(c => c.id !== chat.id))} 
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
