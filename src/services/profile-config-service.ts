import { ProfileSettings } from '@/app/admin/settings/actions';

export class ProfileConfigService {
  private static cache: ProfileSettings | null = null;
  private static lastFetch: number = 0;
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  static async getProfileSettings(): Promise<ProfileSettings | null> {
    // Verificar cache
    const now = Date.now();
    if (this.cache && (now - this.lastFetch) < this.CACHE_DURATION) {
      return this.cache;
    }

    try {
      // Garantir que funciona tanto em localhost quanto Firebase
      const baseUrl = typeof window !== 'undefined' 
        ? window.location.origin 
        : process.env.NEXT_PUBLIC_SITE_URL || '';
      
      const response = await fetch(`${baseUrl}/api/admin/profile-settings`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store', // Sempre buscar dados frescos
        // Adicionar timeout para evitar travamentos
        signal: AbortSignal.timeout(30000) // 30 segundos
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile settings');
      }

      const data = await response.json();
      
      // Debug: Log dos dados recebidos apenas em desenvolvimento

      
      // Atualizar cache
      this.cache = data;
      this.lastFetch = now;
      
      return data;
    } catch (error) {
      console.error('Error fetching profile settings:', error);
      
      // Em caso de erro, retornar configurações padrão para não quebrar a UI
      const fallbackSettings = {
        name: '',
        phone: '',
        email: '',
        address: '',
        profilePictureUrl: 'https://placehold.co/150x150.png',
        coverPhotoUrl: 'https://placehold.co/1200x400.png',
        galleryPhotos: []
      };
      

      return fallbackSettings;
    }
  }

  static async updateProfileSettings(settings: ProfileSettings): Promise<boolean> {
    try {
      const response = await fetch('/api/admin/profile-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        // Limpar cache para forçar nova busca
        this.cache = null;
        this.lastFetch = 0;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error updating profile settings:', error);
      return false;
    }
  }

  static clearCache(): void {
    this.cache = null;
    this.lastFetch = 0;
  }

  // Métodos específicos para componentes do feed
  static async getGalleryPhotos(): Promise<string[]> {
    const settings = await this.getProfileSettings();
    return settings?.galleryPhotos?.map(photo => photo.url) || [];
  }

  static async getProfilePhoto(): Promise<string | null> {
    const settings = await this.getProfileSettings();
    return settings?.profilePictureUrl || null;
  }

  static async getCoverPhoto(): Promise<string | null> {
    const settings = await this.getProfileSettings();
    return settings?.coverPhotoUrl || null;
  }

  static async getProfileInfo(): Promise<Partial<ProfileSettings> | null> {
    const settings = await this.getProfileSettings();
    if (!settings) return null;

    return {
      name: settings.name,
      email: settings.email,
      phone: settings.phone,
      address: settings.address,
    };
  }
}
