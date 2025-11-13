import { genkit } from 'genkit';
import { googleAI, gemini15Flash } from '@genkit-ai/googleai';

const ai = genkit({
    plugins: [googleAI({ apiKey: process.env.GEMINI_API_KEY })],
    model: gemini15Flash,
});

interface Tweet {
    id: string;
    text: string;
    created_at: string;
    username: string;
    profile_image_url: string;
    media: any[];
}

interface FilterResult {
    photos: Tweet[];
    videos: Tweet[];
    reasoning: string;
}

export async function filterPersonalMedia(tweets: Tweet[], targetUsername: string): Promise<FilterResult> {
    // Pré-filtro: aplicar filtro rígido ANTES do Gemini para economizar tokens
    const preFilteredTweets = tweets.filter(t => {
        // Verificar se é do usuário correto (case-insensitive)
        const isCorrectUser = t.username.toLowerCase() === targetUsername.toLowerCase();
        
        // Verificar se tem mídia válida
        const hasValidMedia = t.media && t.media.length > 0;
        
        // Excluir replies (tweets que começam com @)
        const isNotReply = !t.text.trim().startsWith('@');
        
        return isCorrectUser && hasValidMedia && isNotReply;
    });

    console.log(`[PRE-FILTER] Tweets originais: ${tweets.length} → Pré-filtrados: ${preFilteredTweets.length}`);

    // Se não houver GEMINI_API_KEY, usar apenas filtro local
    if (!process.env.GEMINI_API_KEY) {
        console.log('[FILTER] Gemini não configurado, usando filtro local apenas');
        return applyLocalFilter(preFilteredTweets, targetUsername);
    }

    const prompt = `Você é um especialista em análise de mídia do Twitter/X. Analise os tweets e identifique APENAS conteúdo ORIGINAL e PESSOAL.

Retorne JSON válido neste formato EXATO:
{
  "photos": ["id1", "id2", ...],
  "videos": ["id1", "id2", ...],
  "reasoning": "explicação"
}

REGRAS RÍGIDAS:
1. Usuário alvo: @${targetUsername}
2. APENAS conteúdo ORIGINAL (não compartilhado, não citado)
3. Classificação por tipo de mídia:
   - photos: type="photo"
   - videos: type="video" ou type="animated_gif"
4. PRIORIZAR:
   - Selfies, fotos do rosto do usuário
   - Vídeos onde o usuário aparece ou fala
   - Conteúdo claramente produzido pelo usuário
5. EXCLUIR:
   - Memes genéricos
   - Capturas de tela de terceiros
   - Fotos/vídeos de eventos (exceto se o usuário está claramente presente)

Tweets (máx. 50):
${JSON.stringify(preFilteredTweets.slice(0, 50).map(t => ({
    id: t.id,
    text: t.text.substring(0, 200), // Limitar texto para economizar tokens
    username: t.username,
    media: t.media.map((m: any) => ({ type: m.type, media_key: m.media_key }))
})), null, 2)}

Retorne APENAS JSON válido, sem markdown.`;

    try {
        const response = await ai.generate({
            prompt,
            config: {
                temperature: 0.1, // Baixa temperatura para respostas consistentes
                maxOutputTokens: 2000,
            },
        });

        let jsonText = response.text.trim();
        
        // Limpar markdown e whitespace
        jsonText = jsonText
            .replace(/```json\s*/g, '')
            .replace(/```\s*/g, '')
            .trim();

        const parsedResult = JSON.parse(jsonText);

        // Validar estrutura da resposta
        if (!Array.isArray(parsedResult.photos) || !Array.isArray(parsedResult.videos)) {
            throw new Error('Resposta do Gemini em formato inválido');
        }

        // Filtrar tweets baseado nos IDs
        const photoTweets = preFilteredTweets.filter(t => parsedResult.photos.includes(t.id));
        const videoTweets = preFilteredTweets.filter(t => parsedResult.videos.includes(t.id));

        console.log('[GEMINI-FILTER] ✅ Sucesso:', {
            photos: photoTweets.length,
            videos: videoTweets.length,
            reasoning: parsedResult.reasoning
        });

        return {
            photos: photoTweets.slice(0, 25),
            videos: videoTweets.slice(0, 25),
            reasoning: parsedResult.reasoning || 'Filtrado por Gemini AI'
        };
    } catch (error) {
        console.error('[GEMINI-FILTER] ❌ Erro ao usar Gemini:', error);
        console.log('[GEMINI-FILTER] 🔄 Aplicando fallback local');
        
        return applyLocalFilter(preFilteredTweets, targetUsername);
    }
}

/**
 * Filtro local robusto (usado como fallback ou quando Gemini não está disponível)
 */
function applyLocalFilter(tweets: Tweet[], targetUsername: string): FilterResult {
    // Separar por tipo de mídia
    const photos = tweets.filter(t =>
        t.username.toLowerCase() === targetUsername.toLowerCase() &&
        t.media.some((m: any) => m.type === 'photo')
    ).slice(0, 25);

    const videos = tweets.filter(t =>
        t.username.toLowerCase() === targetUsername.toLowerCase() &&
        t.media.some((m: any) => m.type === 'video' || m.type === 'animated_gif')
    ).slice(0, 25);

    console.log('[LOCAL-FILTER] ✅ Aplicado:', {
        photos: photos.length,
        videos: videos.length
    });

    return {
        photos,
        videos,
        reasoning: 'Filtro local: conteúdo do usuário por tipo de mídia'
    };
}
