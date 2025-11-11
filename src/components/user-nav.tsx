'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { User, LogOut, Crown, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUserAuth } from '@/hooks/use-user-auth';

export default function UserNav() {
  // Sempre executar todos os hooks primeiro
  const { user, userProfile, handleLogout } = useUserAuth();
  const router = useRouter();

  // Renderização condicional apenas no final
  if (!user || !userProfile) {
    return (
      <div className="flex items-center space-x-2">
        {/* Botão de Entrar removido */}
        {/* Botão de Acesso Administrativo comentado */}
        {/* <Button 
          variant="ghost" 
          size="sm" 
          className="text-muted-foreground hover:text-primary hover:bg-primary/10"
          onClick={() => router.push('/admin')}
          title="Acesso Administrativo"
        >
          <ShieldCheck className="w-4 h-4" />
          <span className="sr-only">Admin</span>
        </Button> */}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <span className="relative inline-block">
            <Avatar className="h-10 w-10">
              <AvatarImage src={userProfile.photoURL} alt={userProfile.displayName} />
              <AvatarFallback>
                {userProfile.displayName?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            {userProfile.isSubscriber && (
              <span className="absolute -top-2 -right-2 bg-transparent">
                <Crown className="w-5 h-5 text-yellow-400 drop-shadow-md" strokeWidth={2.5} fill="#fde047" />
              </span>
            )}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium leading-none">
                {userProfile.displayName || 'Carregando...'}
              </p>
              {userProfile.isSubscriber && (
                <Badge variant="default" className="h-5 bg-gradient-to-r from-yellow-400 to-yellow-600">
                  <Crown className="w-3 h-3 mr-1" />
                  VIP
                </Badge>
              )}
            </div>
            <p className="text-xs leading-none text-muted-foreground">
              {userProfile.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <Link href="/perfil">
          <DropdownMenuItem className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            <span>Perfil</span>
          </DropdownMenuItem>
        </Link>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-red-600 focus:text-red-600"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
