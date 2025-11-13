/**
 * Serviço de cache para mídias do Twitter
 * Armazena últimas 5-10 fotos e vídeos para carregamento rápido
 */

interface TwitterMedia {
    url?: string;
    preview_image_url?: string;
    type: string;
    media_key: string;
}

interface TweetWithMedia {
    id: string;
    text: string;
    created_at?: string;
    media: TwitterMedia[];
    username: string;
    profile_image_url?: string;
    isRetweet?: boolean;
}

interface MediaCache {
    photos: TweetWithMedia[];
    videos: TweetWithMedia[];
    username: string;
    timestamp: number;
    version: string;
}

const CACHE_KEY = 'twitter_media_cache';
const CACHE_VERSION = '1.0';
const CACHE_EXPIRY_MS = 1000 * 60 * 60; // 1 hora
const MIN_CACHE_ITEMS = 5;
const MAX_CACHE_ITEMS = 10;

/**
 * Salva fotos no cache
 */
export function cachePhotos(photos: TweetWithMedia[], username: string): void {
    try {
        const cache = getCache();

        // Pegar apenas as últimas 5-10 fotos
        const photosToCache = photos.slice(0, MAX_CACHE_ITEMS);

        const updatedCache: MediaCache = {
            ...cache,
            photos: photosToCache,
            username,
            timestamp: Date.now(),
            version: CACHE_VERSION
        };

        localStorage.setItem(CACHE_KEY, JSON.stringify(updatedCache));
        console.log(`✅ Cache: ${photosToCache.length} fotos salvas para @${username}`);
    } catch (error) {
        console.warn('⚠️ Erro ao salvar fotos no cache:', error);
    }
}

/**
 * Salva vídeos no cache
 */
export function cacheVideos(videos: TweetWithMedia[], username: string): void {
    try {
        const cache = getCache();

        // Pegar apenas os últimos 5-10 vídeos
        const videosToCache = videos.slice(0, MAX_CACHE_ITEMS);

        const updatedCache: MediaCache = {
            ...cache,
            videos: videosToCache,
            username,
            timestamp: Date.now(),
            version: CACHE_VERSION
        };

        localStorage.setItem(CACHE_KEY, JSON.stringify(updatedCache));
        console.log(`✅ Cache: ${videosToCache.length} vídeos salvos para @${username}`);
    } catch (error) {
        console.warn('⚠️ Erro ao salvar vídeos no cache:', error);
    }
}

/**
 * Busca fotos do cache (AGORA DO FIRESTORE - compartilhado entre dispositivos)
 */
export async function getCachedPhotos(username: string): Promise<TweetWithMedia[] | null> {
    try {
        // Buscar do Firestore ao invés de localStorage
        const { db } = await import('@/lib/firebase');
        const { doc, getDoc } = await import('firebase/firestore');

        const cacheDoc = await getDoc(doc(db, 'twitter_cache', username, 'media', 'photos'));

        if (!cacheDoc.exists()) {
            console.log('⚠️ Cache do Firestore não encontrado');
            return null;
        }

        const cacheData = cacheDoc.data();
        const cacheAge = Date.now() - cacheData.timestamp;

        // Verificar se o cache expirou (1 hora)
        if (cacheAge > CACHE_EXPIRY_MS) {
            console.log('⚠️ Cache do Firestore expirado');
            return null;
        }

        if (cacheData.tweets && cacheData.tweets.length >= MIN_CACHE_ITEMS) {
            console.log(`✅ Cache Firestore: ${cacheData.tweets.length} fotos recuperadas para @${username}`);
            return cacheData.tweets;
        }

        return null;
    } catch (error) {
        console.warn('⚠️ Erro ao buscar fotos do cache Firestore:', error);

        // Fallback para localStorage (compatibilidade)
        try {
            const cache = getCache();

            // Verificar se o cache é válido
            if (!isCacheValid(cache, username)) {
                console.log('⚠️ Cache inválido ou expirado');
                return null;
            }

            if (cache.photos && cache.photos.length >= MIN_CACHE_ITEMS) {
                console.log(`✅ Cache: ${cache.photos.length} fotos recuperadas para @${username}`);
                return cache.photos;
            }

            return null;
        } catch (error) {
            console.warn('⚠️ Erro ao buscar fotos do cache:', error);
            return null;
        }
    }
}

/**
 * Busca vídeos do cache (AGORA DO FIRESTORE - compartilhado entre dispositivos)
 */
