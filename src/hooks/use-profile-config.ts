'use client';

import { useState, useEffect } from 'react';
import { ProfileSettings } from '@/app/admin/settings/actions';
import { ProfileConfigService } from '@/services/profile-config-service';

export function useProfileConfig() {
  const [settings, setSettings] = useState<ProfileSettings | null>(() => {
    // Tentar carregar do localStorage primeiro para evitar flickering
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('profileSettings');
        return cached ? JSON.parse(cached) : null;
      } catch {
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      if (settings) {
        setLoading(false); // Se já temos dados em cache, não mostrar loading
      } else {
        setLoading(true);
      }
      setError(null);
      const data = await ProfileConfigService.getProfileSettings();
      setSettings(data);
      
      // Salvar no localStorage para próximas carregadas
      if (typeof window !== 'undefined' && data) {
        localStorage.setItem('profileSettings', JSON.stringify(data));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: ProfileSettings) => {
    try {
      const success = await ProfileConfigService.updateProfileSettings(newSettings);
      if (success) {
        setSettings(newSettings);
        return true;
      }
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar configurações');
      return false;
    }
  };

  const refreshSettings = () => {
    ProfileConfigService.clearCache();
    // Limpar cache local também
    if (typeof window !== 'undefined') {
      localStorage.removeItem('profileSettings');
    }
    setSettings(null);
    loadSettings();
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // Recarregar configurações a cada 30 segundos para pegar mudanças do painel admin
  useEffect(() => {
    const interval = setInterval(() => {
      loadSettings();
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, []);

  return {
    settings,
    loading,
    error,
    updateSettings,
    refreshSettings,
    // Helpers específicos com fallbacks mais robustos
    profilePhoto: settings?.profilePictureUrl && settings.profilePictureUrl.trim() !== '' 
      ? settings.profilePictureUrl 
      : null,
    coverPhoto: settings?.coverPhotoUrl && settings.coverPhotoUrl.trim() !== '' 
      ? settings.coverPhotoUrl 
      : 'https://placehold.co/1200x400.png',
    galleryPhotos: settings?.galleryPhotos?.map(p => p.url) || [],
    profileInfo: settings ? {
      name: settings.name,
      email: settings.email,
      phone: settings.phone,
      address: settings.address,
    } : null,
  };
}
