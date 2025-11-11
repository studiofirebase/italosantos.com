
'use server';
/**
 * @fileOverview Fluxo para buscar mídias (fotos e vídeos) de um perfil do Twitter com múltiplas APIs alternativas
 * @version 2.0 - Versão otimizada com cache permanente, rate limiting inteligente e economia máxima de API
 */

import { z } from 'zod';
import { ai } from '../genkit';
import { fetchTwitterMediaAlternative } from '../../services/twitter-alternative';
import { HybridCacheService } from '../../services/hybrid-cache';
import { 
    saveMultipleTwitterPhotos, 
    getSavedPhotosFromUser,
    getPhotoStorageStats 
} from '../../services/twitter-photo-storage';

// Schema para validar dados de mídia do Twitter
const TwitterMediaSchema = z.object({
  id: z.string(),
  text: z.string(),
  media: z.array(z.object({
    media_key: z.string(),
    type: z.enum(['photo', 'video', 'animated_gif']),
    url: z.string(),
    preview_image_url: z.string().optional(),
    variants: z.any().optional()
  })),
  created_at: z.string().optional().default(() => new Date().toISOString()),
  username: z.string(),
  profile_image_url: z.string().optional(),
  isRetweet: z.boolean().optional().default(false),
  widget_html: z.string().optional() // Adicionado para suporte ao widget
});

// Schema de entrada para o fluxo
const TwitterMediaInputSchema = z.object({
  username: z.string().min(1, "Nome de usuário é obrigatório"),
  mediaType: z.enum(['photos', 'videos', 'all']).default('photos'),
  maxResults: z.number().int().min(1).max(100).default(20),
});

// Schema de saída
const TwitterMediaOutputSchema = z.object({
  tweets: z.array(TwitterMediaSchema),
  totalCount: z.number(),
  source: z.string()
});

export type TwitterMediaInput = z.infer<typeof TwitterMediaInputSchema>;
export type TwitterMediaOutput = z.infer<typeof TwitterMediaOutputSchema>;

// Cache em memória para evitar muitas requisições (ECONOMIA MÁXIMA)
const cache = new Map<string, { data: TwitterMediaOutput; timestamp: number }>();
const CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 HORAS para economia máxima

// Cache de controle de requisições por usuário (prevenir requisições desnecessárias)
const userRequestCache = new Map<string, number>();
const USER_REQUEST_COOLDOWN = 30 * 60 * 1000; // 30 minutos entre requisições do mesmo usuário