export async function getCachedVideos(username: string): Promise<TweetWithMedia[] | null> {
    try {
        // Buscar do Firestore ao invés de localStorage
        const { db } = await import('@/lib/firebase');
        const { doc, getDoc } = await import('firebase/firestore');

        const cacheDoc = await getDoc(doc(db, 'twitter_cache', username, 'media', 'videos'));

        if (!cacheDoc.exists()) {
            console.log('⚠️ Cache do Firestore não encontrado');
            return null;
        }

        const cacheData = cacheDoc.data();
        const cacheAge = Date.now() - cacheData.timestamp;

        // Verificar se o cache expirou (1 hora)
        if (cacheAge > CACHE_EXPIRY_MS) {
            console.log('⚠️ Cache do Firestore expirado');
            return null;
        }

        if (cacheData.tweets && cacheData.tweets.length >= MIN_CACHE_ITEMS) {
            console.log(`✅ Cache Firestore: ${cacheData.tweets.length} vídeos recuperados para @${username}`);
            return cacheData.tweets;
        }

        return null;
    } catch (error) {
        console.warn('⚠️ Erro ao buscar vídeos do cache Firestore:', error);

        // Fallback para localStorage (compatibilidade)
        try {
            const cache = getCache();
            if (!isCacheValid(cache, username)) {
                console.log('⚠️ Cache inválido ou expirado');
                return null;
            }

            if (cache.videos && cache.videos.length >= MIN_CACHE_ITEMS) {
                console.log(`✅ Cache: ${cache.videos.length} vídeos recuperados para @${username}`);
                return cache.videos;
            }

            return null;
        } catch (error) {
            console.warn('⚠️ Erro ao buscar vídeos do cache:', error);
            return null;
        }
    }
}

/**
 * Limpa todo o cache
 */
export function clearCache(): void {
    try {
        localStorage.removeItem(CACHE_KEY);
        console.log('✅ Cache limpo');
    } catch (error) {
        console.warn('⚠️ Erro ao limpar cache:', error);
    }
}

/**
 * Limpa cache de um tipo específico
 */
export function clearCacheByType(type: 'photos' | 'videos'): void {
    try {
        const cache = getCache();

        if (type === 'photos') {
            cache.photos = [];
        } else {
            cache.videos = [];
        }

        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        console.log(`✅ Cache de ${type} limpo`);
    } catch (error) {
        console.warn(`⚠️ Erro ao limpar cache de ${type}:`, error);
    }
}

/**
 * Verifica se o cache é válido para o username atual
 */
function isCacheValid(cache: MediaCache, username: string): boolean {
    if (!cache || !cache.username || !cache.timestamp) {
        return false;
    }

    // Verificar se é o mesmo usuário
    if (cache.username !== username) {
        console.log(`⚠️ Cache é de outro usuário (@${cache.username} vs @${username})`);
        return false;
    }

    // Verificar se não expirou
    const age = Date.now() - cache.timestamp;
    if (age > CACHE_EXPIRY_MS) {
        console.log(`⚠️ Cache expirado (${Math.round(age / 1000 / 60)} minutos)`);
        return false;
    }

    // Verificar versão
    if (cache.version !== CACHE_VERSION) {
        console.log(`⚠️ Cache de versão antiga (${cache.version} vs ${CACHE_VERSION})`);
        return false;
    }

    return true;
}

/**
 * Obtém o cache atual ou retorna um cache vazio
 */
function getCache(): MediaCache {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            return JSON.parse(cached) as MediaCache;
        }
    } catch (error) {
        console.warn('⚠️ Erro ao ler cache:', error);
    }

    // Retornar cache vazio
    return {
        photos: [],
        videos: [],
        username: '',
        timestamp: 0,
        version: CACHE_VERSION
    };
}

/**
 * Obtém estatísticas do cache
 */
export function getCacheStats(): { photos: number; videos: number; username: string; age: string } | null {
    try {
        const cache = getCache();

        if (!cache || !cache.timestamp) {
            return null;
        }

        const ageMs = Date.now() - cache.timestamp;
        const ageMinutes = Math.round(ageMs / 1000 / 60);

        return {
            photos: cache.photos?.length || 0,
            videos: cache.videos?.length || 0,
            username: cache.username || 'desconhecido',
            age: ageMinutes < 60
                ? `${ageMinutes} min`
                : `${Math.round(ageMinutes / 60)}h ${ageMinutes % 60}min`
        };
    } catch (error) {
        console.warn('⚠️ Erro ao obter estatísticas do cache:', error);
        return null;
    }
}
