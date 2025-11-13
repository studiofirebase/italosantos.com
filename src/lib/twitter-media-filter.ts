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
    const prompt = `Você é um assistente especializado em filtrar conteúdo de mídia do Twitter/X.

Analise os seguintes tweets e RETORNE APENAS um objeto JSON válido com esta estrutura exata:
{
  "photos": [array de IDs de tweets que contêm FOTOS pessoais do usuário],
  "videos": [array de IDs de tweets que contêm VÍDEOS pessoais do usuário],
  "reasoning": "breve explicação"
}

CRITÉRIOS IMPORTANTES:
1. Usuário alvo: @${targetUsername}
2. APENAS tweets do próprio @${targetUsername} (verificar campo username)
3. SEPARAR corretamente:
   - "photos": tweets com type="photo"
   - "videos": tweets com type="video" ou type="animated_gif"
4. IGNORAR completamente:
   - Retweets (tweets de outros usuários)
   - Replies (respostas)
   - Tweets sem mídia
   - Tweets que mencionam o usuário mas não são dele

TWEETS PARA ANALISAR:
${JSON.stringify(tweets.slice(0, 100), null, 2)}

IMPORTANTE: Retorne APENAS o JSON, sem markdown, sem explicações extras.`;

    try {
        const response = await ai.generate({
            prompt,
            config: {
                temperature: 0.1,
                maxOutputTokens: 2000,
            },
        });

        // Limpar resposta e extrair JSON
        let jsonText = response.text.trim();

        // Remover markdown se houver
        jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '');

        // Parse do JSON
        const parsedResult = JSON.parse(jsonText);

        // Filtrar tweets baseado nos IDs retornados pelo Gemini
        const photoTweets = tweets.filter(t => parsedResult.photos.includes(t.id));
        const videoTweets = tweets.filter(t => parsedResult.videos.includes(t.id));

        console.log('[GEMINI-FILTER] ✅ Filtrado:', {
            photos: photoTweets.length,
            videos: videoTweets.length,
            reasoning: parsedResult.reasoning
        });

        return {
            photos: photoTweets.slice(0, 25),
            videos: videoTweets.slice(0, 25),
            reasoning: parsedResult.reasoning
        };
    } catch (error) {
        console.error('[GEMINI-FILTER] ❌ Erro:', error);

        // Fallback: filtro simples se Gemini falhar
        const photos = tweets.filter(t =>
            t.username === targetUsername &&
            t.media.some((m: any) => m.type === 'photo')
        ).slice(0, 25);

        const videos = tweets.filter(t =>
            t.username === targetUsername &&
            t.media.some((m: any) => m.type === 'video' || m.type === 'animated_gif')
        ).slice(0, 25);

        return {
            photos,
            videos,
            reasoning: 'Fallback: filtro simples aplicado'
        };
    }
}