// Flow principal para buscar mídia do Twitter
export const twitterFlow = ai.defineFlow(
    {
        name: 'twitterFlow',
        inputSchema: TwitterMediaInputSchema,
        outputSchema: TwitterMediaOutputSchema,
    },
    async (input: TwitterMediaInput) => {
        const { username, mediaType, maxResults } = input;
        const cacheKey = `${username}-${mediaType}-${maxResults}`;

                console.log(`🐦 [ECONOMIA MÁXIMA] Iniciando busca Twitter para @${username} (${mediaType})`);

        // CONTROLE ANTI-REQUISIÇÕES DESNECESSÁRIAS
        const userKey = username.toLowerCase();
        const lastUserRequest = userRequestCache.get(userKey);
        if (lastUserRequest && (Date.now() - lastUserRequest) < USER_REQUEST_COOLDOWN) {
            const cooldownRemaining = Math.round((USER_REQUEST_COOLDOWN - (Date.now() - lastUserRequest)) / 1000 / 60);
            console.log(`⏳ ECONOMIA: Aguarde ${cooldownRemaining} minutos para nova busca de @${username}`);
            
            // Retornar cache mesmo se um pouco expirado
            const cached = cache.get(cacheKey);
            if (cached) {
                const ageMinutes = Math.round((Date.now() - cached.timestamp) / 1000 / 60);
                console.log(`🔄 ECONOMIA: Retornando cache de ${ageMinutes} minutos para evitar API`);
                return cached.data;
            }
        }

        // 1. FIREBASE-COMPATIBLE: Verificar cache híbrido (Firebase em produção, arquivo em dev)
        const cachedData = await HybridCacheService.loadCache(username, mediaType, maxResults);
        if (cachedData) {
            console.log('📦 Retornando dados do cache híbrido');
            // Também salvar no cache em memória para acesso mais rápido
            cache.set(cacheKey, { data: cachedData, timestamp: Date.now() });
            return cachedData;
        }

        // 2. Verificar cache em memória (15min)
        const cached = cache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
            console.log('Retornando dados do cache em memória (válido por mais', Math.round((CACHE_DURATION - (Date.now() - cached.timestamp)) / 1000 / 60), 'minutos).');
            return cached.data;
        }

        console.log('Cache do Twitter expirado ou vazio. Tentando buscar novos dados...');

        try {
            // 3. Tentar API oficial do X primeiro
            console.log('🔧 Tentando API oficial do X...');
            const officialResult = await fetchFromOfficialAPI(username, maxResults, mediaType);
            
            console.log(`🔧 API oficial retornou ${officialResult.tweets.length} tweets`);
            
            // Salvar no cache híbrido (Firebase em produção, arquivo em dev)
            cache.set(cacheKey, { data: officialResult, timestamp: Date.now() });
            await HybridCacheService.saveCache(username, mediaType, maxResults, officialResult);
            
            // Salvar fotos no banco de dados se houver mídia
            if (mediaType === 'photos' && officialResult.tweets.some(t => t.media && t.media.length > 0)) {
                try {
                    console.log('💾 Salvando fotos no banco de dados...');
                    const saveResult = await saveMultipleTwitterPhotos(officialResult.tweets);
                    console.log(`✅ Banco de dados: ${saveResult.saved.length} fotos salvas, ${saveResult.skipped.length} ignoradas, ${saveResult.failed.length} falharam`);
                } catch (dbError) {
                    console.error('❌ Erro ao salvar fotos no banco:', dbError);
                }
            }
            
            console.log('✅ API oficial funcionou e dados salvos permanentemente!');
            return officialResult;

        } catch (officialError: any) {
            console.log('❌ API oficial falhou:', officialError.message);

            try {
                // 4. Tentar RapidAPI como primeiro fallback
                console.log('🔄 Tentando RapidAPI como fallback...');
                const rapidResult = await fetchFromRapidAPI(username, maxResults, mediaType);
                
                console.log(`✅ RapidAPI funcionou! Encontrados ${rapidResult.tweets.length} tweets.`);
                
                // Contar tweets com mídia
                const tweetsWithMedia = rapidResult.tweets.filter(t => t.media && t.media.length > 0);
                console.log(`📸 Encontrados ${tweetsWithMedia.length} tweets com mídia anexada.`);
                
                if (rapidResult.tweets.length > 0) {
                    // Se não há mídia anexada, tentar buscar URLs de fotos no texto
                    if (tweetsWithMedia.length === 0 && mediaType === 'photos') {
                        console.log('🔍 Tentando detectar URLs de imagens no texto dos tweets...');
                        const enhancedResult = await enhanceWithImageUrls(rapidResult, username);
                        if (enhancedResult.tweets.some(t => t.media && t.media.length > 0)) {
                            console.log('✅ URLs de imagens detectadas e adicionadas!');
                            cache.set(cacheKey, { data: enhancedResult, timestamp: Date.now() });
                            await HybridCacheService.saveCache(username, mediaType, maxResults, enhancedResult);
                            
                            // Salvar fotos no banco de dados
                            try {
                                console.log('💾 Salvando fotos detectadas no banco de dados...');
                                const saveResult = await saveMultipleTwitterPhotos(enhancedResult.tweets);
                                console.log(`✅ Banco de dados: ${saveResult.saved.length} fotos salvas, ${saveResult.skipped.length} ignoradas, ${saveResult.failed.length} falharam`);
                            } catch (dbError) {
                                console.error('❌ Erro ao salvar fotos no banco:', dbError);
                            }
                            
                            return enhancedResult;
                        }
                    }
                    
                    // Salvar no cache híbrido (Firebase em produção, arquivo em dev)
                    cache.set(cacheKey, { data: rapidResult, timestamp: Date.now() });
                    await HybridCacheService.saveCache(username, mediaType, maxResults, rapidResult);
                    
                    // Salvar fotos no banco de dados se houver mídia
                    if (mediaType === 'photos' && tweetsWithMedia.length > 0) {
                        try {
                            console.log('💾 Salvando fotos da RapidAPI no banco de dados...');
                            const saveResult = await saveMultipleTwitterPhotos(rapidResult.tweets);
                            console.log(`✅ Banco de dados: ${saveResult.saved.length} fotos salvas, ${saveResult.skipped.length} ignoradas, ${saveResult.failed.length} falharam`);
                        } catch (dbError) {
                            console.error('❌ Erro ao salvar fotos no banco:', dbError);
                        }
                    }
                    
                    console.log('✅ RapidAPI funcionou e dados salvos permanentemente!');
                    return rapidResult;
                }
                
                throw new Error('RapidAPI não retornou dados válidos');

            } catch (rapidError: any) {
                console.log('❌ RapidAPI falhou:', rapidError.message);

                try {
                    // 5. Usar métodos alternativos como último fallback
                    console.log('🔄 Tentando métodos alternativos...');
                    const alternativeResult = await fetchTwitterMediaAlternative(username, mediaType);
                    
                    console.log(`🔧 Métodos alternativos retornaram ${alternativeResult.tweets.length} tweets`);
                    
                    // Converter formato para compatibilidade
                    const convertedResult: TwitterMediaOutput = {
                        tweets: alternativeResult.tweets.map((tweet: any) => ({
                            id: tweet.id,
                            text: tweet.text,
                            media: tweet.media || [],
                            created_at: tweet.created_at || new Date().toISOString(),
                            username: tweet.username,
                            profile_image_url: tweet.profile_image_url,
                            isRetweet: tweet.isRetweet || false,
                            widget_html: tweet.widget_html
                        })),
                        totalCount: alternativeResult.totalCount,
                        source: alternativeResult.source
                    };

                    console.log(`🔧 Resultado convertido tem ${convertedResult.tweets.length} tweets`);
                    
                    if (convertedResult.tweets.length > 0) {
                        // Salvar no cache híbrido (Firebase em produção, arquivo em dev)
                        cache.set(cacheKey, { data: convertedResult, timestamp: Date.now() });
                        await HybridCacheService.saveCache(username, mediaType, maxResults, convertedResult);
                        console.log('✅ Métodos alternativos funcionaram e dados salvos permanentemente!');
                        return convertedResult;
                    }

                    throw new Error('Métodos alternativos não retornaram dados');

                } catch (alternativeError: any) {
                    console.log('❌ Métodos alternativos falharam:', alternativeError.message);
                    
                    // Último recurso: retornar dados vazios com erro
                    throw new Error(`Todas as APIs falharam. API Oficial: ${officialError.message}. RapidAPI: ${rapidError.message}. Alternativas: ${alternativeError.message}`);
                }
            }
        }
    }
);

