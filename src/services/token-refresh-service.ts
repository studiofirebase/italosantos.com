'use server';

import { getAdminApp } from '@/lib/firebase-admin';
import { getDatabase } from 'firebase-admin/database';

/**
 * Serviço de gerenciamento de refresh token para Facebook/Instagram
 * Handles automatic token refresh quando expirado
 */

interface TokenData {
    access_token: string;
    expires_in: number;
    expires_at: string;
    refresh_token?: string | null;
    refresh_token_expires_in?: number | null;
    connected_at: string;
    last_refresh_at?: string;
}/**
 * Verifica se o token precisa de refresh
 */
export async function isTokenExpired(platform: 'facebook' | 'instagram'): Promise<boolean> {
    try {
        const adminApp = getAdminApp();
        if (!adminApp) return false;

        const db = getDatabase(adminApp);
        const integrationRef = db.ref(`admin/integrations/${platform}`);
        const snapshot = await integrationRef.get();

        if (!snapshot.exists()) return false;

        const data = snapshot.val() as TokenData;
        if (!data.expires_at) return false;

        const expiresAt = new Date(data.expires_at);
        const now = new Date();

        // Refresh se expira em menos de 1 hora
        const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

        return expiresAt < oneHourFromNow;
    } catch (error) {
        console.error(`Erro ao verificar expiração do token ${platform}:`, error);
        return false;
    }
}

/**
 * Refresh do access token usando long-lived token
 * Facebook permite refresh de tokens com vida útil de 60 dias
 */
export async function refreshAccessToken(platform: 'facebook' | 'instagram'): Promise<boolean> {
    try {
        const adminApp = getAdminApp();
        if (!adminApp) {
            console.error('Firebase admin app não inicializado');
            return false;
        }

        const db = getDatabase(adminApp);
        const integrationRef = db.ref(`admin/integrations/${platform}`);
        const snapshot = await integrationRef.get();

        if (!snapshot.exists()) {
            console.error(`Nenhuma integração ${platform} encontrada`);
            return false;
        }

        const data = snapshot.val() as TokenData;
        const accessToken = data.access_token;

        if (!accessToken) {
            console.error(`Access token não encontrado para ${platform}`);
            return false;
        }

        // Para Facebook/Instagram, renovar o token de longa duração
        // Docs: https://developers.facebook.com/docs/facebook-login/access-tokens/refreshing
        const appId = process.env.FACEBOOK_APP_ID;
        const appSecret = process.env.FACEBOOK_APP_SECRET;

        if (!appId || !appSecret) {
            console.error('Credenciais do Facebook não configuradas');
            return false;
        }

        // Facebook permite renovação de tokens com grant_type=fb_exchange_token
        const refreshUrl = new URL('https://graph.facebook.com/oauth/access_token');
        refreshUrl.searchParams.set('grant_type', 'fb_exchange_token');
        refreshUrl.searchParams.set('client_id', appId);
        refreshUrl.searchParams.set('client_secret', appSecret);
        refreshUrl.searchParams.set('fb_exchange_token', accessToken);

        const refreshResponse = await fetch(refreshUrl.toString());
        const refreshData = await refreshResponse.json();

        if (!refreshResponse.ok || refreshData.error) {
            console.error(`Erro ao renovar token ${platform}:`, refreshData);
            return false;
        }

        const newAccessToken = refreshData.access_token;
        const newExpiresIn = refreshData.expires_in;

        if (!newAccessToken) {
            console.error('Novo token não recebido');
            return false;
        }

        // Calcular data de expiração
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + newExpiresIn);

        // Atualizar no Firebase
        await integrationRef.update({
            access_token: newAccessToken,
            expires_in: newExpiresIn,
            expires_at: expiresAt.toISOString(),
            last_refresh_at: new Date().toISOString(),
        });

        console.log(`✅ Token ${platform} renovado com sucesso`);
        return true;
    } catch (error) {
        console.error(`Erro ao renovar token ${platform}:`, error);
        return false;
    }
}

/**
 * Obtém access token válido, renovando se necessário
 */
export async function getValidAccessToken(platform: 'facebook' | 'instagram'): Promise<string | null> {
    try {
        // Verificar se precisa refresh
        const needsRefresh = await isTokenExpired(platform);

        if (needsRefresh) {
            const refreshed = await refreshAccessToken(platform);
            if (!refreshed) {
                console.error(`Falha ao renovar token ${platform}`);
                return null;
            }
        }

        // Obter token atual
        const adminApp = getAdminApp();
        if (!adminApp) return null;

        const db = getDatabase(adminApp);
        const integrationRef = db.ref(`admin/integrations/${platform}`);
        const snapshot = await integrationRef.get();

        if (!snapshot.exists()) return null;

        const data = snapshot.val() as TokenData;
        return data.access_token || null;
    } catch (error) {
        console.error(`Erro ao obter token válido ${platform}:`, error);
        return null;
    }
}

/**
 * Registra informações sobre expiração de token para monitoramento
 */
export async function logTokenExpiration(platform: 'facebook' | 'instagram'): Promise<void> {
    try {
        const adminApp = getAdminApp();
        if (!adminApp) return;

        const db = getDatabase(adminApp);
        const integrationRef = db.ref(`admin/integrations/${platform}`);
        const snapshot = await integrationRef.get();

        if (!snapshot.exists()) return;

        const data = snapshot.val() as TokenData;
        const expiresAt = new Date(data.expires_at);
        const now = new Date();
        const hoursUntilExpiration = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

        const logRef = db.ref(`admin/token_logs/${platform}/${new Date().toISOString()}`);
        await logRef.set({
            hours_until_expiration: hoursUntilExpiration,
            expires_at: data.expires_at,
            expires_in: data.expires_in,
            last_refresh_at: data.last_refresh_at || data.connected_at,
        });

        console.log(`📊 Log de expiração ${platform}: ${hoursUntilExpiration.toFixed(2)} horas`);
    } catch (error) {
        console.error(`Erro ao registrar expiração ${platform}:`, error);
    }
}
