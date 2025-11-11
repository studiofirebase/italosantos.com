import { TwitterMediaOutput } from '../ai/flows/twitter-flow';

// Cache híbrido para desenvolvimento (file system) e produção (Firebase)
export class HybridCacheService {
    private static isProduction = process.env.NODE_ENV === 'production' || process.env.FIREBASE_CONFIG;

    /**
     * Salvar cache usando a estratégia adequada para o ambiente
     */
    static async saveCache(
        username: string,
        mediaType: string,
        maxResults: number,
        data: TwitterMediaOutput
    ): Promise<void> {
        // SEMPRE PRIORIZAR FIREBASE (migração concluída)
        console.log('💾 Salvando cache no Firebase...');
        try {
            const { saveFirebaseCache } = await import('./firebase-cache');
            await saveFirebaseCache(username, mediaType, maxResults, data);
            console.log(`💾 Cache salvo no Firebase para @${username}`);
        } catch (error) {
            console.error('❌ Erro ao salvar no Firebase Cache:', error);
            // Fallback para arquivo em caso de erro
            console.log('💾 Tentando salvar localmente como fallback...');
            await this.saveFileCache(username, mediaType, maxResults, data);
        }
    }

    /**
     * Carregar cache usando a estratégia adequada para o ambiente
     */
    static async loadCache(
        username: string,
        mediaType: string,
        maxResults: number
    ): Promise<TwitterMediaOutput | null> {
        // SEMPRE PRIORIZAR FIREBASE (migração concluída)
        console.log('🔍 Tentando carregar cache do Firebase...');
        try {
            const { loadFirebaseCache } = await import('./firebase-cache');
            const result = await loadFirebaseCache(username, mediaType, maxResults);
            if (result) {
                console.log(`📦 Cache carregado do Firebase para @${username}`);
                return result;
            }
        } catch (error) {
            console.error('❌ Erro ao carregar do Firebase Cache:', error);
        }

        // Fallback para arquivo se Firebase falhar (manter compatibilidade)
        console.log('🔍 Tentando carregar cache local como fallback...');
        return await this.loadFileCache(username, mediaType, maxResults);
    }

    /**
     * Limpar cache específico
     */
    static async clearCache(
        username: string,
        mediaType: string,
        maxResults: number
    ): Promise<boolean> {
        let success = false;

        if (this.isProduction) {
            // Produção: limpar Firebase
            try {
                const { clearFirebaseCache } = await import('./firebase-cache');
                success = await clearFirebaseCache(username, mediaType, maxResults);
            } catch (error) {
                console.error('❌ Erro ao limpar Firebase Cache:', error);
            }
        }

        // Sempre tentar limpar arquivo (desenvolvimento ou fallback)
        try {
            const { clearPermanentCache } = await import('./twitter-cache');
            const fileSuccess = await clearPermanentCache(username, mediaType, maxResults);
            success = success || fileSuccess;
        } catch (error) {
            console.error('❌ Erro ao limpar File Cache:', error);
        }

        return success;
    }

    /**
     * Obter estatísticas do cache
     */
    static async getCacheStats(): Promise<{
        totalCaches: number;
        validCaches: number;
        expiredCaches: number;
        totalSizeKB: number;
        source: string;
    }> {
        if (this.isProduction) {
            try {
                const { getFirebaseCacheStats } = await import('./firebase-cache');
                const stats = await getFirebaseCacheStats();
                return { ...stats, source: 'Firebase' };
            } catch (error) {
                console.error('❌ Erro ao obter stats do Firebase:', error);
            }
        }

        // Fallback para stats de arquivo
        try {
            const { getCacheStats } = await import('./twitter-cache');
            const stats = await getCacheStats();
            return { ...stats, source: 'FileSystem' };
        } catch (error) {
            console.error('❌ Erro ao obter stats do arquivo:', error);
            return {
                totalCaches: 0,
                validCaches: 0,
                expiredCaches: 0,
                totalSizeKB: 0,
                source: 'Error'
            };
        }
    }

    // Métodos privados para cache de arquivo
    private static async saveFileCache(
        username: string,
        mediaType: string,
        maxResults: number,
        data: TwitterMediaOutput
    ): Promise<void> {
        try {
            const { savePermanentCache } = await import('./twitter-cache');
            await savePermanentCache(username, mediaType, maxResults, data);
        } catch (error) {
            console.error('❌ Erro ao salvar File Cache:', error);
        }
    }

    private static async loadFileCache(
        username: string,
        mediaType: string,
        maxResults: number
    ): Promise<TwitterMediaOutput | null> {
        try {
            const { loadPermanentCache } = await import('./twitter-cache');
            return await loadPermanentCache(username, mediaType, maxResults);
        } catch (error) {
            console.error('❌ Erro ao carregar File Cache:', error);
            return null;
        }
    }
}
