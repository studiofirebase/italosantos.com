/**
 * Meta SDK Integration Service
 * Handles Facebook and Instagram authentication via popup
 * Collects: name/nickname, profile photo, email (or generates random)
 */

// Facebook SDK types
interface FacebookStatusResponse {
  status: 'connected' | 'not_authorized' | 'unknown';
  authResponse?: {
    accessToken: string;
    expiresIn: string;
    signedRequest: string;
    userID: string;
  };
}

interface MetaUserProfile {
  id: string;
  name: string;
  email: string;
  picture?: string;
  platform: 'facebook' | 'instagram';
}

interface FacebookUserData {
  id: string;
  name: string;
  email?: string;
  picture?: {
    data: {
      url: string;
    };
  };
}

interface InstagramUserData {
  id: string;
  username: string;
  account_type?: string;
  media_count?: number;
}

class MetaSDKIntegration {
  private appId: string;
  private instagramAppId: string;

  constructor() {
    this.appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '';
    this.instagramAppId = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID || '';
  }

  /**
   * Initialize Meta SDK (Facebook)
   * Polls for window.FB to be available
   */
  async initialize(): Promise<void> {
    console.log('[Meta SDK] Initializing...');

    // Check if already loaded
    if (typeof window !== 'undefined' && window.FB) {
      console.log('[Meta SDK] Already initialized');
      return;
    }

    // Wait for SDK to load (up to 10 seconds)
    const maxAttempts = 100;
    const interval = 100;
    let attempts = 0;

    return new Promise((resolve, reject) => {
      const checkSDK = setInterval(() => {
        attempts++;

        if (window.FB) {
          console.log('[Meta SDK] SDK loaded successfully');
          clearInterval(checkSDK);
          resolve();
          return;
        }

        if (attempts % 10 === 0) {
          console.log(`[Meta SDK] Still waiting... (${attempts * interval}ms)`);
        }

        if (attempts >= maxAttempts) {
          console.error('[Meta SDK] Timeout waiting for SDK');
          clearInterval(checkSDK);
          reject(new Error('Timeout ao carregar Meta SDK'));
        }
      }, interval);
    });
  }

  /**
   * Generate random email when not available
   */
  private generateRandomEmail(): string {
    const randomId = Math.random().toString(36).substring(2, 10);
    const timestamp = Date.now().toString(36);
    return `user_${randomId}${timestamp}@italosantos.com`;
  }

  /**
   * Facebook Login via Popup
   * Collects: name, email, profile picture
   */
  async loginWithFacebook(): Promise<MetaUserProfile> {
    console.log('[Meta SDK] Starting Facebook login...');

    await this.initialize();

    return new Promise((resolve, reject) => {
      if (!window.FB) {
        reject(new Error('Facebook SDK não carregado'));
        return;
      }

      // Open popup for authentication
      window.FB.login(
        (response: FacebookStatusResponse) => {
          console.log('[Meta SDK] Facebook login response:', response);

          if (response.status === 'connected' && response.authResponse) {
            const accessToken = response.authResponse.accessToken;

            // Get user profile data
            window.FB.api(
              '/me',
              { fields: 'id,name,email,picture.type(large)' },
              (userResponse: FacebookUserData) => {
                console.log('[Meta SDK] Facebook user data:', userResponse);

                const profile: MetaUserProfile = {
                  id: userResponse.id,
                  name: userResponse.name || 'Usuário Facebook',
                  email: userResponse.email || this.generateRandomEmail(),
                  picture: userResponse.picture?.data?.url,
                  platform: 'facebook',
                };

                console.log('[Meta SDK] Facebook profile collected:', profile);
                resolve(profile);
              }
            );
          } else {
            console.error('[Meta SDK] Facebook login failed:', response);
            reject(new Error('Falha ao autenticar com Facebook'));
          }
        },
        {
          scope: 'email,public_profile,user_photos,instagram_basic,pages_show_list',
          return_scopes: true,
          auth_type: 'rerequest',
        }
      );
    });
  }

