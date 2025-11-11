'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ProfileSettings } from '@/app/admin/settings/actions';

export function useProfileSettings() {
  const [settings, setSettings] = useState<ProfileSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const settingsDoc = doc(db, 'admin', 'profileSettings');
        const docSnap = await getDoc(settingsDoc);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as ProfileSettings;
          
          // Garantir valores padrão
          if (!data.adultWorkLabel) {
            data.adultWorkLabel = '+18 ADULT WORK';
          }
          
          setSettings(data);
        } else {
          // Configurações padrão se não existir documento
          setSettings({
            name: '',
            phone: '',
            email: '',
            address: '',
            profilePictureUrl: 'https://placehold.co/150x150.png',
            coverPhotoUrl: 'https://placehold.co/1200x400.png',
            galleryPhotos: [],
            adultWorkLabel: '+18 ADULT WORK'
          });
        }
      } catch (err) {
        console.error('Erro ao carregar configurações:', err);
        setError('Erro ao carregar configurações');
        
        // Fallback para configurações padrão
        setSettings({
          name: '',
          phone: '',
          email: '',
          address: '',
          profilePictureUrl: 'https://placehold.co/150x150.png',
          coverPhotoUrl: 'https://placehold.co/1200x400.png',
          galleryPhotos: [],
          adultWorkLabel: '+18 ADULT WORK'
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  return {
    settings,
    isLoading,
    error,
    adultWorkLabel: settings?.adultWorkLabel || '+18 ADULT WORK',
    showAdultContent: settings?.showAdultContent ?? true // Default: true (mostrar conteúdo adulto)
  };
}