// Função para tentar a API oficial do X usando Bearer Token
async function fetchFromOfficialAPI(username: string, maxResults: number, mediaType: 'photos' | 'videos' | 'all'): Promise<TwitterMediaOutput> {
    const bearerToken = process.env.TWITTER_BEARER_TOKEN;
    
    if (!bearerToken) {
        throw new Error("TWITTER_BEARER_TOKEN não configurado");
    }

    try {
        // Buscar usuário usando Bearer Token
        console.log(`🔧 Buscando dados do usuário @${username} via Bearer Token...`);
        const userUrl = `https://api.twitter.com/2/users/by/username/${username}`;
        
        const userResponse = await fetch(userUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${bearerToken}`,
                'Content-Type': 'application/json',
            },
        });

        const contentType = userResponse.headers.get('content-type');
        if (!userResponse.ok || !contentType || !contentType.includes('application/json')) {
            const errorText = await userResponse.text();
            throw new Error(`Erro ao buscar usuário: ${userResponse.status}. Resposta: ${errorText.substring(0, 100)}...`);
        }

        const userData = await userResponse.json();
        console.log(`🔧 Resposta do usuário:`, userData);
        
        if (!userData.data?.id) {
            throw new Error('Usuário não encontrado');
        }

        const userId = userData.data.id;
        console.log(`🔧 UserId encontrado: ${userId}`);

        // Buscar tweets com mídia usando Bearer Token
        const tweetsUrl = `https://api.twitter.com/2/users/${userId}/tweets`;
        const params = new URLSearchParams({
            'max_results': Math.max(5, Math.min(maxResults, 100)).toString(),
            'tweet.fields': 'created_at,attachments,referenced_tweets,author_id,possibly_sensitive',
            'media.fields': 'media_key,type,url,preview_image_url,variants',
            'expansions': 'attachments.media_keys,referenced_tweets.id',
            'exclude': 'retweets', // Excluir retweets da API
        });

        const fullUrl = `${tweetsUrl}?${params}`;
        console.log(`🔧 Buscando tweets: ${fullUrl}`);
        
        const tweetsResponse = await fetch(fullUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${bearerToken}`,
                'Content-Type': 'application/json',
            },
        });
        
        const tweetsContentType = tweetsResponse.headers.get('content-type');
        if (!tweetsResponse.ok || !tweetsContentType || !tweetsContentType.includes('application/json')) {
            const errorText = await tweetsResponse.text();
            throw new Error(`Erro ao buscar tweets: ${tweetsResponse.status}. Resposta: ${errorText.substring(0, 100)}...`);
        }

        const tweetsData = await tweetsResponse.json();
        console.log(`🔧 API oficial retornou ${tweetsData.data?.length || 0} tweets brutos`);
        console.log(`🔧 Dados completos:`, JSON.stringify(tweetsData, null, 2));
        
        return processOfficialTwitterData(tweetsData, mediaType, username);
        
    } catch (error: any) {
        console.log(`🔧 Erro na API oficial Bearer Token: ${error.message}`);
        throw error;
    }
}

// Função para buscar fotos via RapidAPI (User Tweets & Replies)
async function fetchFromRapidAPI(username: string, maxResults: number, mediaType: 'photos' | 'videos' | 'all'): Promise<TwitterMediaOutput> {
    const rapidApiKey = process.env.RAPIDAPI_KEY;
    if (!rapidApiKey) {
        throw new Error("RAPIDAPI_KEY não configurado");
    }

    try {
        // Buscar o userId pelo username
        const userId = await getUserIdFromUsername(username);
        
        const headers = {
            'x-rapidapi-key': rapidApiKey,
            'x-rapidapi-host': 'twitter135.p.rapidapi.com'
        };

        const url = `https://twitter135.p.rapidapi.com/v2/UserTweetsAndReplies?id=${userId}&count=${maxResults}&include_adult_content=true`;
        const response = await fetch(url, { headers });

        if (!response.ok) {
            throw new Error(`RapidAPI erro: ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const errorText = await response.text();
            throw new Error(`RapidAPI retornou conteúdo não-JSON: ${errorText.substring(0, 100)}...`);
        }

        const data = await response.json();
        return processRapidApiV2Data(data, mediaType, username);
        
    } catch (error: any) {
        console.log('❌ Erro no novo endpoint RapidAPI, tentando endpoint antigo...');
        
        // Fallback para o endpoint antigo
        const headers = {
            'X-RapidAPI-Key': rapidApiKey,
            'X-RapidAPI-Host': 'twitter-api45.p.rapidapi.com'
        };

        const response = await fetch(
            `https://twitter-api45.p.rapidapi.com/timeline.php?screenname=${username}&count=${maxResults}&include_adult_content=true`,
            { headers }
        );

        if (!response.ok) {
            throw new Error(`RapidAPI erro: ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const errorText = await response.text();
            throw new Error(`RapidAPI antigo retornou conteúdo não-JSON: ${errorText.substring(0, 100)}...`);
        }

        const data = await response.json();
        return processRapidAPIData(data, mediaType, username);
    }
}

// Função para buscar o userId pelo username
async function getUserIdFromUsername(username: string): Promise<string> {
    const rapidApiKey = process.env.RAPIDAPI_KEY;
    if (!rapidApiKey) {
        throw new Error("RAPIDAPI_KEY não configurado");
    }

    const headers = {
        'x-rapidapi-key': rapidApiKey,
        'x-rapidapi-host': 'twitter135.p.rapidapi.com'
    };
    
    const url = `https://twitter135.p.rapidapi.com/v2/UserByScreenName?screen_name=${username}`;
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
        throw new Error('Não foi possível buscar o userId');
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
        const errorText = await response.text();
        throw new Error(`API de usuário retornou conteúdo não-JSON: ${errorText.substring(0, 100)}...`);
    }
    
    const data = await response.json();
    const userId = data?.data?.user?.rest_id;
    
    if (!userId) {
        throw new Error('UserId não encontrado na resposta');
    }
    
    return userId;
}

// Processar dados do endpoint /v2/UserTweetsAndReplies
function processRapidApiV2Data(data: any, mediaType: 'photos' | 'videos' | 'all', username: string): TwitterMediaOutput {
    const entries = data?.data?.user?.result?.timeline_v2?.timeline?.instructions
        ?.find((i: any) => i.type === "TimelineAddEntries")?.entries || [];

    const tweets = [];

    for (const entry of entries) {
        const tweet = entry?.content?.itemContent?.tweet_results?.result;
        if (!tweet) continue;

        // Fotos postadas
        const media = tweet?.legacy?.entities?.media || tweet?.legacy?.extended_entities?.media || [];
        const filteredMedia = media.filter((m: any) => {
            if (mediaType === 'photos') return m.type === 'photo';
            if (mediaType === 'videos') return m.type === 'video' || m.type === 'animated_gif';
            return true;
        });

        // Verificar se é um retweet e pular se for
        const isRetweet = tweet?.legacy?.retweeted_status_result?.result || tweet?.legacy?.retweeted || false;
        
        // FILTRO: Apenas posts originais (não retweets)
        if (!isRetweet && (filteredMedia.length > 0 || mediaType === 'all')) {
            tweets.push({
                id: tweet.rest_id,
                text: tweet.legacy?.full_text || '',
                media: filteredMedia.map((m: any) => ({
                    media_key: m.media_key || m.id_str || '',
                    type: m.type,
                    url: m.media_url_https || '',
                    preview_image_url: m.media_url_https || '',
                    variants: m.video_info?.variants || m.variants || [] // Para vídeos
                })),
                created_at: tweet.legacy?.created_at || new Date().toISOString(),
                username,
                profile_image_url: tweet.core?.user_results?.result?.legacy?.profile_image_url_https || '',
                isRetweet: false
            });
        }

        // REMOVIDO: Processamento de retweets - agora retorna apenas posts originais
    }

    return {
        tweets,
        totalCount: tweets.length,
        source: 'RapidAPI v2/UserTweetsAndReplies'
    };
}

// Processar dados da API oficial
function processOfficialTwitterData(data: any, mediaType: 'photos' | 'videos' | 'all', username: string): TwitterMediaOutput {
    const tweets = data.data || [];
    const media = data.includes?.media || [];
    
    const processedTweets = tweets
        .filter((tweet: any) => {
            // FILTRO: Apenas posts originais (não retweets)
            const hasReferencedTweets = tweet.referenced_tweets?.some((ref: any) => ref.type === 'retweeted');
            return tweet.attachments?.media_keys?.length > 0 && !hasReferencedTweets;
        })
        .map((tweet: any) => {
            const tweetMedia = tweet.attachments.media_keys
                .map((key: string) => media.find((m: any) => m.media_key === key))
                .filter(Boolean)
                .filter((m: any) => {
                    if (mediaType === 'photos') return m.type === 'photo';
                    if (mediaType === 'videos') return m.type === 'video' || m.type === 'animated_gif';
                    return true;
                });

            if (tweetMedia.length === 0 && mediaType !== 'all') return null;

            return {
                id: tweet.id,
                text: tweet.text || '',
                media: tweetMedia.map((m: any) => ({
                    media_key: m.media_key,
                    type: m.type,
                    url: m.url || m.preview_image_url || '',
                    preview_image_url: m.preview_image_url,
                    variants: m.variants || [] // Para vídeos: diferentes qualidades/formatos
                })),
                created_at: tweet.created_at || new Date().toISOString(),
                username,
                isRetweet: false
            };
        })
        .filter(Boolean);

    return {
        tweets: processedTweets,
        totalCount: processedTweets.length,
        source: 'Official Twitter API'
    };
}

// Processar dados do RapidAPI
function processRapidAPIData(data: any, mediaType: 'photos' | 'videos' | 'all', username: string): TwitterMediaOutput {
    const tweets = data.timeline || data.data || [];
    
    const processedTweets = tweets
        .filter((tweet: any) => {
            // FILTRO: Apenas posts originais (não retweets)
            const isRetweet = tweet.full_text?.startsWith('RT @') || tweet.text?.startsWith('RT @') || tweet.retweeted || false;
            return !isRetweet;
        })
        .map((tweet: any) => {
            // Extrair mídia
            let media = [];
            if (tweet.media && Array.isArray(tweet.media)) {
                media = tweet.media;
            } else if (tweet.entities?.media) {
                media = tweet.entities.media;
            }

            // Filtrar por tipo
            const filteredMedia = media.filter((m: any) => {
                if (mediaType === 'photos') return m.type === 'photo';
                if (mediaType === 'videos') return m.type === 'video' || m.type === 'animated_gif';
                return true;
            });

            if (filteredMedia.length === 0 && mediaType !== 'all') return null;

            return {
                id: tweet.id_str || tweet.id || `rapid_${Date.now()}`,
                text: tweet.full_text || tweet.text || '',
                media: filteredMedia.map((m: any) => ({
                    media_key: m.id || `media_${Date.now()}`,
                    type: m.type || 'photo',
                    url: m.media_url_https || m.url || '',
                    preview_image_url: m.media_url_https || m.url,
                    variants: m.video_info?.variants || m.variants || [] // Para vídeos
                })),
                created_at: tweet.created_at || new Date().toISOString(),
                username,
                isRetweet: false
            };
        })
        .filter(Boolean);

    return {
        tweets: processedTweets,
        totalCount: processedTweets.length,
        source: 'RapidAPI'
    };
}

// Função para tentar detectar URLs de imagens no texto dos tweets
async function enhanceWithImageUrls(result: TwitterMediaOutput, username: string): Promise<TwitterMediaOutput> {
    const enhancedTweets = await Promise.all(result.tweets.map(async (tweet) => {
        // Procurar por URLs de imagens comuns no texto
        const imageUrlPatterns = [
            /https?:\/\/\S*\.(?:jpg|jpeg|png|gif|webp)(?:\?\S*)?/gi,
            /https?:\/\/pic\.twitter\.com\/\w+/gi,
            /https?:\/\/pbs\.twimg\.com\/media\/\S+/gi,
            /https?:\/\/instagram\.com\/p\/\w+/gi,
            /https?:\/\/onlyfans\.com\/\w+/gi
        ];

        const urls: string[] = [];
        imageUrlPatterns.forEach(pattern => {
            const matches = tweet.text.match(pattern);
            if (matches) {
                urls.push(...matches);
            }
        });

        // Se encontrou URLs de imagens, adicionar como mídia
        if (urls.length > 0) {
            const detectedMedia = urls.map((url, index) => ({
                media_key: `detected_${tweet.id}_${index}`,
                type: 'photo' as const,
                url: url,
                preview_image_url: url
            }));

            return {
                ...tweet,
                media: [...(tweet.media || []), ...detectedMedia]
            };
        }

        return tweet;
    }));

    return {
        ...result,
        tweets: enhancedTweets,
        source: result.source + ' + URL Detection'
    };
}

export default twitterFlow;
