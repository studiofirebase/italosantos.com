'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface FaceIDAuthContextType {
  isAuthenticated: boolean;
  userType: 'vip' | 'member' | null;
  userEmail: string | null;
  login: (userType: 'vip' | 'member', email?: string) => void;
  logout: () => void;
  registerUserWithFaceID: (email: string, faceDescriptor: Float32Array) => Promise<void>;
}

const FaceIDAuthContext = createContext<FaceIDAuthContextType | undefined>(undefined);

export function FaceIDAuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userType, setUserType] = useState<'vip' | 'member' | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (pathname?.startsWith('/admin')) {
      return;
    }

    const authStatus = localStorage.getItem('isAuthenticated');
    const storedUserType = localStorage.getItem('userType') as 'vip' | 'member' | null;
    const storedUserEmail = localStorage.getItem('userEmail');
    
    if (authStatus === 'true') {
      setIsAuthenticated(true);
      setUserType(storedUserType);
      setUserEmail(storedUserEmail);
    }
  }, [pathname]);

  const login = (type: 'vip' | 'member', email?: string) => {
    if (pathname?.startsWith('/admin')) {
      return;
    }

    setIsAuthenticated(true);
    setUserType(type);
    setUserEmail(email || null);
    
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userType', type);
    if (email) {
      localStorage.setItem('userEmail', email);
    }
    
    document.cookie = `isAuthenticated=true; path=/; max-age=${30 * 24 * 60 * 60}`;
    
    if (type === 'vip') {
      localStorage.setItem('hasSubscription', 'true');
      const vipExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      localStorage.setItem('subscriptionExpiry', vipExpiry);
      document.cookie = `hasSubscription=true; path=/; max-age=${365 * 24 * 60 * 60}`;
    }
  };

  const logout = () => {
    if (pathname?.startsWith('/admin')) {
      return;
    }

    setIsAuthenticated(false);
    setUserType(null);
    setUserEmail(null);
    
    localStorage.clear();
    sessionStorage.clear();
    
    document.cookie = 'isAuthenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    document.cookie = 'hasSubscription=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    document.cookie = 'isAdmin=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    
    if (typeof window !== 'undefined' && 'caches' in window) {
      caches.keys().then(function(names) {
        for (let name of names) {
          caches.delete(name);
        }
      });
    }
    
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  const registerUserWithFaceID = async (email: string, faceDescriptor: Float32Array) => {
    // This is a placeholder for the actual implementation
    console.log("Registering user with Face ID:", { email, faceDescriptor });
    // In a real application, you would store the face descriptor in Firestore
    // associated with the user's email.
  };

  return (
    <FaceIDAuthContext.Provider value={{
      isAuthenticated,
      userType,
      userEmail,
      login,
      logout,
      registerUserWithFaceID
    }}>
      {children}
    </FaceIDAuthContext.Provider>
  );
}

export function useFaceIDAuth() {
  const context = useContext(FaceIDAuthContext);
  if (context === undefined) {
    throw new Error('useFaceIDAuth must be used within a FaceIDAuthProvider');
  }
  return context;
}