  /**
   * Instagram Business Login via Popup
   * Uses Facebook SDK to connect Instagram Business account
   * Collects: username, profile data
   */
  async loginWithInstagram(): Promise<MetaUserProfile> {
    console.log('[Meta SDK] Starting Instagram login...');

    await this.initialize();

    return new Promise((resolve, reject) => {
      if (!window.FB) {
        reject(new Error('Facebook SDK não carregado'));
        return;
      }

      // Instagram Business Login requires Facebook authentication first
      window.FB.login(
        async (response: FacebookStatusResponse) => {
          console.log('[Meta SDK] Instagram login response:', response);

          if (response.status === 'connected' && response.authResponse) {
            const accessToken = response.authResponse.accessToken;

            try {
              // Get Facebook Pages
              const pagesResponse = await this.getFacebookPages(accessToken);
              console.log('[Meta SDK] Facebook Pages:', pagesResponse);

              if (!pagesResponse || pagesResponse.length === 0) {
                reject(new Error('Nenhuma página encontrada. Você precisa ter uma página no Facebook conectada ao Instagram Business.'));
                return;
              }

              // Get first page (or let user choose in future)
              const pageId = pagesResponse[0].id;
              const pageAccessToken = pagesResponse[0].access_token;

              // Get Instagram Business Account connected to Page
              const instagramAccount = await this.getInstagramBusinessAccount(pageId, pageAccessToken);
              console.log('[Meta SDK] Instagram account:', instagramAccount);

              if (!instagramAccount) {
                reject(new Error('Nenhuma conta do Instagram Business encontrada conectada a esta página.'));
                return;
              }

              // Get Instagram profile data
              const instagramProfile = await this.getInstagramProfile(instagramAccount.id, pageAccessToken);
              console.log('[Meta SDK] Instagram profile:', instagramProfile);

              const profile: MetaUserProfile = {
                id: instagramAccount.id,
                name: instagramProfile.username || instagramProfile.name || 'Usuário Instagram',
                email: this.generateRandomEmail(), // Instagram doesn't provide email
                picture: instagramProfile.profile_picture_url,
                platform: 'instagram',
              };

              console.log('[Meta SDK] Instagram profile collected:', profile);
              resolve(profile);
            } catch (error) {
              console.error('[Meta SDK] Instagram data fetch failed:', error);
              reject(error);
            }
          } else {
            console.error('[Meta SDK] Instagram login failed:', response);
            reject(new Error('Falha ao autenticar com Instagram'));
          }
        },
        {
          scope: 'email,public_profile,pages_show_list,instagram_basic,instagram_manage_insights,pages_read_engagement',
          return_scopes: true,
          auth_type: 'rerequest',
        }
      );
    });
  }

  /**
   * Get Facebook Pages for the authenticated user
   */
  private getFacebookPages(accessToken: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      window.FB.api(
        '/me/accounts',
        { access_token: accessToken },
        (response: any) => {
          if (response && !response.error) {
            resolve(response.data || []);
          } else {
            reject(new Error(response.error?.message || 'Erro ao buscar páginas'));
          }
        }
      );
    });
  }

  /**
   * Get Instagram Business Account connected to a Facebook Page
   */
  private getInstagramBusinessAccount(pageId: string, pageAccessToken: string): Promise<any> {
    return new Promise((resolve, reject) => {
      window.FB.api(
        `/${pageId}`,
        { fields: 'instagram_business_account', access_token: pageAccessToken },
        (response: any) => {
          if (response && !response.error) {
            resolve(response.instagram_business_account || null);
          } else {
            reject(new Error(response.error?.message || 'Erro ao buscar conta do Instagram'));
          }
        }
      );
    });
  }

  /**
   * Get Instagram profile data
   */
  private getInstagramProfile(instagramAccountId: string, accessToken: string): Promise<any> {
    return new Promise((resolve, reject) => {
      window.FB.api(
        `/${instagramAccountId}`,
        { 
          fields: 'id,username,name,profile_picture_url,followers_count,follows_count,media_count',
          access_token: accessToken 
        },
        (response: any) => {
          if (response && !response.error) {
            resolve(response);
          } else {
            reject(new Error(response.error?.message || 'Erro ao buscar perfil do Instagram'));
          }
        }
      );
    });
  }

  /**
   * Get current login status
   */
  async getLoginStatus(): Promise<FacebookStatusResponse> {
    await this.initialize();

    return new Promise((resolve, reject) => {
      if (!window.FB) {
        reject(new Error('Facebook SDK não carregado'));
        return;
      }

      window.FB.getLoginStatus((response: FacebookStatusResponse) => {
        resolve(response);
      });
    });
  }

  /**
   * Logout from Facebook/Instagram
   */
  async logout(): Promise<void> {
    await this.initialize();

    return new Promise((resolve, reject) => {
      if (!window.FB) {
        reject(new Error('Facebook SDK não carregado'));
        return;
      }

      window.FB.logout(() => {
        console.log('[Meta SDK] Logged out successfully');
        resolve();
      });
    });
  }
}

// Export singleton instance
export const metaSDK = new MetaSDKIntegration();
export type { MetaUserProfile };
