'use client';

/**
 * Serviço de integração do Facebook SDK com o admin
 * Utiliza o Facebook SDK para login e obtenção de dados
 */

// Tipos para respostas do Facebook
interface FacebookAuthResponse {
    status: 'connected' | 'not_authorized' | 'unknown';
    authResponse?: {
        accessToken: string;
        expiresIn: string;
        signedRequest: string;
        userID: string;
    };
}

interface FacebookUser {
    id: string;
    name: string;
    email: string;
    picture?: {
        data: {
            url: string;
        };
    };
}

// Declarar tipos globais do Facebook SDK
declare global {
    interface Window {
        fbAsyncInit?: () => void;
        FB: any;
    }
}

export class FacebookSDKIntegration {
    private static isInitialized = false;
    private static appId = typeof window !== 'undefined'
        ? process.env.NEXT_PUBLIC_FACEBOOK_APP_ID
        : '';

    /**
     * Inicializa o Facebook SDK carregando o script
     */
    static async initialize(): Promise<void> {
        if (this.isInitialized) return;
        if (typeof window === 'undefined') return;

        return new Promise((resolve) => {
            window.fbAsyncInit = () => {
                try {
                    // @ts-ignore
                    FB.init({
                        appId: this.appId,
                        cookie: true,
                        xfbml: true,
                        version: 'v23.0',
                    });

                    // @ts-ignore
                    FB.AppEvents.logPageView();
                    this.isInitialized = true;
                    resolve();
                } catch (error) {
                    console.error('Erro ao inicializar Facebook SDK:', error);
                    resolve();
                }
            };

            // Carregar o script do Facebook SDK
            if (!document.getElementById('facebook-jssdk')) {
                const script = document.createElement('script');
                script.id = 'facebook-jssdk';
                script.src = 'https://connect.facebook.net/pt_BR/sdk.js';
                script.async = true;
                script.defer = true;
                document.head.appendChild(script);
            }
        });
    }

    /**
     * Realiza o login com Facebook
     */
    static async login(scope: string = 'email,public_profile'): Promise<FacebookAuthResponse> {
        await this.initialize();

        return new Promise((resolve, reject) => {
            try {
                // @ts-ignore
                FB.login(
                    (response: FacebookAuthResponse) => {
                        if (response.status === 'connected') {
                            resolve(response);
                        } else {
                            reject(new Error('Facebook login failed or was cancelled'));
                        }
                    },
                    { scope }
                );
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Faz logout do Facebook
     */
    static async logout(): Promise<void> {
        if (!this.isInitialized) return;

        return new Promise((resolve) => {
            try {
                // @ts-ignore
                FB.logout(() => {
                    resolve();
                });
            } catch (error) {
                console.error('Erro ao deslogar do Facebook:', error);
                resolve();
            }
        });
    }

    /**
     * Obtém o status de login atual
     */
    static async getLoginStatus(): Promise<FacebookAuthResponse> {
        await this.initialize();

        return new Promise((resolve) => {
            try {
                // @ts-ignore
                FB.getLoginStatus((response: FacebookAuthResponse) => {
                    resolve(response);
                });
            } catch (error) {
                console.error('Erro ao obter status de login:', error);
                resolve({ status: 'unknown' });
            }
        });
    }

    /**
     * Obtém informações do usuário logado
     */
    static async getUserInfo(): Promise<FacebookUser | null> {
        await this.initialize();

        return new Promise((resolve) => {
            try {
                // @ts-ignore
                FB.api(
                    '/me',
                    { fields: 'id,name,email,picture' },
                    (response: any) => {
                        if (response.error) {
                            console.error('Erro ao obter informações do usuário:', response.error);
                            resolve(null);
                        } else {
                            resolve(response as FacebookUser);
                        }
                    }
                );
            } catch (error) {
                console.error('Erro ao buscar dados do usuário:', error);
                resolve(null);
            }
        });
    }

    /**
     * Obtém as páginas do Facebook do usuário
     */
    static async getUserPages(): Promise<any[]> {
        await this.initialize();

        return new Promise((resolve) => {
            try {
                // @ts-ignore
                FB.api(
                    '/me/accounts',
                    { fields: 'id,name,access_token,picture' },
                    (response: any) => {
                        if (response.error) {
                            console.error('Erro ao obter páginas:', response.error);
                            resolve([]);
                        } else {
                            resolve(response.data || []);
                        }
                    }
                );
            } catch (error) {
                console.error('Erro ao buscar páginas:', error);
                resolve([]);
            }
        });
    }

    /**
     * Faz uma requisição ao Facebook API
     */
    static async api(
        path: string,
        params?: any,
        method: 'GET' | 'POST' | 'DELETE' = 'GET'
    ): Promise<any> {
        await this.initialize();

        return new Promise((resolve, reject) => {
            try {
                // @ts-ignore
                FB.api(
                    path,
                    method,
                    params || {},
                    (response: any) => {
                        if (response.error) {
                            reject(response.error);
                        } else {
                            resolve(response);
                        }
                    }
                );
            } catch (error) {
                reject(error);
            }
        });
    }
}
