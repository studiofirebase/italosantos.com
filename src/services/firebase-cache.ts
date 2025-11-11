import { adminDb } from '@/lib/firebase-admin';
import { TwitterMediaOutput } from '@/ai/flows/twitter-flow';

// Interface para dados do cache no Firebase
interface FirebaseCacheData {
    id: string;
    data: TwitterMediaOutput;
    timestamp: number;
    username: string;
    mediaType: string;
    maxResults: number;
    expiresAt: number;
}

// Duração do cache (7 dias para economia máxima)
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000;

// Nome da coleção no Firestore
const CACHE_COLLECTION = 'twitterCache';

// Gerar chave do cache
function getCacheKey(username: string, mediaType: string, maxResults: number): string {
    return `${username}-${mediaType}-${maxResults}`.toLowerCase();
}

// Limpar valores undefined dos dados (Firestore não aceita undefined)
function cleanUndefinedValues(obj: any): any {
    if (obj === null || obj === undefined) {
        return null;
    }
    
    if (Array.isArray(obj)) {
        return obj.map(cleanUndefinedValues);
    }
    
    if (typeof obj === 'object') {
        const cleaned: any = {};
        for (const [key, value] of Object.entries(obj)) {
            if (value !== undefined) {
                cleaned[key] = cleanUndefinedValues(value);
            }
        }
        return cleaned;
    }
    
    return obj;
}

/**
 * Salvar dados no cache do Firebase
 */
export async function saveFirebaseCache(
    username: string,
    mediaType: string,
    maxResults: number,
    data: TwitterMediaOutput
): Promise<void> {
    try {
        if (!adminDb) {
            console.error('❌ Firebase Admin não está disponível');
            return;
        }

        const cacheKey = getCacheKey(username, mediaType, maxResults);
        const expiresAt = Date.now() + CACHE_DURATION;

        // Limpar valores undefined antes de salvar no Firestore
        const cleanedData = cleanUndefinedValues(data);

        const cacheData: FirebaseCacheData = {
            id: cacheKey,
            data: cleanedData,
            timestamp: Date.now(),
            username,
            mediaType,
            maxResults,
            expiresAt
        };

        await adminDb.collection(CACHE_COLLECTION).doc(cacheKey).set(cacheData);
        
        console.log(`💾 Cache Firebase salvo para @${username} (${mediaType})`);
        
    } catch (error: any) {
        console.error('❌ Erro ao salvar cache no Firebase:', error.message);
    }
}

/**
 * Carregar dados do cache do Firebase
 */
export async function loadFirebaseCache(
    username: string,
    mediaType: string,
    maxResults: number
): Promise<TwitterMediaOutput | null> {
    try {
        if (!adminDb) {
            console.error('❌ Firebase Admin não está disponível');
            return null;
        }

        const cacheKey = getCacheKey(username, mediaType, maxResults);
        const doc = await adminDb.collection(CACHE_COLLECTION).doc(cacheKey).get();

        if (!doc.exists) {
            console.log(`📁 Cache Firebase não encontrado para @${username}`);
            return null;
        }

        const cacheData = doc.data() as FirebaseCacheData;

        // Verificar se o cache ainda é válido
        if (Date.now() > cacheData.expiresAt) {
            console.log(`⏰ Cache Firebase expirado para @${username}, removendo...`);
            await adminDb.collection(CACHE_COLLECTION).doc(cacheKey).delete();
            return null;
        }

        const remainingHours = Math.round((cacheData.expiresAt - Date.now()) / 1000 / 60 / 60);
        console.log(`📦 Cache Firebase carregado para @${username} (válido por mais ${remainingHours}h)`);

        return cacheData.data;

    } catch (error: any) {
        console.error('❌ Erro ao carregar cache do Firebase:', error.message);
        return null;
    }
}

/**
 * Limpar cache específico do Firebase
 */
export async function clearFirebaseCache(
    username: string,
    mediaType: string,
    maxResults: number
): Promise<boolean> {
    try {
        if (!adminDb) {
            console.error('❌ Firebase Admin não está disponível');
            return false;
        }

        const cacheKey = getCacheKey(username, mediaType, maxResults);
        const doc = await adminDb.collection(CACHE_COLLECTION).doc(cacheKey).get();

        if (doc.exists) {
            await adminDb.collection(CACHE_COLLECTION).doc(cacheKey).delete();
            console.log(`🗑️ Cache Firebase removido para @${username}`);
            return true;
        } else {
            console.log(`ℹ️ Cache Firebase não encontrado para @${username}`);
            return false;
        }

    } catch (error: any) {
        console.error('❌ Erro ao limpar cache do Firebase:', error.message);
        return false;
    }
}

