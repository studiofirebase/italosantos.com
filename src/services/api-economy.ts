import { TwitterMediaOutput } from '../ai/flows/twitter-flow';

// Configuração ultra-agressiva para economia de API
export const API_ECONOMY_CONFIG = {
    // Horários de "economia máxima" (evitar API completamente)
    ECONOMY_HOURS: [0, 1, 2, 3, 4, 5, 6, 23], // Madrugada e noite
    
    // Dias da semana para economia (0 = domingo, 6 = sábado)
    ECONOMY_DAYS: [0, 6], // Fins de semana
    
    // Limites por período
    HOURLY_LIMIT: 3,      // Máximo 3 requisições por hora
    DAILY_LIMIT: 25,      // Máximo 25 requisições por dia
    WEEKLY_LIMIT: 100,    // Máximo 100 requisições por semana
    
    // Cache estendido
    EXTENDED_CACHE_HOURS: 72, // 3 dias de cache em horários de economia
};

// Cache de controle de requisições
const requestCounts = {
    hourly: new Map<string, number>(),
    daily: new Map<string, number>(),
    weekly: new Map<string, number>(),
};

// Verificar se estamos em período de economia máxima
export function isEconomyPeriod(): boolean {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    
    return API_ECONOMY_CONFIG.ECONOMY_HOURS.includes(hour) || 
           API_ECONOMY_CONFIG.ECONOMY_DAYS.includes(day);
}

// Verificar se pode fazer requisição baseado nos limites
export function canMakeAPIRequest(): { 
    allowed: boolean; 
    reason?: string; 
    nextAllowedTime?: Date;
} {
    const now = new Date();
    const hour = now.getHours();
    const today = now.toDateString();
    const thisWeek = getWeekKey(now);
    const thisHour = `${today}-${hour}`;
    
    // Verificar limite horário
    const hourlyCount = requestCounts.hourly.get(thisHour) || 0;
    if (hourlyCount >= API_ECONOMY_CONFIG.HOURLY_LIMIT) {
        const nextHour = new Date(now);
        nextHour.setHours(hour + 1, 0, 0, 0);
        return {
            allowed: false,
            reason: `Limite horário atingido (${hourlyCount}/${API_ECONOMY_CONFIG.HOURLY_LIMIT})`,
            nextAllowedTime: nextHour
        };
    }
    
    // Verificar limite diário
    const dailyCount = requestCounts.daily.get(today) || 0;
    if (dailyCount >= API_ECONOMY_CONFIG.DAILY_LIMIT) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return {
            allowed: false,
            reason: `Limite diário atingido (${dailyCount}/${API_ECONOMY_CONFIG.DAILY_LIMIT})`,
            nextAllowedTime: tomorrow
        };
    }
    
    // Verificar limite semanal
    const weeklyCount = requestCounts.weekly.get(thisWeek) || 0;
    if (weeklyCount >= API_ECONOMY_CONFIG.WEEKLY_LIMIT) {
        const nextWeek = new Date(now);
        nextWeek.setDate(nextWeek.getDate() + (7 - nextWeek.getDay()));
        nextWeek.setHours(0, 0, 0, 0);
        return {
            allowed: false,
            reason: `Limite semanal atingido (${weeklyCount}/${API_ECONOMY_CONFIG.WEEKLY_LIMIT})`,
            nextAllowedTime: nextWeek
        };
    }
    
    // Se estamos em período de economia, ser mais restritivo
    if (isEconomyPeriod()) {
        if (hourlyCount >= 1) { // Máximo 1 por hora em período de economia
            const nextHour = new Date(now);
            nextHour.setHours(hour + 1, 0, 0, 0);
            return {
                allowed: false,
                reason: 'Período de economia máxima - aguarde próxima hora',
                nextAllowedTime: nextHour
            };
        }
    }
    
    return { allowed: true };
}

// Registrar uma requisição feita
export function recordAPIRequest(): void {
    const now = new Date();
    const hour = now.getHours();
    const today = now.toDateString();
    const thisWeek = getWeekKey(now);
    const thisHour = `${today}-${hour}`;
    
    // Incrementar contadores
    requestCounts.hourly.set(thisHour, (requestCounts.hourly.get(thisHour) || 0) + 1);
    requestCounts.daily.set(today, (requestCounts.daily.get(today) || 0) + 1);
    requestCounts.weekly.set(thisWeek, (requestCounts.weekly.get(thisWeek) || 0) + 1);
    
    // Limpar contadores antigos
    cleanOldCounters();
}

// Obter estatísticas de uso
export function getAPIUsageStats(): {
    hourly: number;
    daily: number;
    weekly: number;
    limits: typeof API_ECONOMY_CONFIG;
    isEconomyPeriod: boolean;
} {
    const now = new Date();
    const hour = now.getHours();
    const today = now.toDateString();
    const thisWeek = getWeekKey(now);
    const thisHour = `${today}-${hour}`;
    
    return {
        hourly: requestCounts.hourly.get(thisHour) || 0,
        daily: requestCounts.daily.get(today) || 0,
        weekly: requestCounts.weekly.get(thisWeek) || 0,
        limits: API_ECONOMY_CONFIG,
        isEconomyPeriod: isEconomyPeriod()
    };
}

// Verificar se deve usar cache estendido
export function shouldUseExtendedCache(lastCacheTime: number): boolean {
    if (isEconomyPeriod()) {
        const hoursOld = (Date.now() - lastCacheTime) / (1000 * 60 * 60);
        return hoursOld < API_ECONOMY_CONFIG.EXTENDED_CACHE_HOURS;
    }
    return false;
}

// Função auxiliar para obter chave da semana
function getWeekKey(date: Date): string {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    return startOfWeek.toDateString();
}

// Limpar contadores antigos
function cleanOldCounters(): void {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Limpar contadores horários de mais de 25 horas
    for (const [key] of requestCounts.hourly) {
        const [dateStr, hourStr] = key.split('-');
        const keyDate = new Date(dateStr);
        const keyHour = parseInt(hourStr);
        keyDate.setHours(keyHour);
        
        if (now.getTime() - keyDate.getTime() > 25 * 60 * 60 * 1000) {
            requestCounts.hourly.delete(key);
        }
    }
    
    // Limpar contadores diários de mais de 8 dias
    for (const [key] of requestCounts.daily) {
        const keyDate = new Date(key);
        if (now.getTime() - keyDate.getTime() > 8 * 24 * 60 * 60 * 1000) {
            requestCounts.daily.delete(key);
        }
    }
    
    // Limpar contadores semanais de mais de 4 semanas
    for (const [key] of requestCounts.weekly) {
        const keyDate = new Date(key);
        if (now.getTime() - keyDate.getTime() > 4 * 7 * 24 * 60 * 60 * 1000) {
            requestCounts.weekly.delete(key);
        }
    }
}
