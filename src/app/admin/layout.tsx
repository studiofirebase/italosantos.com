
"use client";

import { useState, useCallback, useEffect } from 'react';
import AdminHeader from '@/components/admin/header';
import AdminSidebar from '@/components/admin/sidebar';
import AdminLoginForm from './login-form';
import { usePathname, useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/use-admin-auth';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [authKey, setAuthKey] = useState(0); // Força re-renderização
  const { isAuthenticated, isLoading, handleLogout } = useAdminAuth(authKey);
  const router = useRouter();
  const pathname = usePathname();

  const handleAuthSuccess = useCallback(() => {
    // Força uma re-renderização para que o useAdminAuth detecte a mudança
    setAuthKey(prev => prev + 1);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };
  
  // Exibe um estado de carregamento enquanto a autenticação é verificada no cliente.
  if (isLoading) {
    return (
       <div className="flex h-screen w-full items-center justify-center bg-background">
        <p className="text-muted-foreground">Verificando autorização...</p>
      </div>
    );
  }

  // Se não estiver autenticado, renderiza o formulário de login.
  if (!isAuthenticated) {
    return <AdminLoginForm onAuthSuccess={handleAuthSuccess} />;
  }

  // Se autenticado, renderiza o layout do painel de administração.
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      {/* Sidebar para Desktop */}
      <div className="hidden border-r bg-muted/40 md:block">
        <AdminSidebar onLogout={handleLogout} />
      </div>

      {/* Layout Principal */}
      <div className="flex flex-col">
        {/* Cabeçalho para Mobile */}
        <AdminHeader onMenuClick={toggleSidebar} />
        
        {/* Conteúdo da Página */}
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          {children}
        </main>
      </div>

      {/* Sidebar para Mobile (Sheet) */}
      <div 
          className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${
              isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
      >
          {/* Overlay */}
          <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={toggleSidebar}
          />
          
          {/* Sidebar */}
          <div 
              className={`absolute top-0 left-0 h-full w-[280px] bg-background border-r shadow-2xl transform transition-transform duration-300 ease-in-out ${
                  isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
              }`}
              onClick={(e) => e.stopPropagation()}
          >
              <AdminSidebar 
                  onLogout={() => {
                      handleLogout();
                      toggleSidebar();
                  }}
                  onClose={toggleSidebar}
              />
          </div>
      </div>
    </div>
  );
}
