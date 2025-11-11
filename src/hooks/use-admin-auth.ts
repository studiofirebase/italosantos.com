import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export function useAdminAuth(authKey: number = 0) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Verificar autenticação na inicialização e quando authKey mudar
  useEffect(() => {

    
    const authStatus = localStorage.getItem("adminAuthenticated");
    const authenticated = authStatus === "true";
    

    
    setIsAuthenticated(authenticated);
    setIsLoading(false);
  }, [authKey]);

  // Função de logout
  const handleLogout = useCallback(() => {

    
    // Limpar dados de autenticação do admin
    localStorage.removeItem("adminAuthenticated");
    localStorage.removeItem("adminUser");
    
    // Limpar cookies específicos do admin
    document.cookie = `isAuthenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    document.cookie = `isAdmin=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    
    // NÃO limpar todos os cookies - apenas os específicos do admin
    // document.cookie.split(";").forEach(function(c) { 
    //   document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    // });
    
    setIsAuthenticated(false);
    router.push('/');
  }, [router]);

  return {
    isAuthenticated,
    isLoading,
    handleLogout
  };
}
