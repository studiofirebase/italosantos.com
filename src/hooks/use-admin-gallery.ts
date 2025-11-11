'use client';

import { useState, useEffect } from 'react';
import { ProfileSettings } from '@/app/admin/settings/actions';

interface UseAdminGalleryReturn {
  galleryPhotos: { url: string }[];
  galleryNames: string[];
  profilePhoto: string;
  coverPhoto: string;
  settings: ProfileSettings | null;
  loading: boolean;
  error: string | null;
  refreshSettings: () => Promise<void>;
}

/**
 * Hook para buscar configurações do painel admin, incluindo fotos das galerias
 */
export function useAdminGallery(): UseAdminGalleryReturn {
  const [settings, setSettings] = useState<ProfileSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/profile-settings', {
        next: { revalidate: 300 } // Cache por 5 minutos
      });
      
      if (!response.ok) {
        throw new Error('Falha ao carregar configurações');
      }
      
      const data: ProfileSettings = await response.json();
      setSettings(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      
    } finally {
      setLoading(false);
    }
  };

  const refreshSettings = async () => {
    await fetchSettings();
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const galleryPhotos = settings?.galleryPhotos || [];
  const galleryNames = settings?.galleryNames || [
    "ACOMPANHANTE MASCULINO", 
    "SENSUALIDADE", 
    "PRAZER", 
    "BDSM", 
    "FETISH", 
    "FANTASIA", 
    "IS"
  ];
  const profilePhoto = settings?.profilePictureUrl || 'https://placehold.co/150x150.png';
  const coverPhoto = settings?.coverPhotoUrl || 'https://placehold.co/1200x400.png';

  return {
    galleryPhotos,
    galleryNames,
    profilePhoto,
    coverPhoto,
    settings,
    loading,
    error,
    refreshSettings
  };
}