/**
 * Limpar todos os caches expirados do Firebase
 */
export async function cleanExpiredFirebaseCaches(): Promise<number> {
    try {
        if (!adminDb) {
            console.error('❌ Firebase Admin não está disponível');
            return 0;
        }

        const now = Date.now();
        const expiredQuery = adminDb.collection(CACHE_COLLECTION)
            .where('expiresAt', '<', now)
            .limit(100); // Processar em lotes para evitar timeout

        const snapshot = await expiredQuery.get();
        
        if (snapshot.empty) {
            console.log('🧹 Nenhum cache expirado encontrado no Firebase');
            return 0;
        }

        const batch = adminDb.batch();
        snapshot.docs.forEach((doc: any) => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        
        console.log(`🗑️ ${snapshot.size} caches expirados removidos do Firebase`);
        return snapshot.size;

    } catch (error: any) {
        console.error('❌ Erro ao limpar caches expirados do Firebase:', error.message);
        return 0;
    }
}

/**
 * Limpar todo o cache do Firebase
 */
export async function clearAllFirebaseCache(): Promise<number> {
    try {
        if (!adminDb) {
            console.error('❌ Firebase Admin não está disponível');
            return 0;
        }

        const allCachesQuery = adminDb.collection(CACHE_COLLECTION).limit(500);
        const snapshot = await allCachesQuery.get();
        
        if (snapshot.empty) {
            console.log('🧹 Nenhum cache encontrado no Firebase');
            return 0;
        }

        const batch = adminDb.batch();
        snapshot.docs.forEach((doc: any) => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        
        console.log(`🗑️ ${snapshot.size} caches removidos do Firebase`);
        return snapshot.size;

    } catch (error: any) {
        console.error('❌ Erro ao limpar todo o cache do Firebase:', error.message);
        return 0;
    }
}

/**
 * Listar todos os caches do Firebase
 */
export async function listFirebaseCaches(): Promise<{
    username: string;
    mediaType: string;
    maxResults: number;
    timestamp: number;
    expiresAt: number;
    ageHours: number;
}[]> {
    try {
        if (!adminDb) {
            console.error('❌ Firebase Admin não está disponível');
            return [];
        }

        const snapshot = await adminDb.collection(CACHE_COLLECTION)
            .orderBy('timestamp', 'desc')
            .get();

        const caches = snapshot.docs.map((doc: any) => {
            const data = doc.data() as FirebaseCacheData;
            const ageHours = Math.round((Date.now() - data.timestamp) / 1000 / 60 / 60);
            
            return {
                username: data.username,
                mediaType: data.mediaType,
                maxResults: data.maxResults,
                timestamp: data.timestamp,
                expiresAt: data.expiresAt,
                ageHours
            };
        });

        console.log(`📋 ${caches.length} caches encontrados no Firebase`);
        return caches;

    } catch (error: any) {
        console.error('❌ Erro ao listar caches do Firebase:', error.message);
        return [];
    }
}

/**
 * Obter estatísticas do cache do Firebase
 */
export async function getFirebaseCacheStats(): Promise<{
    totalCaches: number;
    validCaches: number;
    expiredCaches: number;
    totalSizeKB: number;
}> {
    try {
        if (!adminDb) {
            console.error('❌ Firebase Admin não está disponível');
            return {
                totalCaches: 0,
                validCaches: 0,
                expiredCaches: 0,
                totalSizeKB: 0
            };
        }

        const snapshot = await adminDb.collection(CACHE_COLLECTION).get();
        const now = Date.now();

        let totalCaches = 0;
        let validCaches = 0;
        let expiredCaches = 0;
        let totalSizeKB = 0;

        snapshot.docs.forEach((doc: any) => {
            const data = doc.data() as FirebaseCacheData;
            totalCaches++;

            // Estimar tamanho (aproximado)
            const sizeKB = JSON.stringify(data).length / 1024;
            totalSizeKB += sizeKB;

            if (now > data.expiresAt) {
                expiredCaches++;
            } else {
                validCaches++;
            }
        });

        return {
            totalCaches,
            validCaches,
            expiredCaches,
            totalSizeKB: Math.round(totalSizeKB)
        };

    } catch (error: any) {
        console.error('❌ Erro ao obter estatísticas do Firebase:', error.message);
        return {
            totalCaches: 0,
            validCaches: 0,
            expiredCaches: 0,
            totalSizeKB: 0
        };
    }
}
