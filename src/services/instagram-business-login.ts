'use client';

/**
 * Serviço de integração do Instagram Business Login
 * Utiliza o Instagram Business Login para obter access tokens
 */

interface InstagramAuthResponse {
    data: Array<{
        access_token: string;
        user_id: string;
        permissions: string;
    }>;
}

interface InstagramLongLivedTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}

interface InstagramErrorResponse {
    error_type: string;
    code: number;
    error_message: string;
}

export class InstagramBusinessLogin {
    private static INSTAGRAM_APP_ID = typeof window !== 'undefined'
        ? process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID
        : '';

    private static INSTAGRAM_APP_SECRET = typeof window !== 'undefined'
        ? process.env.NEXT_PUBLIC_INSTAGRAM_APP_SECRET
        : '';

    private static REDIRECT_URI = typeof window !== 'undefined'
        ? `${window.location.origin}/api/auth/instagram/callback`
        : '';

    /**
     * Constrói a URL de autorização do Instagram Business Login
     */
    static getAuthorizationUrl(
        scopes: string[] = [
            'instagram_business_basic',
            'instagram_business_content_publish',
            'instagram_business_manage_messages',
            'instagram_business_manage_comments'
        ],
        state?: string
    ): string {
        const params = new URLSearchParams();
        params.append('client_id', this.INSTAGRAM_APP_ID || '');
        params.append('redirect_uri', this.REDIRECT_URI);
        params.append('response_type', 'code');
        params.append('scope', scopes.join(','));

        if (state) {
            params.append('state', state);
        }

        return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
    }

    /**
     * Abre o popup de autorização do Instagram
     */
    static openAuthorizationPopup(
        scopes?: string[],
        state?: string
    ): Window | null {
        if (typeof window === 'undefined') return null;

        const url = this.getAuthorizationUrl(scopes, state);
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        const popup = window.open(
            url,
            'Instagram Business Login',
            `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes,copyhistory=no`
        );

        console.log('[Instagram Business Login] Popup aberto:', !!popup);
        return popup;
    }

    /**
     * Troca o código de autorização por um access token de curta duração
     */
    static async exchangeCodeForToken(code: string): Promise<InstagramAuthResponse> {
        try {
            const response = await fetch('/api/auth/instagram/exchange-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code }),
            });

            if (!response.ok) {
                const error: InstagramErrorResponse = await response.json();
                throw new Error(error.error_message || 'Erro ao trocar código por token');
            }

            return await response.json();
        } catch (error) {
            console.error('[Instagram Business Login] Erro ao trocar código:', error);
            throw error;
        }
    }

    /**
     * Troca um token de curta duração por um de longa duração (60 dias)
     */
    static async getLongLivedToken(
        shortLivedToken: string
    ): Promise<InstagramLongLivedTokenResponse> {
        try {
            const response = await fetch('/api/auth/instagram/long-lived-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ access_token: shortLivedToken }),
            });

            if (!response.ok) {
                const error: InstagramErrorResponse = await response.json();
                throw new Error(error.error_message || 'Erro ao obter token de longa duração');
            }

            return await response.json();
        } catch (error) {
            console.error('[Instagram Business Login] Erro ao obter token de longa duração:', error);
            throw error;
        }
    }

    /**
     * Renova um token de longa duração (deve ter pelo menos 24h)
     */
    static async refreshLongLivedToken(
        longLivedToken: string
    ): Promise<InstagramLongLivedTokenResponse> {
        try {
            const response = await fetch('/api/auth/instagram/refresh-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ access_token: longLivedToken }),
            });

            if (!response.ok) {
                const error: InstagramErrorResponse = await response.json();
                throw new Error(error.error_message || 'Erro ao renovar token');
            }

            return await response.json();
        } catch (error) {
            console.error('[Instagram Business Login] Erro ao renovar token:', error);
            throw error;
        }
    }

    /**
     * Obtém informações da conta profissional do Instagram
     */
    static async getAccountInfo(accessToken: string): Promise<any> {
        try {
            const response = await fetch(`/api/instagram/me?access_token=${accessToken}`);

            if (!response.ok) {
                throw new Error('Erro ao obter informações da conta');
            }

            return await response.json();
        } catch (error) {
            console.error('[Instagram Business Login] Erro ao obter informações da conta:', error);
            throw error;
        }
    }
}
