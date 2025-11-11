
"use client";
import { PhoneOff } from "lucide-react";

export default function SecretChatPage() {
  const handleStartChat = () => {
    // lógica do chat secreto aqui
  };

  return (
    <main className="relative min-h-screen bg-black">
      <div className="absolute bottom-8 right-8 flex flex-col items-center">
        <span className="mb-2 text-white font-bold text-base tracking-wide">WHATSAPP</span>
        <button
          className="rounded-full border border-gray-400 bg-white p-4 flex items-center justify-center hover:scale-105 transition-transform duration-200"
          onClick={handleStartChat}
        >
          <PhoneOff className="h-8 w-8 text-black" />
        </button>
      </div>
    </main>
  );
}
