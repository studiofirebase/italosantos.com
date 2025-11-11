
"use client";

import { Button } from '@/components/ui/button';
import { Menu, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import UserNav from '@/components/user-nav';

const Header = ({ onMenuClick }: { onMenuClick: () => void }) => {
  const router = useRouter();
  const pathname = usePathname();
  
  // Não mostrar menu hambúrguer em páginas de autenticação
  const showMenuButton = !pathname?.startsWith('/auth');
  
  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Linha branca absoluta removida conforme solicitado */}
      {/* Linha branca absoluta atravessando toda a largura, logo abaixo do header */}
      <div className="absolute left-0 bottom-0 w-full h-[2px] bg-white/80 pointer-events-none z-50" />
      <div className="container flex h-14 max-w-screen-2xl items-center justify-between relative">
        <div className="flex items-center space-x-2">
          {showMenuButton && (
            <Button variant="ghost" size="icon" onClick={onMenuClick} className="text-muted-foreground hover:text-white hover:bg-gray-800 !shadow-none">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          )}
          <Link href="/" className="text-2xl font-bold text-white shadow-neon-white px-4 rounded-md">
            IS
          </Link>
        </div>
        <div className="flex-1 flex justify-center px-4">
          {/* O botão foi movido para o layout principal para ficar fixo no topo */}
        </div>
        <div className="flex items-center space-x-2">
          <UserNav />
        </div>
      </div>
    </header>
  );
};

export default Header;
