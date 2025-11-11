
"use client";

import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { X } from 'lucide-react';
import Image from 'next/image';


interface SecretChatButtonProps {
    onClick: () => void;
    isChatOpen: boolean;
}

export default function SecretChatButton({ onClick, isChatOpen }: SecretChatButtonProps) {
    // Esconder o botão quando o chat estiver aberto
    if (isChatOpen) return null;
    
    return (
       <div
            className={cn(
                "fixed bottom-6 left-6 z-40 flex flex-col items-center gap-2"
            )}
       >
            <div className="order-1 text-base font-bold text-white tracking-wide">
                CHAT SECRETO
            </div>
            <button
                onClick={onClick}
                aria-label={isChatOpen ? "Fechar Chat Secreto" : "Abrir Chat Secreto"}
                className={cn(
                    "relative h-16 w-16 transition-all duration-300 order-2 group rounded-full border border-gray-400 bg-white hover:scale-105 shadow-neon-white"
                )}
            >
                {isChatOpen ? (
                    <div className="flex items-center justify-center h-full w-full rounded-full">
                        <X className="h-8 w-8 text-black" />
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full w-full rounded-full">
                        <img
                            src="/lcon-chat-secreto.svg"
                            alt="Chat Secreto"
                            width={32}
                            height={32}
                            style={{ objectFit: 'contain', filter: 'brightness(0)' }}
                            className="rounded-full"
                        />
                    </div>
                )}
            </button>
       </div>
    );
}
