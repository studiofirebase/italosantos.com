'use client';

import { FaceIDAuthProvider } from '@/contexts/face-id-auth-context';
import { AuthProvider } from '@/contexts/AuthProvider';
import Layout from '@/components/layout/layout';
import { usePathname } from 'next/navigation';

export function ConditionalProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // 🔒 CRÍTICO: Se for rota admin, NÃO usar nenhum provider de autenticação
  if (pathname?.startsWith('/admin')) {
    return <>{children}</>;
  }
  
  // Para outras rotas, usar os providers normais
  return (
    <AuthProvider>
      <FaceIDAuthProvider>
        <Layout>
          {children}
        </Layout>
      </FaceIDAuthProvider>
    </AuthProvider>
  );
}
