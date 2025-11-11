
'use server';
/**
 * @fileOverview Server-side actions for managing profile settings.
 * These functions read from and write to the Firebase Realtime Database.
 */

import { getAdminApp } from '@/lib/firebase-admin';
import { getDatabase } from 'firebase-admin/database';
import { db as clientDb } from '@/lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

export interface ProfileSettings {
  name: string;
  phone: string;
  email: string;
  address: string;
  description?: string;
  profilePictureUrl: string;
  coverPhotoUrl: string;
  galleryPhotos: { url: string }[];
  galleryNames?: string[]; // Nomes personalizados das 7 galerias
  adultWorkLabel?: string; // Texto personalizável para "+18 Adult Work"
  showAdultContent?: boolean; // Controla exibição do aviso adulto e menu FETISH & BDSM

  // Dados Bancários
  bankAccount?: {
    bank: string;
    agency: string;
    account: string;
    accountType: string;
    cpf: string;
    pixKey: string;
  };

  // Redes Sociais
  socialMedia?: {
    instagram: string;
    twitter: string;
    youtube: string;
    whatsapp: string;
    telegram: string;
  };

  // Configurações de Avaliações
  reviewSettings?: {
    showReviews: boolean;
    moderateReviews: boolean;
    defaultReviewMessage: string;
  };

  // Configurações de Pagamento
  paymentSettings?: {
    pixValue: number;
    pixKey: string;
    pixKeyType: string;
  };

  // Configurações do Footer
  footerSettings?: {
    showTwitter: boolean;
    twitterUrl: string;
    showInstagram: boolean;
    instagramUrl: string;
    showYoutube: boolean;
    youtubeUrl: string;
    showWhatsapp: boolean;
    whatsappUrl: string;
    showTelegram: boolean;
    telegramUrl: string;
    showFacebook: boolean;
    facebookUrl: string;
  };
}

/**
 * Saves the profile settings to the Firebase Realtime Database.
 * @param settings The profile settings object to save.
 * @returns A promise that resolves when the settings are saved.
 */
export async function saveProfileSettings(settings: ProfileSettings): Promise<void> {
  try {
    // FORÇAR SEMPRE FIRESTORE (mesmo banco que o hook usa)
    const settingsDoc = doc(clientDb, 'admin', 'profileSettings');
    await setDoc(settingsDoc, settings);

    // Revalidar as páginas que usam essas configurações
    revalidatePath('/');
    revalidatePath('/admin/settings');
    revalidatePath('/api/admin/profile-settings');

  } catch (error: any) {
    throw new Error(`Failed to save settings to the database: ${error.message}`);
  }

}

/**
 * Retrieves the profile settings from the Firebase Realtime Database.
 * @returns A promise that resolves with the profile settings object, or null if not found.
 */
export async function getProfileSettings(): Promise<ProfileSettings | null> {
  const defaultGalleryNames = [
    "ACOMPANHANTE MASCULINO",
    "SENSUALIDADE",
    "PRAZER",
    "BDSM",
    "FETISH",
    "FANTASIA",
    "IS"
  ];

  try {
    // FORÇAR SEMPRE FIRESTORE (mesmo banco que o hook usa)
    const settingsDoc = doc(clientDb, 'admin', 'profileSettings');
    const docSnap = await getDoc(settingsDoc);

    if (docSnap.exists()) {
      const settings = docSnap.data() as ProfileSettings;

      // Garantir que coverPhotoUrl não seja string vazia
      if (settings.coverPhotoUrl === '') {
        settings.coverPhotoUrl = 'https://placehold.co/1200x400.png';
      }

      // Garantir que galleryNames seja um array com 7 elementos
      if (!settings.galleryNames || !Array.isArray(settings.galleryNames)) {
        settings.galleryNames = [...defaultGalleryNames];
      } else {
        // Preencher até 7 elementos se necessário
        while (settings.galleryNames.length < 7) {
          const index = settings.galleryNames.length;
          settings.galleryNames.push(defaultGalleryNames[index] || `Galeria ${index + 1}`);
        }
        // Limitar a 7 elementos
        settings.galleryNames = settings.galleryNames.slice(0, 7);
      }

      // Garantir que adultWorkLabel tenha um valor padrão
      if (!settings.adultWorkLabel) {
        settings.adultWorkLabel = '+18 ADULT WORK';
      }

      // Garantir que footerSettings tenha valores padrão
      if (!settings.footerSettings) {
        settings.footerSettings = {
          showTwitter: true,
          twitterUrl: 'https://twitter.com/italosantos',
          showInstagram: true,
          instagramUrl: 'https://instagram.com/italosantos',
          showYoutube: true,
          youtubeUrl: 'https://youtube.com/@ItaloProfissional',
          showWhatsapp: true,
          whatsappUrl: `https://wa.me/${settings.phone || '5521990479104'}`,
          showTelegram: false,
          telegramUrl: 'https://t.me/italosantos',
          showFacebook: false,
          facebookUrl: 'https://facebook.com/italosantos'
        };
      }

      return settings;
    }
    return null;
  } catch (error: any) {
    // Em caso de erro, retornar configurações padrão para não quebrar a aplicação
    return {
      name: '',
      phone: '',
      email: '',
      address: '',
      profilePictureUrl: 'https://placehold.co/150x150.png',
      coverPhotoUrl: 'https://placehold.co/1200x400.png',
      galleryPhotos: [],
      galleryNames: [...defaultGalleryNames],
      adultWorkLabel: '+18 ADULT WORK',
      footerSettings: {
        showTwitter: true,
        twitterUrl: 'https://twitter.com/italosantos',
        showInstagram: true,
        instagramUrl: 'https://instagram.com/italosantos',
        showYoutube: true,
        youtubeUrl: 'https://youtube.com/@ItaloProfissional',
        showWhatsapp: true,
        whatsappUrl: 'https://wa.me/5521990479104',
        showTelegram: false,
        telegramUrl: 'https://t.me/italosantos',
        showFacebook: false,
        facebookUrl: 'https://facebook.com/italosantos'
      }
    };
  }
}
