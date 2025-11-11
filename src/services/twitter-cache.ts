import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import path from 'path';
import { TwitterMediaOutput } from '../ai/flows/twitter-flow';

const CACHE_DIR = path.join(process.cwd(), 'cache', 'twitter');
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 DIAS para economia máxima

// Garantir que o diretório de cache existe
async function ensureCacheDir() {
    try {
        await fs.access(CACHE_DIR);
    } catch {
        await fs.mkdir(CACHE_DIR, { recursive: true });
    }
}

// Interface para dados do cache
interface CacheData {
    data: TwitterMediaOutput;
    timestamp: number;
    username: string;
    mediaType: string;
    maxResults: number;
}

// Gerar chave do cache
function getCacheKey(username: string, mediaType: string, maxResults: number): string {
    return `${username}-${mediaType}-${maxResults}`.toLowerCase();
}

// Salvar dados no cache permanente
export async function savePermanentCache(
    username: string, 
    mediaType: string, 
    maxResults: number, 
    data: TwitterMediaOutput
): Promise<void> {
    try {
        await ensureCacheDir();
        
        const cacheKey = getCacheKey(username, mediaType, maxResults);
        const cacheFile = path.join(CACHE_DIR, `${cacheKey}.json`);
        
        const cacheData: CacheData = {
            data,
            timestamp: Date.now(),
            username,
            mediaType,
            maxResults
        };
        
        await fs.writeFile(cacheFile, JSON.stringify(cacheData, null, 2), 'utf8');
        console.log(`💾 Cache permanente salvo para @${username} em ${cacheFile}`);
        
    } catch (error: any) {
        console.error('❌ Erro ao salvar cache permanente:', error.message);
    }
}

// Carregar dados do cache permanente
export async function loadPermanentCache(
    username: string, 
    mediaType: string, 
    maxResults: number
): Promise<TwitterMediaOutput | null> {
    try {
        const cacheKey = getCacheKey(username, mediaType, maxResults);
        const cacheFile = path.join(CACHE_DIR, `${cacheKey}.json`);
        
        // Verificar se o arquivo existe
        try {
            await fs.access(cacheFile);
        } catch {
            console.log(`📁 Cache permanente não encontrado para @${username}`);
            return null;
        }
        
        // Ler dados do cache
        const fileContent = await fs.readFile(cacheFile, 'utf8');
        const cacheData: CacheData = JSON.parse(fileContent);
        
        // Verificar se o cache ainda é válido
        const age = Date.now() - cacheData.timestamp;
        if (age > CACHE_DURATION) {
            console.log(`⏰ Cache permanente expirado para @${username} (${Math.round(age / 1000 / 60 / 60)} horas)`);
            // Manter o cache expirado mas marcá-lo como antigo
            return null;
        }
        
        const remainingHours = Math.round((CACHE_DURATION - age) / 1000 / 60 / 60);
        console.log(`📦 Cache permanente carregado para @${username} (válido por mais ${remainingHours}h)`);
        
        return cacheData.data;
        
    } catch (error: any) {
        console.error('❌ Erro ao carregar cache permanente:', error.message);
        return null;
    }
}

// Listar todos os caches permanentes
export async function listPermanentCaches(): Promise<string[]> {
    try {
        await ensureCacheDir();
        const files = await fs.readdir(CACHE_DIR);
        return files.filter(file => file.endsWith('.json'));
    } catch (error: any) {
        console.error('❌ Erro ao listar caches permanentes:', error.message);
        return [];
    }
}

// Limpar caches expirados
export async function cleanExpiredCaches(): Promise<void> {
    try {
        await ensureCacheDir();
        const files = await fs.readdir(CACHE_DIR);
        
        for (const file of files) {
            if (!file.endsWith('.json')) continue;
            
            const filePath = path.join(CACHE_DIR, file);
            const fileContent = await fs.readFile(filePath, 'utf8');
            const cacheData: CacheData = JSON.parse(fileContent);
            
            const age = Date.now() - cacheData.timestamp;
            if (age > CACHE_DURATION) {
                await fs.unlink(filePath);
                console.log(`🗑️ Cache expirado removido: ${file}`);
            }
        }
    } catch (error: any) {
        console.error('❌ Erro ao limpar caches expirados:', error.message);
    }
}

// Obter estatísticas do cache
export async function getCacheStats(): Promise<{
    totalCaches: number;
    validCaches: number;
    expiredCaches: number;
    totalSizeKB: number;
}> {
    try {
        await ensureCacheDir();
        const files = await fs.readdir(CACHE_DIR);
        
        let totalCaches = 0;
        let validCaches = 0;
        let expiredCaches = 0;
        let totalSizeKB = 0;
        
        for (const file of files) {
            if (!file.endsWith('.json')) continue;
            
            totalCaches++;
            const filePath = path.join(CACHE_DIR, file);
            const stats = await fs.stat(filePath);
            totalSizeKB += stats.size / 1024;
            
            const fileContent = await fs.readFile(filePath, 'utf8');
            const cacheData: CacheData = JSON.parse(fileContent);
            
            const age = Date.now() - cacheData.timestamp;
            if (age > CACHE_DURATION) {
                expiredCaches++;
            } else {
                validCaches++;
            }
        }
        
        return {
            totalCaches,
            validCaches,
            expiredCaches,
            totalSizeKB: Math.round(totalSizeKB)
        };
    } catch (error: any) {
        console.error('❌ Erro ao obter estatísticas do cache:', error.message);
        return {
            totalCaches: 0,
            validCaches: 0,
            expiredCaches: 0,
            totalSizeKB: 0
        };
    }
}

// Limpar cache específico
export async function clearPermanentCache(
    username: string, 
    mediaType: string, 
    maxResults: number
): Promise<boolean> {
    try {
        const cacheKey = getCacheKey(username, mediaType, maxResults);
        const cacheFile = path.join(CACHE_DIR, `${cacheKey}.json`);
        
        if (existsSync(cacheFile)) {
            await fs.unlink(cacheFile);
            console.log(`🗑️ Cache removido: ${cacheKey}.json`);
            return true;
        } else {
            console.log(`ℹ️ Cache não encontrado: ${cacheKey}.json`);
            return false;
        }
    } catch (error: any) {
        console.error(`❌ Erro ao limpar cache para ${username}:`, error.message);
        return false;
    }
}

// Limpar todo o cache
export async function clearAllCache(): Promise<number> {
    try {
        if (!existsSync(CACHE_DIR)) {
            return 0;
        }
        
        const files = await fs.readdir(CACHE_DIR);
        let removedCount = 0;
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                await fs.unlink(path.join(CACHE_DIR, file));
                removedCount++;
            }
        }
        
        console.log(`🗑️ Removidos ${removedCount} arquivos de cache`);
        return removedCount;
    } catch (error: any) {
        console.error('❌ Erro ao limpar todo o cache:', error.message);
        return 0;
    }
}
